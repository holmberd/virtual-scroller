const esbuild = require('esbuild');

// Build ESM.
esbuild
  .build({
    entryPoints: ['src/index.js'],
    outfile: 'dist/virtual-scroller.esm.js',
    bundle: true,
    sourcemap: true,
    minify: true,
    format: 'esm',
    target: ['es2019']
  })
  .catch(() => process.exit(1));

  // Build CJS.
esbuild
  .build({
    entryPoints: ['src/index.js'],
    outfile: 'dist/virtual-scroller.cjs.js',
    bundle: true,
    sourcemap: true,
    minify: true,
    format: 'cjs',
    target: ['es2019']
  })
  .catch(() => process.exit(1));