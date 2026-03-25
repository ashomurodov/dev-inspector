/**
 * Agentic mode UI components:
 *   - Agentic mode toggle button (sparkle icon, next to cog)
 *   - Floating prompt popover (appears near selected element)
 *   - Status panel (bottom-left, shows active agent sessions)
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

/**
 * Positions the prompt popover near the target element.
 */
export function positionPromptPopover(popover, el) {
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pw = 340 // popover width
  const ph = 180 // approximate popover height

  // Default: below and centered on element
  let top = rect.bottom + 12
  let left = rect.left + (rect.width - pw) / 2

  // If below would go off-screen, show above
  if (top + ph > vh - 20) {
    top = rect.top - ph - 12
  }
  // Clamp to viewport
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
 * Creates a session card DOM node.
 */
export function createSessionCard(sessionId, elementSelector) {
  const card = document.createElement('div')
  card.className = 'di-agent-card'
  card.dataset.sessionId = sessionId
  card.innerHTML = `
    <div class="di-agent-card-header">
      <span class="di-agent-element">${escHtml(elementSelector)}</span>
      <span class="di-agent-status di-agent-starting">Starting</span>
      <button class="di-agent-cancel" title="Cancel">✕</button>
    </div>
    <div class="di-agent-progress">
      <div class="di-agent-step">Connecting to Claude...</div>
    </div>
  `
  return card
}

/**
 * Updates the step text on a session card.
 */
export function updateSessionStep(card, stepText) {
  const stepEl = card.querySelector('.di-agent-step')
  if (stepEl) stepEl.textContent = stepText
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
