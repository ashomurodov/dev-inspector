import { useEffect, useRef } from 'react'
import { init } from '../src/core.js'

/**
 * React wrapper for dev-inspector.
 *
 * Usage (e.g. in app/layout.jsx or _app.jsx):
 *   import DevInspector from 'dev-inspector/react'
 *   ...
 *   {process.env.NODE_ENV === 'development' && <DevInspector />}
 *   {process.env.NODE_ENV === 'development' && <DevInspector rootPath="/absolute/path/to/project" />}
 */
export default function DevInspector({ rootPath = '' } = {}) {
  const instanceRef = useRef(null)

  useEffect(() => {
    instanceRef.current = init({ rootPath })
    return () => {
      instanceRef.current?.destroy()
    }
  }, [])

  return null
}
