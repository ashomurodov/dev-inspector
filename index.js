import { init } from './src/core.js'

// Auto-init: just importing this file is enough.
// Only mounts if NODE_ENV is not 'production'.
// This allows users to import the library in production without worrying about it auto-mounting, while still providing a convenient auto-mounting experience during development.
if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') {
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init())
    } else {
      init()
    }
  }
}

export { init }
