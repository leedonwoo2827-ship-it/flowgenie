/**
 * FlowGenie Service Worker
 * Central message router, download manager
 * Uses Chrome Debugger Protocol (CDP) for reliable Slate editor interaction
 */
import { MSG, STATUS, TIMING, STORAGE_KEYS } from '../shared/constants.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let flowTabId = null;
let batchRunning = false;
let stopRequested = false;

// ---------------------------------------------------------------------------
// Side Panel: open on action click
// ---------------------------------------------------------------------------
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// ---------------------------------------------------------------------------
// Message Router
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case MSG.PING:
      sendResponse({ type: MSG.PONG, flowTabId });
      break;

    case MSG.GET_FLOW_TAB:
      findFlowTab().then((tabId) => {
        flowTabId = tabId;
        sendResponse({ type: MSG.FLOW_TAB_FOUND, tabId });
      });
      return true;

    case MSG.START_BATCH:
      handleStartBatch(msg.payload);
      break;

    case MSG.STOP_BATCH:
      stopRequested = true;
      break;

    case MSG.DOWNLOAD_IMAGE:
      handleDownload(msg.payload).then(sendResponse);
      return true;

    case MSG.CAPTURE_TOKEN:
      chrome.storage.session.set({ fgToken: msg.payload.token });
      break;

    case MSG.PROMPT_RESULT:
      broadcastToSidePanel(msg);
      break;

    default:
      break;
  }
});

// ---------------------------------------------------------------------------
// Find Google Flow tab
// ---------------------------------------------------------------------------
async function findFlowTab() {
  const tabs = await chrome.tabs.query({ url: 'https://labs.google/fx/*' });
  return tabs.length > 0 ? tabs[0].id : null;
}

// ---------------------------------------------------------------------------
// CDP helpers
// ---------------------------------------------------------------------------
async function cdpSend(tabId, method, params = {}) {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

async function cdpClick(tabId, x, y) {
  await cdpSend(tabId, 'Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', clickCount: 1,
  });
  await sleep(30);
  await cdpSend(tabId, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left',
  });
}

async function cdpSelectAll(tabId) {
  // Ctrl+A
  await cdpSend(tabId, 'Input.dispatchKeyEvent', {
    type: 'keyDown', modifiers: 2, key: 'a', code: 'KeyA',
    windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65,
  });
  await cdpSend(tabId, 'Input.dispatchKeyEvent', {
    type: 'keyUp', modifiers: 2, key: 'a', code: 'KeyA',
    windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65,
  });
}

async function cdpDelete(tabId) {
  await cdpSend(tabId, 'Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'Backspace', code: 'Backspace',
    windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8,
  });
  await cdpSend(tabId, 'Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'Backspace', code: 'Backspace',
    windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8,
  });
}

async function cdpInsertText(tabId, text) {
  await cdpSend(tabId, 'Input.insertText', { text });
}

// ---------------------------------------------------------------------------
// Batch execution
// ---------------------------------------------------------------------------
async function handleStartBatch(payload) {
  const { items, config } = payload;
  if (batchRunning) return;
  batchRunning = true;
  stopRequested = false;

  const tabId = await findFlowTab();
  if (!tabId) {
    broadcastToSidePanel({
      type: MSG.BATCH_COMPLETE,
      payload: { error: 'Google Flow tab not found. Open labs.google/fx/tools/flow first.' },
    });
    batchRunning = false;
    return;
  }
  flowTabId = tabId;

  // Attach debugger
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
  } catch (err) {
    broadcastToSidePanel({
      type: MSG.BATCH_COMPLETE,
      payload: { error: `Debugger attach failed: ${err.message}` },
    });
    batchRunning = false;
    return;
  }

  try {
    for (let i = 0; i < items.length; i++) {
      if (stopRequested) break;

      const item = items[i];
      broadcastToSidePanel({
        type: MSG.ITEM_UPDATE,
        payload: { id: item.id, status: STATUS.GENERATING, index: i },
      });

      try {
        await runDomModeCDP(tabId, item, config);
        broadcastToSidePanel({
          type: MSG.ITEM_UPDATE,
          payload: { id: item.id, status: STATUS.COMPLETE, index: i },
        });
      } catch (err) {
        broadcastToSidePanel({
          type: MSG.ITEM_UPDATE,
          payload: { id: item.id, status: STATUS.FAILED, error: err.message, index: i },
        });
      }

      // Inter-prompt delay
      if (i < items.length - 1 && !stopRequested) {
        const delay = randomDelay(config.minDelay || TIMING.MIN_DELAY_MS, config.maxDelay || TIMING.MAX_DELAY_MS);
        await sleep(delay);
      }
    }
  } finally {
    // Always detach debugger
    await chrome.debugger.detach({ tabId }).catch(() => {});
  }

  batchRunning = false;
  broadcastToSidePanel({ type: MSG.BATCH_COMPLETE, payload: { stopped: stopRequested } });
}

