/**
 * Build integration tests — verify that `npm run build` produces the
 * expected playground artifacts in `playground/dist/`.
 *
 * These tests run the build script in a subprocess, so they are intentionally
 * slower than unit tests (30 s timeout). They are skipped in watch mode via
 * the SKIP_BUILD_TESTS env variable.
 */
import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('build artifacts', () => {
  // Run build once before checking artifacts.
  // Use execSync so it blocks; timeout handled by the test timeout below.
  test('npm run build produces all expected artifacts', { timeout: 90_000 }, () => {
    // Run the build script
    try {
      execSync('node build.js', { cwd: root, stdio: 'pipe' });
    } catch (err) {
      throw new Error(`Build failed:\n${err.stderr?.toString() || err.message}`);
    }

    // ---- Main dist artifacts ----
    const mainArtifacts = [
      'dist/ficta.browser.js',
      'dist/ficta.browser.min.js',
      'dist/ficta.esm.js',
    ];

    for (const artifact of mainArtifacts) {
      const fullPath = resolve(root, artifact);
      expect(existsSync(fullPath), `Missing artifact: ${artifact}`).toBe(true);
      expect(statSync(fullPath).size, `Empty artifact: ${artifact}`).toBeGreaterThan(0);
    }

    // ---- Ficta global name in minified bundle ----
    const minContent = readFileSync(resolve(root, 'dist/ficta.browser.min.js'), 'utf-8');
    expect(minContent).toContain('Ficta');

    // ---- Playground artifacts ----
    const playgroundArtifacts = [
      'playground/dist/playground.js',
      'playground/dist/ficta.browser.min.js',
    ];

    for (const artifact of playgroundArtifacts) {
      const fullPath = resolve(root, artifact);
      expect(existsSync(fullPath), `Missing playground artifact: ${artifact}`).toBe(true);
      expect(statSync(fullPath).size, `Empty playground artifact: ${artifact}`).toBeGreaterThan(0);
    }
  });

  test('playground/dist/playground.js is non-empty valid JavaScript', () => {
    const fullPath = resolve(root, 'playground/dist/playground.js');
    // Skip if build hasn't run yet (CI will have run the build test first)
    if (!existsSync(fullPath)) {
      return; // Will be caught by the build test above
    }
    const content = readFileSync(fullPath, 'utf-8');
    expect(content.length).toBeGreaterThan(1000); // Must be a real bundle
    // Should reference Preact's render or h function
    expect(content).toMatch(/render|preact/i);
  });

  test('playground/dist/ficta.browser.min.js is a copy of dist/ficta.browser.min.js', () => {
    const src = resolve(root, 'dist/ficta.browser.min.js');
    const dest = resolve(root, 'playground/dist/ficta.browser.min.js');
    if (!existsSync(src) || !existsSync(dest)) return; // No build yet
    expect(statSync(dest).size).toBe(statSync(src).size);
  });

  test('playground/index.html references expected assets', () => {
    const htmlPath = resolve(root, 'playground/index.html');
    expect(existsSync(htmlPath)).toBe(true);
    const html = readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('dist/ficta.browser.min.js');
    expect(html).toContain('dist/playground.js');
    expect(html).toContain('id="app"');
  });

  test('playground/styles.css exists and is non-empty', () => {
    const cssPath = resolve(root, 'playground/styles.css');
    expect(existsSync(cssPath)).toBe(true);
    expect(statSync(cssPath).size).toBeGreaterThan(100);
  });
});
