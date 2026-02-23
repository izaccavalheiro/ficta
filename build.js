// Build script for browser bundle
import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

async function build() {
  try {
    // Build for browser with Faker bundled
    await esbuild.build({
      entryPoints: ['src/browser.js'],
      bundle: true,
      outfile: 'dist/ficta.browser.js',
      format: 'iife',
      globalName: 'Ficta',
      platform: 'browser',
      target: ['es2020'],
      sourcemap: true,
      minify: false,
      banner: {
        js: `// Ficta v${pkg.version} - Browser Bundle\n// ${pkg.homepage}\n`
      }
    });

    // Build minified version
    await esbuild.build({
      entryPoints: ['src/browser.js'],
      bundle: true,
      outfile: 'dist/ficta.browser.min.js',
      format: 'iife',
      globalName: 'Ficta',
      platform: 'browser',
      target: ['es2020'],
      sourcemap: true,
      minify: true,
      banner: {
        js: `// Ficta v${pkg.version} - Browser Bundle\n// ${pkg.homepage}\n`
      }
    });

    // Build ES module version for modern browsers
    await esbuild.build({
      entryPoints: ['src/browser.js'],
      bundle: true,
      outfile: 'dist/ficta.esm.js',
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      sourcemap: true,
      minify: false
    });

    console.log('✓ Browser bundles built successfully!');
    console.log('  - dist/ficta.browser.js (IIFE, unminified)');
    console.log('  - dist/ficta.browser.min.js (IIFE, minified)');
    console.log('  - dist/ficta.esm.js (ES Module)');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
