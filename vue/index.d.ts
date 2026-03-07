import type { DefineComponent } from 'vue'

export interface DevInspectorProps {
  /**
   * Absolute path to your project root.
   *
   * Only needed when Vue component `__file` paths are **relative**
   * (e.g. `layouts/landing.vue` instead of `/D:/Work/project/layouts/landing.vue`).
   * In most Vite / Nuxt setups `__file` is already absolute, so this can be omitted.
   *
   * Tip: use an env variable so it works across machines:
   * ```vue
   * <DevInspector :root-path="import.meta.env.VITE_PROJECT_ROOT" />
   * ```
   * ```env
   * # .env.local
   * VITE_PROJECT_ROOT=D:/Work/my-project
   * ```
   *
   * @example 'D:/Work/my-project'
   * @example '/home/user/my-project'
   */
  rootPath?: string
}

declare const DevInspector: DefineComponent<DevInspectorProps>

export default DevInspector
