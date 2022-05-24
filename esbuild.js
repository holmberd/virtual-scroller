const esbuild = require('esbuild');

const commonConfig = {
  bundle: true,
  sourcemap: true,
  minify: true,
  target: ['es2020']
};

// Build ESM.
esbuild
  .build({
    entryPoints: ['src/index.js'],
    outfile: 'dist/virtual-scroller.esm.js',
    format: 'esm',
    ...commonConfig,
  })
  .catch(() => process.exit(1));

// Build CJS.
esbuild
  .build({
    entryPoints: ['src/index.js'],
    outfile: 'dist/virtual-scroller.cjs.js',
    format: 'cjs',
    ...commonConfig,
  })
  .catch(() => process.exit(1));
