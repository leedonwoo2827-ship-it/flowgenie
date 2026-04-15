/**
 * FlowGenie reactive state store
 * Persists to chrome.storage.local and notifies subscribers on change.
 */
import { STORAGE_KEYS } from '../../shared/constants.js';

const DEFAULT_CONFIG = {
  model: 'IMAGEN_3_5',
  aspectRatio: '1:1',
  minDelay: 3000,
  maxDelay: 8000,
  mode: 'dom',
  downloadDir: 'FlowGenie',
  imagesPerPrompt: 4,
};

class Store {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    /** @type {Object} */
    this._state = {
      config: { ...DEFAULT_CONFIG },
      queue: [],
      stats: { total: 0, completed: 0, failed: 0, startedAt: null },
      connected: false,
      running: false,
    };
    this._loaded = false;
  }

  /** Load persisted state from chrome.storage.local */
  async load() {
    if (this._loaded) return;
    const data = await chrome.storage.local.get([STORAGE_KEYS.CONFIG, STORAGE_KEYS.QUEUE, STORAGE_KEYS.STATS]);
    if (data[STORAGE_KEYS.CONFIG]) {
      this._state.config = { ...DEFAULT_CONFIG, ...data[STORAGE_KEYS.CONFIG] };
    }
    if (data[STORAGE_KEYS.QUEUE]) {
      this._state.queue = data[STORAGE_KEYS.QUEUE];
    }
    if (data[STORAGE_KEYS.STATS]) {
      this._state.stats = { ...this._state.stats, ...data[STORAGE_KEYS.STATS] };
    }
    this._loaded = true;
    this._notifyAll();
  }

  /** Get a state value by dot path (e.g. 'config.model') */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this._state);
  }

  /** Set state and persist + notify */
  async set(path, value) {
    const keys = path.split('.');
    let target = this._state;
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;

    // Persist relevant top-level keys
    const topKey = keys[0];
    if (topKey === 'config') {
      await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: this._state.config });
    } else if (topKey === 'queue') {
      await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: this._state.queue });
    } else if (topKey === 'stats') {
      await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: this._state.stats });
    }

    this._notify(path);
  }

  /** Subscribe to changes on a path */
  on(path, callback) {
    if (!this._listeners.has(path)) {
      this._listeners.set(path, new Set());
    }
    this._listeners.get(path).add(callback);
    return () => this._listeners.get(path)?.delete(callback);
  }

  /** Notify listeners for a specific path and its parent paths */
  _notify(path) {
    const parts = path.split('.');
    for (let i = parts.length; i >= 1; i--) {
      const p = parts.slice(0, i).join('.');
      const listeners = this._listeners.get(p);
      if (listeners) {
        const value = this.get(p);
        listeners.forEach((fn) => fn(value, p));
      }
    }
    // Also notify wildcard '*' listeners
    const star = this._listeners.get('*');
    if (star) {
      star.forEach((fn) => fn(this._state, path));
    }
  }

  _notifyAll() {
    for (const [path, listeners] of this._listeners) {
      const value = path === '*' ? this._state : this.get(path);
      listeners.forEach((fn) => fn(value, path));
    }
  }

  /** Get full snapshot (read-only) */
  snapshot() {
    return structuredClone(this._state);
  }
}

export const store = new Store();
