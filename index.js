import { init } from './src/core.js'

// Auto-init: just importing this file is enough.
// Only mounts if NODE_ENV is not 'production'.
console.log('sssssdsss')
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
