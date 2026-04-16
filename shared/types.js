/**
 * FlowGenie JSDoc type definitions
 *
 * @typedef {Object} ScriptForgeScene
 * @property {number} [scene] - Scene number (classic format)
 * @property {string} [scene_id] - Scene ID string e.g. "s01" (extended format)
 * @property {string} title - Scene title (Korean)
 * @property {string} [image_filename] - Target filename for download (classic)
 * @property {string} [file_name] - Target filename without extension (extended)
 * @property {string} [prompt] - AI image prompt (classic)
 * @property {string} [image_prompt] - AI image prompt (extended)
 * @property {string} model - Model id (e.g. "nano_banana", "imagen_3_5")
 * @property {number} [narration_seconds] - Narration duration (classic)
 * @property {number} [duration_sec] - Narration duration (extended)
 * @property {string} [visual_description] - Visual description (Korean)
 * @property {string} [subtitle] - Subtitle, used as fallback for visual_description
 * @property {string|null} [reference_image] - Path to reference image or null
 */

/**
 * @typedef {Object} ScriptForgeJSON
 * @property {number} [chapter] - Chapter number (classic format)
 * @property {string} [title] - Chapter title (classic format)
 * @property {{ chapter?: string|number, title?: string }} [meta] - Meta info (extended format)
 * @property {ScriptForgeScene[]} scenes - Array of scenes
 */

/**
 * @typedef {Object} BatchItem
 * @property {string} id - Unique ID (uuid)
 * @property {number} index - Queue position (0-based)
 * @property {string} prompt - Image prompt text
 * @property {string} filename - Target download filename
 * @property {string} model - Model ID from constants
 * @property {string} status - One of STATUS values
 * @property {string|null} referenceImage - Base64 or blob URL
 * @property {string[]} resultUrls - Generated image URLs
 * @property {string[]} downloadedFiles - Local filenames after download
 * @property {number} retries - Retry count
 * @property {string|null} error - Error message if failed
 * @property {number} startedAt - Timestamp when generation started
 * @property {number} completedAt - Timestamp when completed
 */

/**
 * @typedef {Object} FGConfig
 * @property {string} model - Default model ID
 * @property {string} aspectRatio - Aspect ratio key
 * @property {number} minDelay - Min delay between prompts (ms)
 * @property {number} maxDelay - Max delay between prompts (ms)
 * @property {string} mode - 'dom' | 'api'
 * @property {string} downloadDir - Download subdirectory
 * @property {number} imagesPerPrompt - Number of images per prompt (1-4)
 */

export {};
