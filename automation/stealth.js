/**
 * FlowGenie Stealth — human-like timing
 *
 * Uses normal distribution (Box-Muller) for delays that look natural.
 */

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random delay (ms) with normal distribution.
 * The delay is clamped between min and max.
 *
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {number}
 */
export function normalDelay(min, max) {
  const mean = (min + max) / 2;
  const stddev = (max - min) / 6; // 99.7% within [min, max]

  let u1 = Math.random();
  let u2 = Math.random();
  if (u1 === 0) u1 = 0.0001; // avoid log(0)

  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + z * stddev;

  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Wait a short random pause (typing/interaction feel).
 * @param {number} [minMs=50]
 * @param {number} [maxMs=200]
 */
export function microPause(minMs = 50, maxMs = 200) {
  return sleep(normalDelay(minMs, maxMs));
}

/**
 * Wait between prompts (longer, human-like pace).
 * @param {number} [minMs=3000]
 * @param {number} [maxMs=8000]
 */
export function interPromptDelay(minMs = 3000, maxMs = 8000) {
  return sleep(normalDelay(minMs, maxMs));
}
