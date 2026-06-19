/**
 * FlowGenie DOM Selectors
 *
 * Google Flow (ImageFX) DOM selectors.
 * These may change when Google updates the UI — centralized here for easy maintenance.
 */

export const SEL = {
  // Prompt input area (Slate editor with contenteditable).
  // NOTE (2026-06): Google Flow now runs a conversational (Gemini agent) panel.
  // This same Slate editor is the chat composer — submission is via Enter.
  PROMPT_INPUT: '[role="textbox"][contenteditable="true"]',
  SLATE_EDITOR: '[data-slate-editor="true"]',

  // Composer bar that wraps the editor + send button (used to scope button search).
  COMPOSER_BAR: 'form, [class*="composer"], [class*="prompt-bar"], [class*="input-bar"]',

  // Send / submit button inside the composer (rightmost small icon button).
  // The agent UI may label it Send/Submit; Enter is the primary submit path.
  SEND_BUTTON: 'button[aria-label*="Send"], button[aria-label*="Submit"], button[aria-label*="보내기"], button[aria-label*="전송"]',

  // Generate button — contains the arrow_forward icon
  // Google Flow uses Material Icons; the button has a <span> child with "arrow_forward"
  GENERATE_BUTTON: 'button.generate-button, button[aria-label*="Create"], button[aria-label*="Generate"]',

  // Fallback: find button by icon text content
  GENERATE_BUTTON_ICON: 'arrow_forward',

  // Generated image results
  // Images appear as <img> with src containing "getMediaUrlRedirect" or blob URLs
  RESULT_IMAGE: 'img[src*="getMediaUrlRedirect"], img[src*="blob:"]',

  // Result image container (the grid/panel where images appear).
  // In conversational mode, generated images land in the left media grid.
  RESULT_CONTAINER: '[class*="result"], [class*="image-panel"], [class*="output"], [class*="media-grid"], [class*="gallery"]',

  // Loading/spinner indicator (present while generating)
  LOADING_INDICATOR: '[class*="loading"], [class*="spinner"], [class*="progress"]',

  // Model selector (dropdown or button group for model selection)
  MODEL_SELECTOR: '[class*="model-selector"], [class*="model-picker"]',

  // Aspect ratio selector
  RATIO_SELECTOR: '[class*="aspect-ratio"], [class*="ratio"]',

  // Reference image upload area
  UPLOAD_AREA: '[class*="upload"], [class*="reference"], input[type="file"]',

  // Error/safety filter messages
  ERROR_MESSAGE: '[class*="error"], [class*="safety"], [class*="blocked"]',

  // Image download button (per-image)
  DOWNLOAD_BUTTON: 'button[aria-label*="Download"], button[aria-label*="download"]',
};

/**
 * Find the generate button by multiple strategies.
 * @returns {HTMLElement|null}
 */
export function findGenerateButton() {
  // Strategy 1: direct selector
  let btn = document.querySelector(SEL.GENERATE_BUTTON);
  if (btn) return btn;

  // Strategy 2: find by icon text
  const allButtons = document.querySelectorAll('button');
  for (const b of allButtons) {
    if (b.textContent.trim().includes(SEL.GENERATE_BUTTON_ICON)) {
      return b;
    }
    // Also check aria-label
    const label = b.getAttribute('aria-label') || '';
    if (label.toLowerCase().includes('create') || label.toLowerCase().includes('generate')) {
      return b;
    }
  }

  return null;
}

/**
 * Find all result images that are newly generated (> 100px, valid src).
 * @param {Set<string>} knownSrcs - Previously known image srcs to exclude
 * @returns {HTMLImageElement[]}
 */
export function findNewResultImages(knownSrcs = new Set()) {
  const imgs = document.querySelectorAll('img');
  const results = [];
  for (const img of imgs) {
    if (img.naturalWidth < 100 || img.naturalHeight < 100) continue;
    const src = img.src;
    if (!src) continue;
    if (knownSrcs.has(src)) continue;
    if (src.includes('getMediaUrlRedirect') || src.startsWith('blob:') || src.startsWith('data:')) {
      results.push(img);
    }
  }
  return results;
}
