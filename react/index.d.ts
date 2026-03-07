import type { FC } from 'react'

export interface DevInspectorProps {
  /**
   * Absolute path to your project root.
   *
   * Only needed when component file paths are **relative**
   * (e.g. `src/App.jsx` instead of `/D:/Work/project/src/App.jsx`).
   * In most Vite / Next.js setups paths are already absolute, so this can be omitted.
   *
   * Tip: use an env variable so it works across machines:
   * ```jsx
   * <DevInspector rootPath={process.env.NEXT_PUBLIC_PROJECT_ROOT} />
   * ```
   *
   * @example 'D:/Work/my-project'
   * @example '/home/user/my-project'
   */
  rootPath?: string
}

declare const DevInspector: FC<DevInspectorProps>

export default DevInspector
