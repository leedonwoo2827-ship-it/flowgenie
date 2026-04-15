/**
 * FlowGenie MutationObserver — image completion detection
 *
 * Watches the DOM for new images appearing after generation is triggered.
 * Resolves when the expected number of images appear or timeout is reached.
 */

/**
 * Wait for new images to appear in the DOM after triggering generation.
 *
 * @param {Object} options
 * @param {Set<string>} options.knownSrcs - Image srcs already present before generation
 * @param {number} [options.expectedCount=4] - Number of images to wait for
 * @param {number} [options.timeoutMs=120000] - Max wait time
 * @param {Function} [options.shouldStop] - If returns true, abort early
 * @returns {Promise<string[]>} Array of new image src URLs
 */
export function waitForNewImages({ knownSrcs, expectedCount = 4, timeoutMs = 120000, shouldStop }) {
  return new Promise((resolve, reject) => {
    const newSrcs = new Set();
    let settled = false;

    const cleanup = () => {
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      clearInterval(checker);
    };

    // Timeout
    const timer = setTimeout(() => {
      if (settled) return;
      cleanup();
      if (newSrcs.size > 0) {
        resolve([...newSrcs]); // Return whatever we got
      } else {
        reject(new Error(`Timeout: no new images after ${timeoutMs / 1000}s`));
      }
    }, timeoutMs);

    // Check for stop signal
    const checker = setInterval(() => {
      if (shouldStop?.()) {
        cleanup();
        resolve([...newSrcs]);
      }
    }, 500);

    // Scan function
    const scanForNewImages = () => {
      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        const src = img.src;
        if (!src || knownSrcs.has(src) || newSrcs.has(src)) continue;
        if (img.naturalWidth < 100 && img.width < 100) continue;
        if (src.includes('getMediaUrlRedirect') || src.startsWith('blob:') || src.startsWith('data:')) {
          newSrcs.add(src);
        }
      }

      if (newSrcs.size >= expectedCount && !settled) {
        cleanup();
        resolve([...newSrcs]);
      }
    };

    // MutationObserver for real-time detection
    const observer = new MutationObserver((mutations) => {
      let hasRelevant = false;
      for (const mutation of mutations) {
        // Check added nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'IMG') {
            hasRelevant = true;
            break;
          }
          if (node.querySelectorAll) {
            const imgs = node.querySelectorAll('img');
            if (imgs.length > 0) {
              hasRelevant = true;
              break;
            }
          }
        }

        // Check attribute changes on images (src change)
        if (mutation.type === 'attributes' && mutation.target.nodeName === 'IMG') {
          hasRelevant = true;
        }

        if (hasRelevant) break;
      }

      if (hasRelevant) scanForNewImages();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });

    // Initial scan (images might already be there)
    scanForNewImages();
  });
}

/**
 * Collect all current image srcs on the page (to know what's "old").
 * @returns {Set<string>}
 */
export function collectCurrentImageSrcs() {
  const srcs = new Set();
  for (const img of document.querySelectorAll('img')) {
    if (img.src) srcs.add(img.src);
  }
  return srcs;
}
