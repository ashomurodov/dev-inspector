import { defineComponent, onMounted, onUnmounted } from 'vue'
import { init } from '../src/core.js'

/**
 * Vue 3 wrapper for dev-inspector.
 *
 * Usage (e.g. in App.vue or layouts/default.vue):
 *   import DevInspector from 'aetherx-ui-inspector/vue'
 *
 *   <DevInspector v-if="isDev" />
 *   <DevInspector v-if="isDev" root-path="/absolute/path/to/project" />
 */
export default defineComponent({
  name: 'DevInspector',
  props: {
    rootPath: { type: String, default: '' },
  },
  setup(props) {
    let instance = null
    onMounted(() => { instance = init({ rootPath: props.rootPath }) })
    onUnmounted(() => { instance?.destroy() })
    // Inspector mounts directly to <body> — this component renders nothing.
    return () => null
  },
})
