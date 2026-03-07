export interface DevInspectorOptions {
  /**
   * Absolute path to your project root.
   *
   * Only needed when component `__file` paths are **relative**
   * (e.g. `layouts/landing.vue` instead of `/D:/Work/project/layouts/landing.vue`).
   * In most Vite setups `__file` is already absolute, so this can be omitted.
   *
   * @example
   * init({ rootPath: 'D:/Work/my-project' })
   * init({ rootPath: import.meta.env.VITE_PROJECT_ROOT })
   */
  rootPath?: string
}

export interface DevInspectorInstance {
  /** Remove all inspector DOM nodes and event listeners. */
  destroy(): void
}

/**
 * Initialise the dev-inspector manually.
 *
 * Automatically skips mounting when not on localhost / a local IP.
 *
 * @example
 * import { init } from 'aetherx-ui-inspector'
 * init()
 * init({ rootPath: 'D:/Work/my-project' })
 */
export declare function init(options?: DevInspectorOptions): DevInspectorInstance

export default function (): void
