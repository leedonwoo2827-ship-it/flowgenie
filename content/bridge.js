/**
 * FlowGenie Bridge (ISOLATED world)
 * Relays messages between extension runtime and MAIN world via DOM attributes.
 * Also responds to connection checks from the side panel.
 */

// ---------------------------------------------------------------------------
// Connection check
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'fg:ping') {
    sendResponse({ type: 'fg:pong', from: 'bridge', url: location.href });
    return;
  }

  // Forward messages from side panel / service worker → MAIN world
  if (msg.type === 'fg:run-prompt') {
    relayToMain(msg);
    sendResponse({ ack: true });
    return;
  }

  if (msg.type === 'fg:stop-batch') {
    document.documentElement.setAttribute('data-fg-stop', 'true');
    sendResponse({ ack: true });
    return;
  }
});

// ---------------------------------------------------------------------------
// MAIN ↔ ISOLATED world communication via DOM attributes
// ---------------------------------------------------------------------------

/**
 * Send data to MAIN world by setting a data attribute on <html>.
 * MAIN world's interceptor.js observes these attributes.
 */
function relayToMain(msg) {
  document.documentElement.setAttribute('data-fg-command', JSON.stringify(msg));
  // Clean up after MAIN world has time to read
  setTimeout(() => {
    document.documentElement.removeAttribute('data-fg-command');
  }, 200);
}

/**
 * Listen for results from MAIN world via MutationObserver.
 * MAIN world sets data-fg-result on <html> when done.
 */
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.attributeName === 'data-fg-result') {
      const raw = document.documentElement.getAttribute('data-fg-result');
      if (raw) {
        try {
          const result = JSON.parse(raw);
          chrome.runtime.sendMessage({ type: 'fg:prompt-result', payload: result });
        } catch { /* ignore malformed */ }
        document.documentElement.removeAttribute('data-fg-result');
      }
    }

    if (mutation.attributeName === 'data-fg-upload-request') {
      const raw = document.documentElement.getAttribute('data-fg-upload-request');
      if (raw) {
        try {
          const req = JSON.parse(raw);
          chrome.runtime.sendMessage({ type: 'fg:upload-request', payload: req });
        } catch { /* ignore */ }
        document.documentElement.removeAttribute('data-fg-upload-request');
      }
    }
  }
});

observer.observe(document.documentElement, { attributes: true });

console.log('[FlowGenie] Bridge loaded on', location.href);
