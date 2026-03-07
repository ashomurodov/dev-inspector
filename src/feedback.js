import { buildSelector } from './ui.js'

/**
 * Tracks every change made via the editor.
 * Stores as: { el, selector, property, from, to, timestamp }
 * Deduplicates: if same element + property is changed again, updates the existing entry.
 */
export function createChangeTracker() {
  // Key: `${selector}||${property}` → change entry
  const map = new Map()

  function track(el, property, from, to) {
    const selector = buildSelector(el)
    const key = `${selector}||${property}`

    if (map.has(key)) {
      // Update the "to" value but keep original "from"
      const existing = map.get(key)
      if (existing.from === to) {
        // Reverted to original — remove from log
        map.delete(key)
      } else {
        map.set(key, { ...existing, to, timestamp: Date.now() })
      }
    } else {
      // Only log if actually changed
      if (from !== to) {
        map.set(key, { el, selector, property, from, to, timestamp: Date.now() })
      }
    }
  }

  function getAll() {
    return [...map.values()]
  }

  function count() {
    return map.size
  }

  function clear() {
    // Revert all changes on the DOM
    map.forEach(({ el, property }) => {
      if (el && document.contains(el)) {
        if (property === 'textContent') return // text reverts are complex, skip
        const cameled = camelize(property)
        el.style[cameled] = ''
      }
    })
    map.clear()
  }

  function formatAsText() {
    const changes = getAll()
    if (changes.length === 0) return 'No changes recorded.'

    // Group by element selector
    const grouped = {}
    changes.forEach(({ selector, property, from, to }) => {
      if (!grouped[selector]) grouped[selector] = []
      grouped[selector].push({ property, from, to })
    })

    const lines = [
      '## UI Feedback Summary',
      '',
      `> ${changes.length} change${changes.length === 1 ? '' : 's'} · ${new Date().toLocaleString()}`,
      '',
    ]

    Object.entries(grouped).forEach(([selector, props]) => {
      lines.push(`### \`${selector}\``)
      props.forEach(({ property, from, to }) => {
        lines.push(`- **${property}**: \`${from || '(none)'}\` → \`${to || '(none)'}\``)
      })
      lines.push('')
    })

    return lines.join('\n').trimEnd()
  }

  function remove(el, property) {
    const selector = buildSelector(el)
    const key = `${selector}||${property}`
    map.delete(key)
  }

  return { track, remove, getAll, count, clear, formatAsText }
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      ta.remove()
    }
  }
}

function camelize(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}
