<script setup>
/**
 * Vue wrapper for dev-inspector.
 *
 * Usage (e.g. in App.vue or layouts/default.vue):
 *   import DevInspector from 'dev-inspector/vue'
 *   ...
 *   <DevInspector v-if="isDev" />
 *   <DevInspector v-if="isDev" root-path="/absolute/path/to/project" />
 *
 * where: const isDev = import.meta.env.DEV
 */
import { onMounted, onUnmounted } from 'vue'
import { init } from '../src/core.js'

const props = defineProps({
  rootPath: { type: String, default: '' },
})

let instance = null

onMounted(() => {
  instance = init({ rootPath: props.rootPath })
})

onUnmounted(() => {
  instance?.destroy()
})
</script>

<template><!-- dev-inspector mounts directly to body --></template>
