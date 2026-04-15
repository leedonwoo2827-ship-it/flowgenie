/**
 * FlowGenie Side Panel — main UI controller
 */
import { store } from './lib/state.js';
import { bus } from './lib/message-bus.js';
import { MSG, STATUS } from '../shared/constants.js';
import { parsePrompts } from '../shared/prompt-parser.js';

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const connectionBadge = $('#connection-badge');
const btnSettings = $('#btn-settings');
const configPanel = $('#config-panel');
const btnLoadJson = $('#btn-load-json');
const btnLoadTxt = $('#btn-load-txt');
const btnPaste = $('#btn-paste');
const btnClear = $('#btn-clear');
const dropZone = $('#drop-zone');
const chapterInfo = $('#chapter-info');
const chapterTitle = $('#chapter-title');
const chapterCount = $('#chapter-count');
const queueCount = $('#queue-count');
const queueList = $('#queue-list');
const btnStart = $('#btn-start');
const btnStop = $('#btn-stop');
const progressSection = $('#progress-section');
const progressBar = $('#progress-bar');
const statProgress = $('#stat-progress');
const statElapsed = $('#stat-elapsed');
const statEta = $('#stat-eta');
const statSuccess = $('#stat-success');
const statFail = $('#stat-fail');
const statSkip = $('#stat-skip');
const exportSection = $('#export-section');
const btnExportCsv = $('#btn-export-csv');

// Config controls
const selModel = $('#sel-model');
const selRatio = $('#sel-ratio');
const selMode = $('#sel-mode');
const inpDelayMin = $('#inp-delay-min');
const inpDelayMax = $('#inp-delay-max');
const inpImages = $('#inp-images');

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
let elapsedTimer = null;
let batchStartTime = null;

