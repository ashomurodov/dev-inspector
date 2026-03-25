import { buildSelector, colorToHex } from './ui.js'
import { getElementStyles, getVueComponent, getReactComponent } from './inspector.js'
import { copyToClipboard } from './feedback.js'

const WS_PORTS = [19854, 19855, 19856, 19857, 19858]
const VSCODE_URI_BASE = 'vscode://dev-inspector.bridge/claude'

/**
 * Builds a rich, detailed prompt from an element + user instruction.
 * Includes everything Claude needs: file path, component info, full computed
 * styles, element context, DOM snippet, and what to preserve.
 */
export function buildAgenticPrompt(el, userInstruction, options = {}) {
  const { rootPath = '', tracker = null } = options

  const selector = buildSelector(el)
  const styles = getElementStyles(el)
  const cs = window.getComputedStyle(el)
  const rect = el.getBoundingClientRect()

  // ── Component info ──────────────────────────────────────────────────────
  const vue = getVueComponent(el)
  const react = getReactComponent(el)
  const comp = vue || react
  const framework = vue ? 'Vue' : react ? 'React' : 'HTML'

  let filePath = null
  let fileLoc = ''
  if (comp?.file) {
    filePath = comp.file
    if (filePath && rootPath && !filePath.startsWith('/') && !/^[A-Za-z]:/.test(filePath)) {
      filePath = `${rootPath}/${filePath}`
    }
    if (react?.line) fileLoc = `:${react.line}${react.col ? `:${react.col}` : ''}`
  }

  // ── Full computed styles ────────────────────────────────────────────────
  const styleProps = [
    'color', 'background-color', 'font-size', 'font-weight', 'font-family',
    'font-style', 'line-height', 'text-align', 'text-decoration', 'text-transform',
    'letter-spacing', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'border-radius', 'border-width', 'border-style', 'border-color',
    'position', 'top', 'right', 'bottom', 'left', 'z-index',
    'display', 'flex-direction', 'justify-content', 'align-items', 'gap', 'overflow',
    'opacity', 'box-shadow', 'object-fit', 'cursor', 'transition', 'transform',
  ]
  const computedStyles = {}
  styleProps.forEach(prop => {
    const val = cs.getPropertyValue(prop).trim()
    if (val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== '0px'
        && val !== 'static' && val !== 'visible' && val !== 'start') {
      computedStyles[prop] = val
    }
  })

  // Always include these even if "default"
  computedStyles['display'] = cs.display
  computedStyles['width'] = cs.width
  computedStyles['height'] = cs.height

  // ── Element context ─────────────────────────────────────────────────────
  const tag = el.tagName.toLowerCase()
  const parentEl = el.parentElement
  const parentTag = parentEl ? parentEl.tagName.toLowerCase() : null
  const parentClasses = parentEl
    ? [...parentEl.classList].filter(c => !c.startsWith('di-') && !c.startsWith('__dev')).slice(0, 2).join('.')
    : ''
  const parentDisplay = parentEl ? window.getComputedStyle(parentEl).display : null
  const childCount = el.children.length
  const siblingCount = parentEl ? parentEl.children.length : 0

  // Direct text content
  const textContent = [...el.childNodes]
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 100) || null

  // Truncated outerHTML for structural context
  let htmlSnippet = el.outerHTML
  if (htmlSnippet.length > 2000) {
    htmlSnippet = htmlSnippet.slice(0, 2000) + '\n<!-- ... truncated -->'
  }

  // ── Ancestor chain (up to 3 levels) ─────────────────────────────────────
  const ancestors = []
  let node = el.parentElement
  for (let i = 0; i < 3 && node && node !== document.body; i++) {
    const aTag = node.tagName.toLowerCase()
    const aCls = [...node.classList]
      .filter(c => !c.startsWith('di-') && !c.startsWith('__dev'))
      .slice(0, 2).map(c => `.${c}`).join('')
    const aDisplay = window.getComputedStyle(node).display
    ancestors.push(`${aTag}${aCls} (display: ${aDisplay})`)
    node = node.parentElement
  }

  // ── Viewport position description ───────────────────────────────────────
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const vPos = cy < vh / 3 ? 'top' : cy > vh * 2 / 3 ? 'bottom' : 'middle'
  const hPos = cx < vw / 3 ? 'left' : cx > vw * 2 / 3 ? 'right' : 'center'
  const viewportPos = `${vPos}-${hPos}`

  // ── Pending tracked changes ─────────────────────────────────────────────
  let pendingChanges = 'None'
  if (tracker && tracker.count() > 0) {
    pendingChanges = tracker.formatAsText()
  }

  // ── Build the prompt ────────────────────────────────────────────────────
  const lines = [
    `You are editing a UI component. The user wants: "${userInstruction}"`,
    '',
    '## Target Element',
    `- **Selector:** \`${selector}\``,
    `- **Tag:** \`<${tag}>\``,
  ]

  if (comp) {
    lines.push(`- **Component:** \`<${comp.name}>\` (${framework})`)
  }
  if (filePath) {
    lines.push(`- **File:** \`${filePath}${fileLoc}\``)
  }
  lines.push(`- **Viewport position:** ${viewportPos}`)
  lines.push(`- **Rendered size:** ${Math.round(rect.width)}px x ${Math.round(rect.height)}px`)

  if (textContent) {
    lines.push(`- **Text content:** "${textContent}"`)
  }

  lines.push('')
  lines.push('## Current Computed Styles')
  lines.push('```')
  Object.entries(computedStyles).forEach(([prop, val]) => {
    lines.push(`${prop}: ${val}`)
  })
  lines.push('```')

  lines.push('')
  lines.push('## Element Context')
  if (parentTag) {
    lines.push(`- **Parent:** \`${parentTag}${parentClasses ? '.' + parentClasses : ''}\` (display: ${parentDisplay})`)
  }
  lines.push(`- **Children:** ${childCount} direct children`)
  lines.push(`- **Siblings:** ${siblingCount - 1} siblings`)

  if (ancestors.length > 0) {
    lines.push('')
    lines.push('### Ancestor Chain')
    ancestors.forEach((a, i) => {
      lines.push(`${i + 1}. \`${a}\``)
    })
  }

  lines.push('')
  lines.push('## HTML Structure')
  lines.push('```html')
  lines.push(htmlSnippet)
  lines.push('```')

  lines.push('')
  lines.push('## What to Change')
  lines.push(userInstruction)

  lines.push('')
  lines.push('## What to Preserve')
  lines.push('- Keep the existing layout structure intact unless the change requires modifying it')
  lines.push('- Preserve all functionality and event handlers')
  lines.push('- Maintain responsive behavior')
  lines.push('- Keep existing class names and component structure')
  lines.push('- Only modify styles/markup needed for the requested change')
  lines.push('- Do not remove or rename existing CSS classes')

  if (pendingChanges !== 'None') {
    lines.push('')
    lines.push('## Pending Visual Changes (already applied in browser, preserve these)')
    lines.push(pendingChanges)
  }

  return lines.join('\n')
}

