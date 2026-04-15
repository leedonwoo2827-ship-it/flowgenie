/**
 * FlowGenie message bus
 * Abstraction over chrome.runtime messaging for side panel ↔ service worker.
 */
import { MSG } from '../../shared/constants.js';

class MessageBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._handlers = new Map();

    // Listen for incoming messages from service worker / content scripts
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type && this._handlers.has(msg.type)) {
        this._handlers.get(msg.type).forEach((fn) => fn(msg.payload, sender));
      }
    });
  }

  /**
   * Register a handler for a message type.
   * @param {string} type - Message type from MSG constants
   * @param {Function} handler - (payload, sender) => void
   * @returns {Function} Unsubscribe function
   */
  on(type, handler) {
    if (!this._handlers.has(type)) {
      this._handlers.set(type, new Set());
    }
    this._handlers.get(type).add(handler);
    return () => this._handlers.get(type)?.delete(handler);
  }

  /**
   * Send message to service worker.
   * @param {string} type - Message type
   * @param {*} [payload] - Optional payload
   * @returns {Promise<*>} Response from receiver
   */
  send(type, payload) {
    return chrome.runtime.sendMessage({ type, payload });
  }

  /**
   * Send message to a specific tab's content script.
   * @param {number} tabId
   * @param {string} type
   * @param {*} [payload]
   * @returns {Promise<*>}
   */
  sendToTab(tabId, type, payload) {
    return chrome.tabs.sendMessage(tabId, { type, payload });
  }

  /**
   * Ping the service worker / bridge and check connection status.
   * @returns {Promise<{connected: boolean, flowTabId: number|null}>}
   */
  async checkConnection() {
    try {
      const response = await this.send(MSG.PING);
      if (response?.type === MSG.PONG) {
        return { connected: true, flowTabId: response.flowTabId };
      }
    } catch { /* extension context invalid */ }
    return { connected: false, flowTabId: null };
  }
}

export const bus = new MessageBus();
