/**
 * FlowGenie Prompt Parser
 *
 * Parses input data into BatchItem arrays.
 * Supports: ScriptForge JSON (primary), plain JSON array, line-per-prompt TXT.
 */
import { STATUS } from './constants.js';

/**
 * @typedef {import('./types.js').ScriptForgeJSON} ScriptForgeJSON
 * @typedef {import('./types.js').BatchItem} BatchItem
 */

/**
 * Parse text input into an array of BatchItems.
 * @param {string} text - Raw text (JSON or line-per-prompt)
 * @param {string} defaultModel - Default model ID from config
 * @returns {{ items: BatchItem[], meta: { chapter?: number, title?: string } }}
 */
export function parsePrompts(text, defaultModel = 'IMAGEN_3_5') {
  const trimmed = text.trim();
  const meta = {};

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);

      // ScriptForge JSON format: { chapter, title, scenes: [...] }
      if (data.scenes && Array.isArray(data.scenes)) {
        meta.chapter = data.chapter;
        meta.title = data.title;
        const items = data.scenes.map((scene, i) => ({
          id: crypto.randomUUID(),
          index: i,
          prompt: scene.prompt,
          filename: scene.image_filename || `scene_${String(scene.scene).padStart(2, '0')}.png`,
          model: mapModel(scene.model, defaultModel),
          status: STATUS.PENDING,
          referenceImage: scene.reference_image || null,
          resultUrls: [],
          downloadedFiles: [],
          retries: 0,
          error: null,
          startedAt: null,
          completedAt: null,
          _meta: {
            scene: scene.scene,
            title: scene.title,
            narrationSeconds: scene.narration_seconds,
            visualDescription: scene.visual_description,
          },
        }));
        return { items, meta };
      }

      // Plain array: [{prompt, filename?}, ...] or ["prompt1", "prompt2"]
      if (Array.isArray(data)) {
        const items = data.map((entry, i) => {
          const prompt = typeof entry === 'string' ? entry : entry.prompt;
          const filename = typeof entry === 'string' ? null : entry.filename;
          return makeBatchItem(i, prompt, filename, defaultModel);
        });
        return { items, meta };
      }
    } catch {
      // Not valid JSON — fall through to line-by-line
    }
  }

  // Fallback: line-per-prompt text
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = lines.map((line, i) => makeBatchItem(i, line, null, defaultModel));
  return { items, meta };
}

/**
 * Create a generic BatchItem.
 */
function makeBatchItem(index, prompt, filename, defaultModel) {
  return {
    id: crypto.randomUUID(),
    index,
    prompt,
    filename: filename || `flowgenie_${String(index + 1).padStart(3, '0')}.png`,
    model: defaultModel,
    status: STATUS.PENDING,
    referenceImage: null,
    resultUrls: [],
    downloadedFiles: [],
    retries: 0,
    error: null,
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Map a model string from scriptforge to a constants model ID.
 */
function mapModel(modelStr, fallback) {
  if (!modelStr) return fallback;
  const lower = modelStr.toLowerCase().replace(/[\s_-]/g, '');
  if (lower.includes('nanobanana') || lower.includes('gempix')) return 'GEM_PIX';
  if (lower.includes('imagen')) return 'IMAGEN_3_5';
  return fallback;
}
