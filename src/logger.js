/**
 * Internal logger — no-op by default.
 * CLI sets it to console; library consumers can inject their own.
 *
 * Universal — no Node.js or browser-specific dependencies.
 * @module logger
 */

const noopLogger = {
  log() {},
  info() {},
  warn() {},
  error() {},
};

let currentLogger = { ...noopLogger };

/**
 * Set the active logger. Pass null or undefined to reset to no-op.
 * @param {{ log?: Function, info?: Function, warn?: Function, error?: Function }|null} logger
 */
export function setLogger(logger) {
  currentLogger = logger || { ...noopLogger };
}

/** Get the current active logger. */
export function getLogger() {
  return currentLogger;
}

/** Reset the logger to the no-op default. */
export function resetLogger() {
  currentLogger = { ...noopLogger };
}
