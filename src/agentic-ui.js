/**
 * Agentic mode UI components:
 *   - Agentic mode toggle button (sparkle icon, next to cog)
 *   - Floating prompt popover (appears near selected element)
 *   - Status panel (bottom-left, shows active agent sessions with live feed)
 */

// ── Agentic mode button (sits above the cog) ─────────────────────────────────

export function createAgenticButton() {
  const btn = document.createElement('button')
  btn.id = '__dev_inspector_agentic_btn__'
  btn.title = 'Agentic Mode — AI-powered changes'
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2l2.09 6.26L20 10.27l-4.91 3.82L16.18 21 12 17.27 7.82 21l1.09-6.91L4 10.27l5.91-2.01z"/>
  </svg>`
  document.body.appendChild(btn)
  return btn
}

// ── Floating prompt popover ───────────────────────────────────────────────────

export function createPromptPopover() {
  const popover = document.createElement('div')
  popover.id = '__dev_inspector_prompt__'
  popover.style.display = 'none'
  popover.innerHTML = `
    <div class="di-prompt-header">
      <span class="di-prompt-element-label"></span>
      <button class="di-prompt-close" title="Cancel">✕</button>
    </div>
    <div class="di-prompt-body">
      <textarea class="di-prompt-input" placeholder="Describe the change you want... (e.g. make it bigger, add hover effect, change color to blue)" rows="3"></textarea>
    </div>
    <div class="di-prompt-footer">
      <span class="di-prompt-hint">AI will edit the source code</span>
      <button class="di-prompt-apply">Apply with Claude</button>
    </div>
  `
  document.body.appendChild(popover)
  return popover
}

export function positionPromptPopover(popover, el) {
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pw = 340
  const ph = 180

  let top = rect.bottom + 12
  let left = rect.left + (rect.width - pw) / 2

  if (top + ph > vh - 20) top = rect.top - ph - 12
  if (left < 12) left = 12
  if (left + pw > vw - 12) left = vw - pw - 12
  if (top < 12) top = 12

  popover.style.left = left + 'px'
  popover.style.top = top + 'px'
}

// ── Status panel (bottom-left floating cards) ─────────────────────────────────

export function createStatusPanel() {
  const panel = document.createElement('div')
  panel.id = '__dev_inspector_agent_status__'
  document.body.appendChild(panel)
  return panel
}

/**
 * Creates a rich session card with activity log and follow-up input.
 */
export function createSessionCard(sessionId, elementSelector) {
  const card = document.createElement('div')
  card.className = 'di-agent-card'
  card.dataset.sessionId = sessionId
  card.innerHTML = `
    <div class="di-agent-card-header">
      <span class="di-agent-element">${escHtml(elementSelector)}</span>
      <span class="di-agent-status di-agent-starting">Starting</span>
      <button class="di-agent-minimize" title="Minimize">─</button>
      <button class="di-agent-cancel" title="Cancel">✕</button>
    </div>
    <div class="di-agent-activity">
      <div class="di-agent-activity-log">
        <div class="di-agent-log-entry di-log-system">
          <span class="di-log-icon">⚡</span>
          <span class="di-log-text">Connecting to Claude...</span>
        </div>
      </div>
    </div>
    <div class="di-agent-followup" style="display:none;">
      <div class="di-agent-followup-wrap">
        <input class="di-agent-followup-input" placeholder="Follow-up instruction..." />
        <button class="di-agent-followup-send" title="Send">→</button>
      </div>
    </div>
  `
  return card
}

// ── Activity log helpers ──────────────────────────────────────────────────────

const TOOL_ICONS = {
  Read: '📄', Edit: '✏️', Write: '📝', Grep: '🔍',
  Glob: '📁', Bash: '⚡', default: '🔧',
}

/**
 * Parses a raw stream-json event into displayable log entry objects.
 * Returns an array of entries (can be multiple per event).
 * Returns empty array if nothing should be shown.
 */
export function parseEventToLogEntry(event) {
  if (!event) return []

  const entries = []

  // Tool use and text events from assistant messages
  if (event.type === 'assistant' && event.message?.content) {
    const content = event.message.content
    for (const block of content) {
      if (block.type === 'tool_use') {
        const tool = block.name || 'tool'
        const input = block.input || {}
        const icon = TOOL_ICONS[tool] || TOOL_ICONS.default
        let text = `${tool}`

        if (tool === 'Read' && input.file_path) {
          text = `Reading ${shortenPath(input.file_path)}`
        } else if (tool === 'Edit' && input.file_path) {
          text = `Editing ${shortenPath(input.file_path)}`
        } else if (tool === 'Write' && input.file_path) {
          text = `Writing ${shortenPath(input.file_path)}`
        } else if (tool === 'Grep' && input.pattern) {
          text = `Searching: "${input.pattern.slice(0, 40)}"`
        } else if (tool === 'Glob' && input.pattern) {
          text = `Finding: ${input.pattern}`
        } else if (tool === 'Bash' && input.command) {
          text = `Running: ${input.command.slice(0, 50)}`
        }

        entries.push({ type: 'tool', icon, text })
      }

      if (block.type === 'text' && block.text) {
        const text = block.text.trim()
        if (text.length > 0) {
          // Show full explanation, truncated to a reasonable length for the card
          entries.push({ type: 'text', icon: '💬', text: text.slice(0, 300) })
        }
      }

      if (block.type === 'thinking' && block.thinking) {
        const preview = block.thinking.trim().slice(0, 120)
        entries.push({ type: 'thinking', icon: '🧠', text: preview || 'Thinking...' })
      }
    }
  }

  // Tool results — only show errors
  if (event.type === 'user' && event.message?.content) {
    for (const block of event.message.content) {
      if (block.type === 'tool_result' && block.is_error) {
        const errText = typeof block.content === 'string'
          ? block.content.slice(0, 80)
          : 'Tool error'
        entries.push({ type: 'error', icon: '⚠️', text: errText })
      }
    }
  }

  // System init
  if (event.type === 'system' && event.subtype === 'init') {
    entries.push({ type: 'system', icon: '⚡', text: 'Claude session started' })
  }

  // Skip 'result' events here — session:complete handles the "Done" entry
  // to avoid duplicates

  return entries
}

/**
 * Adds one or more log entries to a session card's activity log.
 * Accepts a single entry object or an array of entries.
 */
export function addLogEntry(card, entryOrEntries) {
  if (!entryOrEntries) return
  const entries = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries]
  const log = card.querySelector('.di-agent-activity-log')
  if (!log) return

  for (const entry of entries) {
    if (!entry) continue
    const el = document.createElement('div')
    el.className = `di-agent-log-entry di-log-${entry.type}`
    el.innerHTML = `
      <span class="di-log-icon">${entry.icon}</span>
      <span class="di-log-text">${escHtml(entry.text)}</span>
    `
    log.appendChild(el)
  }

  // Auto-scroll to bottom
  const activity = card.querySelector('.di-agent-activity')
  if (activity) activity.scrollTop = activity.scrollHeight
}

/**
 * Updates the status badge on a session card.
 */
export function updateSessionStatus(card, status) {
  const statusEl = card.querySelector('.di-agent-status')
  if (!statusEl) return

  statusEl.classList.remove('di-agent-starting', 'di-agent-running', 'di-agent-done', 'di-agent-error')

  switch (status) {
    case 'starting':
      statusEl.classList.add('di-agent-starting')
      statusEl.textContent = 'Starting'
      break
    case 'running':
      statusEl.classList.add('di-agent-running')
      statusEl.textContent = 'Running'
      break
    case 'done':
      statusEl.classList.add('di-agent-done')
      statusEl.textContent = 'Done'
      // Show follow-up input
      const followup = card.querySelector('.di-agent-followup')
      if (followup) followup.style.display = 'block'
      break
    case 'error':
      statusEl.classList.add('di-agent-error')
      statusEl.textContent = 'Error'
      break
    case 'cancelled':
      statusEl.classList.add('di-agent-error')
      statusEl.textContent = 'Cancelled'
      break
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function shortenPath(filePath) {
  if (!filePath) return 'file'
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : parts.join('/')
}
