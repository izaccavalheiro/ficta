// Build script for browser bundle
import * as esbuild from 'esbuild';
import { readFileSync, statSync, copyFileSync, mkdirSync, existsSync } from 'fs';

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

    // ---------------------------------------------------------------------------
    // Post-build validation
    // ---------------------------------------------------------------------------
    const artifacts = [
      'dist/ficta.browser.js',
      'dist/ficta.browser.min.js',
      'dist/ficta.esm.js',
    ];

    const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

    console.log('\n📦 Artifact sizes:');
    for (const file of artifacts) {
      const stat = statSync(file);
      const kb = (stat.size / 1024).toFixed(1);
      console.log(`  ${file.padEnd(32)} ${kb.padStart(8)} KB`);
    }

    // Validate minified bundle
    const minContent = readFileSync('dist/ficta.browser.min.js', 'utf-8');
    const minStat = statSync('dist/ficta.browser.min.js');

    if (minStat.size > MAX_BYTES) {
      throw new Error(
        `dist/ficta.browser.min.js exceeds 2 MB (${(minStat.size / 1024 / 1024).toFixed(2)} MB)`
      );
    }

    if (!minContent.includes('Ficta')) {
      throw new Error('dist/ficta.browser.min.js does not contain the "Ficta" global name');
    }

    console.log('\n✓ Post-build validation passed');
    console.log('  - dist/ficta.browser.js (IIFE, unminified)');
    console.log('  - dist/ficta.browser.min.js (IIFE, minified)');
    console.log('  - dist/ficta.esm.js (ES Module)');

    // ---------------------------------------------------------------------------
    // Playground build
    // ---------------------------------------------------------------------------
    console.log('\n🎮 Building playground…');

    // Ensure playground/dist/ exists
    if (!existsSync('playground/dist')) {
      mkdirSync('playground/dist', { recursive: true });
    }

    // Bundle the Preact playground app
    await esbuild.build({
      entryPoints: ['playground/src/app.js'],
      bundle: true,
      outfile: 'playground/dist/playground.js',
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      sourcemap: true,
      minify: true,
      jsx: 'automatic',
      jsxImportSource: 'preact',
    });

    // Copy the Ficta browser bundle into playground/dist/ so the HTML can
    // reference it via a relative path without any server configuration.
    copyFileSync('dist/ficta.browser.min.js', 'playground/dist/ficta.browser.min.js');

    const playgroundStat = statSync('playground/dist/playground.js');
    const playgroundKb = (playgroundStat.size / 1024).toFixed(1);
    console.log(`  playground/dist/playground.js     ${String(playgroundKb).padStart(8)} KB`);
    console.log('  playground/dist/ficta.browser.min.js (copied)');
    console.log('\n✓ Playground built successfully');
    console.log('  Open playground/index.html in a browser to preview.');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