// ---------------------------------------------------------------------------
// DOM mode with CDP — text input + button click via Chrome DevTools Protocol
// ---------------------------------------------------------------------------
async function runDomModeCDP(tabId, item, config) {
  // Step 1: Find editor position via executeScript
  const [editorInfo] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const editor = document.querySelector('[data-slate-editor="true"]')
        || document.querySelector('[role="textbox"][contenteditable="true"]');
      if (!editor) return { error: 'Editor not found' };
      const rect = editor.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    },
    world: 'MAIN',
  });

  const editorPos = editorInfo?.result;
  if (!editorPos || editorPos.error) throw new Error(editorPos?.error || 'Editor not found');

  // Step 2: Click on editor to focus
  await cdpClick(tabId, editorPos.x, editorPos.y);
  await sleep(300);

  // Step 3: Select all + delete existing text
  await cdpSelectAll(tabId);
  await sleep(100);
  await cdpDelete(tabId);
  await sleep(300);

  // Step 4: Insert prompt text via CDP (trusted input!)
  await cdpInsertText(tabId, item.prompt);
  await sleep(600);

  // Step 5: Snapshot current images before clicking generate
  const [snapResult] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const srcs = new Set();
      document.querySelectorAll('img').forEach(img => { if (img.src) srcs.add(img.src); });
      return [...srcs];
    },
    world: 'MAIN',
  });
  const knownSrcs = new Set(snapResult?.result || []);

  // Step 6: Find generate button position
  const [btnInfo] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const allBtns = [...document.querySelectorAll('button')];
      // Look for SVG button in the bottom prompt bar
      for (const btn of allBtns.reverse()) {
        const r = btn.getBoundingClientRect();
        if (r.top > window.innerHeight * 0.7 && r.width < 100 && r.height < 100) {
          if (btn.querySelector('svg, path') || btn.textContent.includes('arrow')) {
            return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
          }
        }
      }
      return { error: 'Generate button not found' };
    },
    world: 'MAIN',
  });

  const btnPos = btnInfo?.result;
  if (!btnPos || btnPos.error) throw new Error(btnPos?.error || 'Generate button not found');

  // Step 7: Click generate button via CDP
  await cdpClick(tabId, btnPos.x, btnPos.y);
  await sleep(2000);

  // Step 8: Wait for new images (up to 120s)
  const expectedCount = config.imagesPerPrompt || 4;
  const [imgResult] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (knownSrcsList, expectedCount, timeoutMs) => {
      return new Promise((resolve) => {
        const known = new Set(knownSrcsList);
        const found = new Set();
        const startTime = Date.now();

        const scan = () => {
          document.querySelectorAll('img').forEach(img => {
            const src = img.src;
            if (!src || known.has(src) || found.has(src)) return;
            if (img.naturalWidth < 50 && img.width < 50) return;
            if (src.includes('getMediaUrlRedirect') || src.startsWith('blob:') || src.startsWith('data:')) {
              found.add(src);
            }
          });
        };

        const observer = new MutationObserver(() => {
          scan();
          if (found.size >= expectedCount) {
            observer.disconnect();
            clearInterval(poller);
            resolve({ imageUrls: [...found] });
          }
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

        const poller = setInterval(() => {
          scan();
          if (found.size >= expectedCount || Date.now() - startTime > timeoutMs) {
            observer.disconnect();
            clearInterval(poller);
            resolve({ imageUrls: [...found] });
          }
        }, 2000);

        scan();
      });
    },
    args: [[...knownSrcs], expectedCount, 120000],
    world: 'MAIN',
  });

  const result = imgResult?.result;
  if (!result?.imageUrls?.length) {
    throw new Error('No images generated (timeout or error)');
  }

  // Step 9: Download images
  for (let j = 0; j < result.imageUrls.length; j++) {
    const suffix = result.imageUrls.length > 1 ? `_${j + 1}` : '';
    const filename = item.filename
      ? item.filename.replace(/\.\w+$/, `${suffix}.png`)
      : `flowgenie_${item.index}_${j + 1}.png`;
    await handleDownload({ url: result.imageUrls[j], filename });
  }
}

// ---------------------------------------------------------------------------
// API mode (Phase 5 stub)
// ---------------------------------------------------------------------------
async function runApiMode(item, config) {
  throw new Error('API mode not yet implemented');
}

// ---------------------------------------------------------------------------
// Download handler
// ---------------------------------------------------------------------------
async function handleDownload({ url, filename }) {
  try {
    const downloadId = await chrome.downloads.download({
      url,
      filename: `FlowGenie/${filename}`,
      conflictAction: 'uniquify',
    });
    return { downloadId, filename };
  } catch (err) {
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Broadcast to side panel
// ---------------------------------------------------------------------------
function broadcastToSidePanel(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function randomDelay(min, max) {
  const mean = (min + max) / 2;
  const stddev = (max - min) / 6;
  let u1 = Math.random();
  let u2 = Math.random();
  if (u1 === 0) u1 = 0.0001;
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + z * stddev;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
