/**
 * FlowGenie Realistic Event Simulation
 *
 * Simulates human-like clicks and keyboard input.
 * Google Flow uses a Slate-based rich text editor that requires
 * specific InputEvent types rather than simple value assignment.
 */

/**
 * Simulate a realistic mouse click on an element.
 * Fires the full event chain: pointerdown → mousedown → pointerup → mouseup → click
 * @param {HTMLElement} el
 */
export function realisticClick(el) {
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 4;
  const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 4;

  const commonProps = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    screenX: x + window.screenX,
    screenY: y + window.screenY,
    button: 0,
    buttons: 1,
  };

  el.dispatchEvent(new PointerEvent('pointerdown', { ...commonProps, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mousedown', commonProps));

  // Small delay between down and up to mimic real click
  el.dispatchEvent(new PointerEvent('pointerup', { ...commonProps, pointerId: 1, pointerType: 'mouse', buttons: 0 }));
  el.dispatchEvent(new MouseEvent('mouseup', { ...commonProps, buttons: 0 }));
  el.dispatchEvent(new MouseEvent('click', { ...commonProps, buttons: 0 }));
}

/**
 * Clear the content of a Slate editor (contenteditable).
 * Uses Ctrl+A then delete to clear existing text.
 * @param {HTMLElement} editor - The [contenteditable] element
 */
export function clearSlateEditor(editor) {
  editor.focus();

  // Select all content
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);

  // Delete selected content via InputEvent
  editor.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'deleteContentBackward',
    data: null,
  }));

  editor.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'deleteContentBackward',
    data: null,
  }));

  // Also try setting textContent as fallback
  if (editor.textContent.trim()) {
    editor.textContent = '';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Type text into a Slate editor using insertText InputEvents.
 * This is the correct way to interact with Slate editors.
 * @param {HTMLElement} editor - The [contenteditable] element
 * @param {string} text - Text to type
 */
export function fillSlateEditor(editor, text) {
  editor.focus();

  // Place cursor at end
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  // Insert text via InputEvent (Slate compatible)
  editor.dispatchEvent(new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: text,
  }));

  editor.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: text,
  }));
}

/**
 * Focus an element with a slight offset to seem natural.
 * @param {HTMLElement} el
 */
export function focusElement(el) {
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  el.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
  el.focus();
}