/**
 * Generates a `claude` CLI command string from the prompt.
 */
export function buildClaudeCommand(prompt, cwd) {
  // Escape single quotes for shell
  const escaped = prompt.replace(/'/g, "'\\''")
  const cdPart = cwd ? `cd '${cwd}' && ` : ''
  return `${cdPart}claude '${escaped}'`
}

// ── WebSocket Client ──────────────────────────────────────────────────────────

/**
 * Manages WebSocket connection to the VS Code extension bridge.
 */
export function createAgenticClient() {
  let ws = null
  let connected = false
  let currentPort = null
  const sessions = new Map() // sessionId -> { status, steps[], onUpdate }
  const listeners = new Set() // global event listeners

  function emit(event) {
    listeners.forEach(fn => fn(event))
  }

  async function connect() {
    if (connected && ws?.readyState === WebSocket.OPEN) return true

    for (const port of WS_PORTS) {
      try {
        const result = await tryConnect(port)
        if (result) return true
      } catch { /* try next port */ }
    }
    return false
  }

  function tryConnect(port) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.close()
        resolve(false)
      }, 2000)

      const socket = new WebSocket(`ws://localhost:${port}`)

      socket.onopen = () => {
        clearTimeout(timeout)
        ws = socket
        connected = true
        currentPort = port
        emit({ type: 'connected', port })
        resolve(true)
      }

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          handleMessage(msg)
        } catch { /* ignore malformed */ }
      }

      socket.onclose = () => {
        connected = false
        ws = null
        emit({ type: 'disconnected' })
        // Attempt reconnection for active sessions
        if (sessions.size > 0) {
          setTimeout(() => connect(), 3000)
        }
      }

      socket.onerror = () => {
        clearTimeout(timeout)
        socket.close()
        resolve(false)
      }
    })
  }

  function handleMessage(msg) {
    const session = msg.sessionId ? sessions.get(msg.sessionId) : null

    switch (msg.type) {
      case 'session:started':
        if (session) {
          session.status = 'running'
          emit({ type: 'session:started', sessionId: msg.sessionId })
        }
        break

      case 'session:progress':
        if (session) {
          // Parse the Claude stream event
          const step = parseProgressEvent(msg.event)
          if (step) {
            session.steps.push(step)
            emit({ type: 'session:progress', sessionId: msg.sessionId, step })
          }
        }
        break

      case 'session:complete':
        if (session) {
          session.status = 'done'
          emit({ type: 'session:complete', sessionId: msg.sessionId, summary: msg.summary })
        }
        break

      case 'session:error':
        if (session) {
          session.status = 'error'
          session.error = msg.error
          emit({ type: 'session:error', sessionId: msg.sessionId, error: msg.error })
        }
        break

      case 'pong':
        break
    }
  }

  function parseProgressEvent(event) {
    if (!event) return null
    if (event.type === 'tool_use') {
      const toolName = event.tool || event.name || 'tool'
      const input = event.input || {}
      // Create a readable step description
      if (toolName === 'Read') return `Reading ${input.file_path?.split('/').pop() || 'file'}...`
      if (toolName === 'Edit') return `Editing ${input.file_path?.split('/').pop() || 'file'}...`
      if (toolName === 'Write') return `Writing ${input.file_path?.split('/').pop() || 'file'}...`
      if (toolName === 'Bash') return `Running command...`
      if (toolName === 'Grep') return `Searching for "${(input.pattern || '').slice(0, 30)}"...`
      if (toolName === 'Glob') return `Finding files...`
      return `${toolName}...`
    }
    if (event.type === 'assistant' && event.subtype === 'text') {
      const text = (event.content || '').slice(0, 80)
      return text || null
    }
    if (event.type === 'result') {
      return 'Completed'
    }
    return null
  }

  function startSession(sessionId, prompt, cwd, elementSelector) {
    sessions.set(sessionId, {
      status: 'starting',
      steps: [],
      elementSelector,
      error: null,
    })

    if (connected && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'session:start',
        sessionId,
        prompt,
        cwd,
        elementSelector,
      }))
    }

    // Trigger VS Code extension activation via URI
    const uri = `${VSCODE_URI_BASE}?sessionId=${encodeURIComponent(sessionId)}&wsPort=${currentPort || WS_PORTS[0]}`
    window.open(uri)
  }

  function cancelSession(sessionId) {
    if (connected && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'session:cancel', sessionId }))
    }
    const session = sessions.get(sessionId)
    if (session) session.status = 'cancelled'
    emit({ type: 'session:cancelled', sessionId })
  }

  function removeSession(sessionId) {
    sessions.delete(sessionId)
    emit({ type: 'session:removed', sessionId })
  }

  function onEvent(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  function getSession(sessionId) {
    return sessions.get(sessionId) || null
  }

  function getAllSessions() {
    return [...sessions.entries()].map(([id, s]) => ({ id, ...s }))
  }

  function isConnected() {
    return connected && ws?.readyState === WebSocket.OPEN
  }

  function disconnect() {
    if (ws) {
      ws.close()
      ws = null
    }
    connected = false
    sessions.clear()
  }

  return {
    connect,
    startSession,
    cancelSession,
    removeSession,
    onEvent,
    getSession,
    getAllSessions,
    isConnected,
    disconnect,
  }
}

/**
 * Attempts to send prompt to the VS Code extension via WebSocket.
 * Falls back to clipboard copy if extension is unavailable.
 * Returns { method: 'extension' | 'clipboard', sessionId? }
 */
export async function sendToAgent(client, el, userInstruction, options = {}) {
  const { rootPath = '', tracker = null, cwd = '' } = options
  const prompt = buildAgenticPrompt(el, userInstruction, { rootPath, tracker })
  const sessionId = crypto.randomUUID()
  const selector = buildSelector(el)

  // Try WebSocket connection first
  const isConnected = client.isConnected() || await client.connect()

  if (isConnected) {
    client.startSession(sessionId, prompt, cwd, selector)
    return { method: 'extension', sessionId }
  }

  // Fallback: copy claude command to clipboard
  const command = buildClaudeCommand(prompt, cwd)
  const ok = await copyToClipboard(command)
  return { method: 'clipboard', copied: ok, command }
}
