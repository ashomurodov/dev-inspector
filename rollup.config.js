import terser from '@rollup/plugin-terser'

// Single config with multiple entry points so Rollup can split out the
// shared src/ code into one chunk instead of inlining it three times.
export default {
  input: {
    index: 'index.js',        // auto-init / plain JS entry
    vue:   'vue/index.js',    // Vue 3 wrapper
    react: 'react/index.js',  // React wrapper
  },

  external: ['vue', 'react'],

  output: {
    dir: 'dist',
    format: 'es',
    // All shared src/ code ends up in a single shared chunk
    chunkFileNames: 'core.js',
  },

  plugins: [terser()],
}
