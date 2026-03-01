/**
 * Shareable link utilities — encode/decode playground state as a URL hash.
 *
 * State is JSON-serialized then base64url-encoded and stored in `location.hash`.
 * Example: https://ficta.dev/playground/#eyJjb2x1bW5zIjoiaWQ6YXV0...
 *
 * @module share
 */

/**
 * @typedef {Object} PlaygroundState
 * @property {string} columns - Column definitions string
 * @property {string} [template] - Template name
 * @property {number} rows - Row count
 * @property {string} format - Output format
 * @property {string} [dialect] - SQL dialect
 */

/**
 * Encode playground state into a base64url string suitable for use as a URL hash.
 * @param {PlaygroundState} state
 * @returns {string} base64url-encoded state
 */
export function encodeState(state) {
  const json = JSON.stringify(state);
  // btoa works in all modern browsers
  return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ));
}

/**
 * Decode a base64url state string back into a PlaygroundState object.
 * @param {string} encoded
 * @returns {PlaygroundState|null} Decoded state, or null if decode fails
 */
export function decodeState(encoded) {
  try {
    const json = decodeURIComponent(atob(encoded).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Read the current URL hash and decode playground state.
 * @returns {PlaygroundState|null}
 */
export function readStateFromHash() {
  const hash = window.location.hash.slice(1); // Remove the '#'
  if (!hash) return null;
  return decodeState(hash);
}

/**
 * Write playground state to the URL hash (no page reload).
 * @param {PlaygroundState} state
 */
export function writeStateToHash(state) {
  const encoded = encodeState(state);
  if (window.history.replaceState) {
    window.history.replaceState(null, '', '#' + encoded);
  } else {
    window.location.hash = encoded;
  }
}

/**
 * Build a shareable URL string for the given state.
 * @param {PlaygroundState} state
 * @returns {string} Full URL with hash
 */
export function buildShareURL(state) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${encodeState(state)}`;
}
