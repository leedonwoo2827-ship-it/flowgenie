/**
 * FlowGenie Interceptor (MAIN world, document_start)
 *
 * Hooks into Google Flow's file upload mechanism:
 * - Overrides window.showOpenFilePicker to inject reference images
 * - Overrides HTMLInputElement.prototype.click for <input type="file">
 *
 * Listens for commands from ISOLATED world via data-fg-command attribute.
 */

(function () {
  'use strict';

  // Guard: only run once
  if (window.__flowGenieInterceptor) return;
  window.__flowGenieInterceptor = true;

  // ---------------------------------------------------------------------------
  // File upload interception
  // ---------------------------------------------------------------------------
  const origShowOpenFilePicker = window.showOpenFilePicker;
  const origInputClick = HTMLInputElement.prototype.click;

  /**
   * Override showOpenFilePicker to intercept file selection.
   * When data-fg-upload is set, returns the prepared file instead of showing dialog.
   */
  if (origShowOpenFilePicker) {
    window.showOpenFilePicker = async function (...args) {
      const uploadData = document.documentElement.getAttribute('data-fg-upload');
      if (uploadData) {
        document.documentElement.removeAttribute('data-fg-upload');
        try {
          const { dataUrl, name, type } = JSON.parse(uploadData);
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], name, { type });
          // Create a mock FileSystemFileHandle
          return [{
            getFile: async () => file,
            kind: 'file',
            name: file.name,
          }];
        } catch (err) {
          console.error('[FlowGenie] Upload intercept failed:', err);
        }
      }
      return origShowOpenFilePicker.apply(this, args);
    };
  }

  /**
   * Override input.click() for file inputs.
   * When data-fg-upload is set, fires change event with prepared file.
   */
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') {
      const uploadData = document.documentElement.getAttribute('data-fg-upload');
      if (uploadData) {
        document.documentElement.removeAttribute('data-fg-upload');
        try {
          const { dataUrl, name, type } = JSON.parse(uploadData);
          fetch(dataUrl).then((r) => r.blob()).then((blob) => {
            const file = new File([blob], name, { type });
            const dt = new DataTransfer();
            dt.items.add(file);
            this.files = dt.files;
            this.dispatchEvent(new Event('change', { bubbles: true }));
          });
          return; // Don't open native dialog
        } catch (err) {
          console.error('[FlowGenie] File input intercept failed:', err);
        }
      }
    }
    return origInputClick.call(this);
  };

  // ---------------------------------------------------------------------------
  // Command listener: ISOLATED world → MAIN world
  // ---------------------------------------------------------------------------
  const commandObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'data-fg-command') {
        const raw = document.documentElement.getAttribute('data-fg-command');
        if (!raw) continue;
        try {
          const cmd = JSON.parse(raw);
          handleCommand(cmd);
        } catch { /* ignore */ }
      }
    }
  });

  commandObserver.observe(document.documentElement, { attributes: true });

  function handleCommand(cmd) {
    // Commands will be handled by dom-mode.js when injected at runtime.
    // This interceptor only handles file upload hooks.
    // Other commands are stored for dom-mode.js to pick up.
    window.__flowGenieCommand = cmd;
  }

  console.log('[FlowGenie] Interceptor loaded');
})();
