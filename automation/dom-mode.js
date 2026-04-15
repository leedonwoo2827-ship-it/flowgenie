/**
 * FlowGenie DOM Mode — Main automation engine
 *
 * This function is injected into the Google Flow tab via chrome.scripting.executeScript.
 * It MUST be self-contained (no imports) because executeScript serializes the function.
 *
 * Flow:
 *   clearPrompt → fillPrompt → clickGenerate → waitForCompletion → collectImageUrls
 */

/**
 * Entry point for DOM automation. Injected into MAIN world of Google Flow tab.
 *
 * @param {Object} item - BatchItem with { prompt, model, index, ... }
 * @param {Object} config - { model, aspectRatio, imagesPerPrompt, ... }
 * @returns {Promise<{ imageUrls: string[], error?: string }>}
 */
export async function domModeExecute(item, config) {
  try {
    // --- Helper: sleep ---
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // --- Helper: random delay ---
    const randDelay = (min, max) => {
      const mean = (min + max) / 2;
      const std = (max - min) / 6;
      let u1 = Math.random() || 0.0001;
      let u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return Math.max(min, Math.min(max, Math.round(mean + z * std)));
    };

    // --- Step 0: Check for stop signal ---
    const isStopped = () => document.documentElement.getAttribute('data-fg-stop') === 'true';
    if (isStopped()) return { imageUrls: [], error: 'Stopped by user' };

    // --- Step 1: Find the Slate editor ---
    const editor = document.querySelector('[data-slate-editor="true"]')
      || document.querySelector('[role="textbox"][contenteditable="true"]')
      || document.querySelector('[contenteditable="true"]');

    if (!editor) {
      return { imageUrls: [], error: 'Slate editor not found' };
    }

    // --- Step 2: Click to focus (realistic click, not just .focus()) ---
    const editorRect = editor.getBoundingClientRect();
    const ex = editorRect.left + editorRect.width / 2;
    const ey = editorRect.top + editorRect.height / 2;
    const focusProps = { bubbles: true, cancelable: true, clientX: ex, clientY: ey, button: 0 };
    editor.dispatchEvent(new PointerEvent('pointerdown', { ...focusProps, pointerId: 1, pointerType: 'mouse' }));
    editor.dispatchEvent(new MouseEvent('mousedown', focusProps));
    editor.dispatchEvent(new PointerEvent('pointerup', { ...focusProps, pointerId: 1, pointerType: 'mouse' }));
    editor.dispatchEvent(new MouseEvent('mouseup', focusProps));
    editor.dispatchEvent(new MouseEvent('click', focusProps));
    editor.focus();
    await sleep(200);

    // --- Step 3: Select all + delete existing text ---
    document.execCommand('selectAll');
    await sleep(50);
    document.execCommand('delete');
    await sleep(300);

    // --- Step 4: Insert prompt text into Slate ---
    // Slate only recognizes text from trusted input events.
    // Use composition events (IME) approach — Slate has special handling for these
    // that reconciles DOM with its internal model.

    // Method A: Composition event sequence
    editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    await sleep(50);

    // Insert text into DOM during composition
    document.execCommand('insertText', false, item.prompt);
    await sleep(100);

    editor.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: item.prompt }));
    await sleep(50);
    editor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: item.prompt }));
    await sleep(500);

    // Method B: If composition didn't work, try InputEvent with insertFromPaste
    if (!editor.textContent.trim()) {
      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', item.prompt);
        editor.dispatchEvent(new InputEvent('beforeinput', {
          bubbles: true, cancelable: true,
          inputType: 'insertFromPaste',
          dataTransfer: dataTransfer,
        }));
        await sleep(300);
      } catch {}
    }

    // Method C: If still empty, try paste event
    if (!editor.textContent.trim()) {
      const dt = new DataTransfer();
      dt.setData('text/plain', item.prompt);
      editor.dispatchEvent(new ClipboardEvent('paste', {
        bubbles: true, cancelable: true, clipboardData: dt,
      }));
      await sleep(300);
    }

    if (!editor.textContent.trim()) {
      return { imageUrls: [], error: 'All text insertion methods failed' };
    }

    await sleep(300);

    // --- Step 5: Snapshot current images (before generation) ---
    const knownSrcs = new Set();
    for (const img of document.querySelectorAll('img')) {
      if (img.src) knownSrcs.add(img.src);
    }

    // --- Step 6: Find and click generate button ---
    // The → button is in the same bottom bar as the prompt input
    let generateBtn = null;

    // Strategy 1: find the button with SVG that's in the prompt bar area
    const editorContainer = editor.closest('[class*="sc-9586f820"]') || editor.parentElement?.parentElement;
    if (editorContainer) {
      const parentBar = editorContainer.parentElement;
      if (parentBar) {
        const btns = parentBar.querySelectorAll('button');
        // The → button is typically the last button in the bar
        for (const btn of btns) {
          if (btn.querySelector('svg') || btn.querySelector('path')) {
            generateBtn = btn;
          }
        }
      }
    }

    // Strategy 2: find by aria-label
    if (!generateBtn) {
      const ariaSelectors = [
        'button[aria-label*="Create"]', 'button[aria-label*="create"]',
        'button[aria-label*="Generate"]', 'button[aria-label*="generate"]',
        'button[aria-label*="만들"]', 'button[aria-label*="생성"]',
        'button[aria-label*="Submit"]', 'button[aria-label*="Send"]',
      ];
      for (const sel of ariaSelectors) {
        generateBtn = document.querySelector(sel);
        if (generateBtn) break;
      }
    }

    // Strategy 3: bottom-right button with SVG (the arrow icon)
    if (!generateBtn) {
      const allBtns = [...document.querySelectorAll('button')];
      // Filter to buttons in the lower part of the page
      const bottomBtns = allBtns.filter(b => {
        const r = b.getBoundingClientRect();
        return r.top > window.innerHeight * 0.7 && r.width < 80 && b.querySelector('svg, path');
      });
      if (bottomBtns.length > 0) generateBtn = bottomBtns[bottomBtns.length - 1];
    }

    if (!generateBtn) {
      return { imageUrls: [], error: 'Generate button not found near editor' };
    }

    // Try multiple click approaches

    // Approach 1: Press Enter on the editor (many chat-like UIs submit on Enter)
    editor.focus();
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    editor.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    editor.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    await sleep(800);

    // Approach 2: Direct .click() on the button
    generateBtn.click();
    await sleep(500);

    // Approach 3: Full synthetic click with coordinates
    const rect = generateBtn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const cp = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 };
    generateBtn.dispatchEvent(new PointerEvent('pointerdown', { ...cp, pointerId: 1, pointerType: 'mouse' }));
    generateBtn.dispatchEvent(new MouseEvent('mousedown', cp));
    await sleep(50);
    generateBtn.dispatchEvent(new PointerEvent('pointerup', { ...cp, pointerId: 1, pointerType: 'mouse', buttons: 0 }));
    generateBtn.dispatchEvent(new MouseEvent('mouseup', { ...cp, buttons: 0 }));
    generateBtn.dispatchEvent(new MouseEvent('click', { ...cp, buttons: 0 }));

    await sleep(2000); // Wait for generation to start

    // --- Step 6: Wait for new images ---
    const expectedCount = config.imagesPerPrompt || 4;
    const timeoutMs = 120000;
    const startTime = Date.now();

    const imageUrls = await new Promise((resolve) => {
      const found = new Set();

      const scanImages = () => {
        for (const img of document.querySelectorAll('img')) {
          const src = img.src;
          if (!src || knownSrcs.has(src) || found.has(src)) continue;
          if (img.naturalWidth < 100 && img.width < 100) continue;
          if (src.includes('getMediaUrlRedirect') || src.startsWith('blob:') || src.startsWith('data:')) {
            found.add(src);
          }
        }
      };

      const observer = new MutationObserver(() => {
        scanImages();
        if (found.size >= expectedCount) {
          observer.disconnect();
          clearInterval(poller);
          resolve([...found]);
        }
      });

      observer.observe(document.body, {
        childList: true, subtree: true,
        attributes: true, attributeFilter: ['src'],
      });

      // Also poll periodically (some changes may not trigger MutationObserver)
      const poller = setInterval(() => {
        if (isStopped()) {
          observer.disconnect();
          clearInterval(poller);
          resolve([...found]);
          return;
        }
        scanImages();
        if (found.size >= expectedCount) {
          observer.disconnect();
          clearInterval(poller);
          resolve([...found]);
        }
        if (Date.now() - startTime > timeoutMs) {
          observer.disconnect();
          clearInterval(poller);
          resolve([...found]); // Return whatever we have
        }
      }, 2000);

      // Initial scan
      scanImages();
    });

    if (imageUrls.length === 0) {
      // Check for error messages
      const errorEls = document.querySelectorAll('[class*="error"], [class*="safety"], [class*="blocked"]');
      for (const el of errorEls) {
        const text = el.textContent.trim();
        if (text.length > 5 && text.length < 200) {
          return { imageUrls: [], error: `Flow error: ${text}` };
        }
      }
      return { imageUrls: [], error: 'No images generated (timeout)' };
    }

    // Clear stop signal if it was set
    document.documentElement.removeAttribute('data-fg-stop');

    return { imageUrls };
  } catch (err) {
    return { imageUrls: [], error: err.message || String(err) };
  }
}
