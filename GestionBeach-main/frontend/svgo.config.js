module.exports = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Mantener los IDs
          cleanupIds: {
            remove: false,
            minify: false
          },
          // Mantener viewBox
          removeViewBox: false,
        },
      },
    },
    // Remover elementos innecesarios pero mantener paths
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',
    'cleanupAttrs',
    'mergeStyles',
    'inlineStyles',
    'minifyStyles',
    'convertStyleToAttrs',
    'cleanupNumericValues',
    'convertColors',
    'removeUselessDefs',
    'cleanupListOfValues',
    'convertPathData',
    'convertTransform',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'mergePaths',
    'removeUnusedNS',
    'sortAttrs',
    'sortDefsChildren',
    'removeTitle',
    'removeDesc',
  ],
};