(async function init() {
  await store.load();
  syncConfigUI();
  checkConnection();
  setInterval(checkConnection, 5000);
  bindEvents();
  bindMessages();
  renderQueue();
})();

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------
async function checkConnection() {
  const { connected, flowTabId } = await bus.checkConnection();
  store.set('connected', connected);
  connectionBadge.textContent = connected ? 'Connected' : 'Disconnected';
  connectionBadge.className = `badge ${connected ? 'connected' : 'disconnected'}`;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
function syncConfigUI() {
  const cfg = store.get('config');
  selModel.value = cfg.model;
  selRatio.value = cfg.aspectRatio;
  selMode.value = cfg.mode;
  inpDelayMin.value = cfg.minDelay / 1000;
  inpDelayMax.value = cfg.maxDelay / 1000;
  inpImages.value = cfg.imagesPerPrompt;
}

function saveConfig() {
  store.set('config', {
    ...store.get('config'),
    model: selModel.value,
    aspectRatio: selRatio.value,
    mode: selMode.value,
    minDelay: Number(inpDelayMin.value) * 1000,
    maxDelay: Number(inpDelayMax.value) * 1000,
    imagesPerPrompt: Number(inpImages.value),
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function bindEvents() {
  // Settings toggle
  btnSettings.addEventListener('click', () => {
    configPanel.classList.toggle('collapsed');
  });

  // Config changes
  [selModel, selRatio, selMode, inpDelayMin, inpDelayMax, inpImages].forEach((el) => {
    el.addEventListener('change', saveConfig);
  });

  // Prompt loading
  btnLoadJson.addEventListener('click', () => loadFile('.json'));
  btnLoadTxt.addEventListener('click', () => loadFile('.txt'));
  btnPaste.addEventListener('click', handlePaste);
  btnClear.addEventListener('click', clearQueue);

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', handleDrop);
  dropZone.addEventListener('click', () => loadFile('.json,.txt'));

  // Batch control
  btnStart.addEventListener('click', startBatch);
  btnStop.addEventListener('click', stopBatch);

  // Export
  btnExportCsv.addEventListener('click', exportCsv);
}

// ---------------------------------------------------------------------------
// File loading
// ---------------------------------------------------------------------------
async function loadFile(accept) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const text = await file.text();
    parseAndLoad(text, file.name);
  };
  input.click();
}

function handleDrop(e) {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  file.text().then((text) => parseAndLoad(text, file.name));
}

async function handlePaste() {
  const text = await navigator.clipboard.readText();
  if (text) parseAndLoad(text, 'clipboard');
}

// ---------------------------------------------------------------------------
// Prompt parser (delegates to shared/prompt-parser.js)
// ---------------------------------------------------------------------------
function parseAndLoad(text, sourceName) {
  const { items, meta } = parsePrompts(text, store.get('config.model'));

  if (items.length === 0) return;

  // Show chapter info if ScriptForge JSON
  if (meta.title || meta.chapter) {
    chapterInfo.classList.remove('hidden');
    chapterTitle.textContent = meta.title || `Chapter ${meta.chapter}`;
    chapterCount.textContent = `${items.length} scenes`;
  } else {
    chapterInfo.classList.add('hidden');
  }

  store.set('queue', items);
  store.set('stats', { total: items.length, completed: 0, failed: 0, startedAt: null });
  renderQueue();
  btnStart.disabled = false;
}

// ---------------------------------------------------------------------------
// Queue rendering
// ---------------------------------------------------------------------------
function renderQueue() {
  const queue = store.get('queue') || [];
  queueCount.textContent = `(${queue.length})`;
  queueList.innerHTML = '';

  for (const item of queue) {
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.dataset.id = item.id;
    li.innerHTML = `
      <span class="index">#${item.index + 1}</span>
      <span class="prompt-text" title="${escapeHtml(item.prompt)}">${escapeHtml(truncate(item.prompt, 60))}</span>
      <span class="status-dot ${item.status}"></span>
    `;
    queueList.appendChild(li);
  }

  // Auto-scroll to current generating item
  const generating = queueList.querySelector('.status-dot.generating');
  if (generating) {
    generating.closest('.queue-item').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function updateQueueItem(id, updates) {
  const queue = store.get('queue') || [];
  const item = queue.find((q) => q.id === id);
  if (!item) return;
  Object.assign(item, updates);
  store.set('queue', queue);

  // Update just the DOM element
  const li = queueList.querySelector(`[data-id="${id}"]`);
  if (li) {
    const dot = li.querySelector('.status-dot');
    dot.className = `status-dot ${item.status}`;
    if (item.status === STATUS.GENERATING) {
      li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

// ---------------------------------------------------------------------------
// Batch control
// ---------------------------------------------------------------------------
function startBatch() {
  const queue = store.get('queue');
  const config = store.get('config');
  if (!queue?.length) return;

  const pendingItems = queue.filter((q) => q.status === STATUS.PENDING || q.status === STATUS.FAILED);
  if (!pendingItems.length) return;

  store.set('running', true);
  batchStartTime = Date.now();
  store.set('stats.startedAt', batchStartTime);

  btnStart.classList.add('hidden');
  btnStop.classList.remove('hidden');
  progressSection.classList.remove('hidden');

  startElapsedTimer();

  bus.send(MSG.START_BATCH, { items: pendingItems, config });
}

function stopBatch() {
  bus.send(MSG.STOP_BATCH);
  store.set('running', false);
  btnStop.classList.add('hidden');
  btnStart.classList.remove('hidden');
  btnStart.disabled = false;
  stopElapsedTimer();
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------
function bindMessages() {
  bus.on(MSG.ITEM_UPDATE, (payload) => {
    updateQueueItem(payload.id, {
      status: payload.status,
      error: payload.error || null,
    });
    updateProgress();
  });

  bus.on(MSG.BATCH_COMPLETE, (payload) => {
    store.set('running', false);
    btnStop.classList.add('hidden');
    btnStart.classList.remove('hidden');
    btnStart.disabled = false;
    stopElapsedTimer();

    exportSection.classList.remove('hidden');

    if (payload?.error) {
      alert(payload.error);
    }
  });
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------
function updateProgress() {
  const queue = store.get('queue') || [];
  const total = queue.length;
  const completed = queue.filter((q) => q.status === STATUS.COMPLETE).length;
  const failed = queue.filter((q) => q.status === STATUS.FAILED).length;
  const skipped = queue.filter((q) => q.status === STATUS.SKIPPED).length;
  const done = completed + failed + skipped;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  progressBar.style.width = `${pct}%`;
  statProgress.textContent = `${done} / ${total}`;
  statSuccess.textContent = `${completed}`;
  statFail.textContent = `${failed}`;
  statSkip.textContent = `${skipped}`;

  // ETA
  if (batchStartTime && completed > 0) {
    const elapsed = Date.now() - batchStartTime;
    const avgPerItem = elapsed / done;
    const remaining = (total - done) * avgPerItem;
    statEta.textContent = `ETA ${formatDuration(remaining)}`;
  }
}

function startElapsedTimer() {
  stopElapsedTimer();
  elapsedTimer = setInterval(() => {
    if (batchStartTime) {
      statElapsed.textContent = formatDuration(Date.now() - batchStartTime);
    }
  }, 1000);
}

function stopElapsedTimer() {
  if (elapsedTimer) clearInterval(elapsedTimer);
  elapsedTimer = null;
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------
function exportCsv() {
  const queue = store.get('queue') || [];
  const rows = [['index', 'scene', 'title', 'prompt', 'status', 'filename', 'error']];

  for (const item of queue) {
    rows.push([
      item.index + 1,
      item._meta?.scene || '',
      item._meta?.title || '',
      `"${item.prompt.replace(/"/g, '""')}"`,
      item.status,
      item.filename,
      item.error || '',
    ]);
  }

  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowgenie_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clearQueue() {
  store.set('queue', []);
  store.set('stats', { total: 0, completed: 0, failed: 0, startedAt: null });
  chapterInfo.classList.add('hidden');
  progressSection.classList.add('hidden');
  exportSection.classList.add('hidden');
  btnStart.disabled = true;
  renderQueue();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
