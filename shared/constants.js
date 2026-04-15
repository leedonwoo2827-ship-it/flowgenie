/**
 * FlowGenie shared constants
 */

// Google Flow models
export const MODELS = {
  IMAGEN_3_5: { id: 'IMAGEN_3_5', label: 'Imagen 4', default: true },
  GEM_PIX: { id: 'GEM_PIX', label: 'Nano Banana Pro', default: false },
};

// Aspect ratios supported by Google Flow
export const ASPECT_RATIOS = {
  '1:1': { width: 1024, height: 1024 },
  '3:4': { width: 896, height: 1152 },
  '4:3': { width: 1152, height: 896 },
  '9:16': { width: 768, height: 1344 },
  '16:9': { width: 1344, height: 768 },
};

// API endpoint (reverse-engineered)
export const API_ENDPOINT = 'https://aisandbox-pa.googleapis.com/v1:runImageFx';
export const AUTH_SESSION_URL = 'https://labs.google/fx/api/auth/session';

// Batch item states
export const STATUS = {
  PENDING: 'pending',
  GENERATING: 'generating',
  COMPLETE: 'complete',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

// Message types for chrome.runtime messaging
export const MSG = {
  // Connection
  PING: 'fg:ping',
  PONG: 'fg:pong',

  // Batch control
  START_BATCH: 'fg:start-batch',
  STOP_BATCH: 'fg:stop-batch',
  BATCH_PROGRESS: 'fg:batch-progress',
  BATCH_COMPLETE: 'fg:batch-complete',
  ITEM_UPDATE: 'fg:item-update',

  // DOM automation
  RUN_PROMPT: 'fg:run-prompt',
  PROMPT_RESULT: 'fg:prompt-result',

  // Download
  DOWNLOAD_IMAGE: 'fg:download-image',
  DOWNLOAD_COMPLETE: 'fg:download-complete',

  // API mode
  API_GENERATE: 'fg:api-generate',
  API_RESULT: 'fg:api-result',
  CAPTURE_TOKEN: 'fg:capture-token',

  // Tab
  GET_FLOW_TAB: 'fg:get-flow-tab',
  FLOW_TAB_FOUND: 'fg:flow-tab-found',
};

// Timing defaults
export const TIMING = {
  MIN_DELAY_MS: 3000,
  MAX_DELAY_MS: 8000,
  GENERATION_TIMEOUT_MS: 120_000,
  RETRY_MAX: 2,
};

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: 'fg-config',
  QUEUE: 'fg-queue',
  STATS: 'fg-stats',
};
