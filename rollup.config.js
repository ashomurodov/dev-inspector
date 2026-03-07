import terser from '@rollup/plugin-terser'

export default [
  // Main / auto-init entry — bundles core + all src files
  {
    input: 'index.js',
    output: { file: 'dist/index.js', format: 'es' },
    plugins: [terser()],
  },

  // Vue 3 wrapper — 'vue' stays external (peer dep)
  {
    input: 'vue/index.js',
    external: ['vue'],
    output: { file: 'dist/vue.js', format: 'es' },
    plugins: [terser()],
  },

  // React wrapper — 'react' stays external (peer dep)
  {
    input: 'react/index.js',
    external: ['react'],
    output: { file: 'dist/react.js', format: 'es' },
    plugins: [terser()],
  },
]
