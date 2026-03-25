import { injectStyles, createCogButton, createOverlay, createTooltip, createPanel, createBoxModelOverlay, updateOverlay, showCopiedFlash, createHoverOverlay, updateHoverOverlay, createSpacingOverlay, hideSpacing, updateSpacing, buildSelector } from './ui.js'
import { isInspectorElement, getElementStyles, getVueComponent, getReactComponent, renderTooltip, updateBoxModel, hideBoxModel } from './inspector.js'
import { renderEditPanel, captureOriginals } from './editor.js'
import { createChangeTracker, copyToClipboard } from './feedback.js'
import { createAgenticClient, sendToAgent } from './agentic.js'
import { createAgenticButton, createPromptPopover, positionPromptPopover, createStatusPanel, createSessionCard, updateSessionStatus, parseEventToLogEntry, addLogEntry } from './agentic-ui.js'

const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(location.hostname)
  || location.hostname.endsWith('.local')
  || /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname) // any IP (dev servers)

export function init(options = {}) {
  const rootPath = options?.rootPath ? options.rootPath.replace(/[\\/]$/, '') : ''
  if (document.getElementById('__dev_inspector__')) return

  injectStyles()

  const cog      = createCogButton()
  const overlay  = createOverlay()
  const tooltip  = createTooltip()
  const panel    = createPanel()
  const bm             = createBoxModelOverlay()
  const hoverOverlay   = createHoverOverlay()
  const spacingContainer = createSpacingOverlay()
  const tracker        = createChangeTracker()
  const agenticBtn     = createAgenticButton()
  const promptPopover  = createPromptPopover()
  const statusPanel    = createStatusPanel()
  const agenticClient  = createAgenticClient()

  let inspecting        = false
  let panelOpen         = false
  let selectedEl        = null
  let selectedOriginals = null
  let textEditCleanup   = () => {}
  let isCollapsed       = false
  let activeTab         = 'element'
  let selectionContext      = null  // parent element defining the current drill depth
  let lastContextualHover  = null  // last element shown in hover — used to drive click
  let aKeyHeld             = false // A key held — show style tooltip on selected element
  let lastMousePos         = { x: 0, y: 0 } // last known mouse position for keydown-triggered tooltip
  let agenticMode          = false // agentic selection mode active
  let agenticHoverEl       = null  // element currently highlighted in agentic mode
  let agenticHoverOverlay  = null  // purple hover overlay for agentic mode

  // ── Class stylesheet (for Class tab mode) ─────────────────────────────────
  let classRules   = {}
  let classStyleEl = null

  function getClassStyle() {
    if (!classStyleEl) {
      classStyleEl = document.createElement('style')
      classStyleEl.id = '__dev_inspector_class_rules__'
      document.head.appendChild(classStyleEl)
    }
    return classStyleEl
  }

  function setClassRule(cls, prop, val) {
    if (!classRules[cls]) classRules[cls] = {}
    classRules[cls][prop] = val
    rebuildClassSheet()
  }

  function removeClassRule(cls, prop) {
    if (!classRules[cls]) return
    delete classRules[cls][prop]
    if (!Object.keys(classRules[cls]).length) delete classRules[cls]
    rebuildClassSheet()
  }

  function rebuildClassSheet() {
    getClassStyle().textContent = Object.entries(classRules)
      .map(([cls, props]) => {
        const rules = Object.entries(props).map(([p, v]) => `  ${p}: ${v} !important;`).join('\n')
        return `.${cls} {\n${rules}\n}`
      }).join('\n')
  }

  function resolveAbsPath(filePath) {
    if (!filePath) return null
    if (filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath)) return filePath
    if (rootPath) return `${rootPath}/${filePath}`
    return filePath
  }

  function getSelectedClass(el) {
    if (!el) return null
    return [...el.classList].find(c => !c.startsWith('di-') && !c.startsWith('__dev')) || null
  }

  // Returns the direct child of selectionContext that contains `target`
  function getChildInContext(target) {
    if (!selectionContext) return null
    let node = target
    while (node && node !== document.documentElement) {
      if (node.parentElement === selectionContext) return node
      node = node.parentElement
    }
    return null
  }

  // The single source of truth for "what element should be acted on at cursor position".
  // Respects the current drill depth (selectionContext):
  //   • Inside context   → returns the direct child of context containing el
  //   • el IS context or an ancestor of context → returns el directly (back-navigation)
  //   • No context / outside → parent-first (one level up from deepest)
  function getContextualTarget(el) {
    if (selectionContext) {
      if (el !== selectionContext && selectionContext.contains(el)) {
        // el is inside context: snap to context-level child
        return getChildInContext(el) || el
      }
      if (el === selectionContext || el.contains(selectionContext)) {
        // el IS the context or an ancestor of it: allow direct back-navigation
        return el
      }
    }
    // No context or click landed outside the context+ancestor chain: parent-first
    const p = el.parentElement
    return (p && !isInspectorElement(p) && p !== document.body) ? p : el
  }

  // ── Body margin sync (panel pushes page instead of covering it) ────────────
  document.body.style.transition = 'margin-right 0.22s cubic-bezier(.4,0,.2,1)'

  function syncBodyMargin() {
    if (!panelOpen) {
      document.body.style.marginRight = ''
      return
    }
    const width = isCollapsed ? 40 : panel.offsetWidth
    document.body.style.marginRight = width + 'px'
  }

  // Hides hover overlay and resets selected badge back to its default top position
  function hideHoverOverlay() {
    hoverOverlay.style.display = 'none'
    const selBadge = overlay.querySelector('.di-overlay-badge')
    if (selBadge) {
      selBadge.style.top = '-22px'
      selBadge.style.borderRadius = '4px 4px 0 0'
    }
  }

  // Repositions both badges so they never collide when elements are above/below each other
  function repositionBadges(hovEl) {
    if (!selectedEl || !hovEl) return
    const sR = selectedEl.getBoundingClientRect()
    const hR = hovEl.getBoundingClientRect()
    const hovAbove = (hR.top + hR.bottom) / 2 < (sR.top + sR.bottom) / 2

    const hovBadge = hoverOverlay.querySelector('.di-overlay-badge')
    if (hovBadge) {
      hovBadge.style.top          = hovAbove ? '-22px'              : 'calc(100% + 2px)'
      hovBadge.style.borderRadius = hovAbove ? '4px 4px 0 0'        : '0 0 4px 4px'
    }
    const selBadge = overlay.querySelector('.di-overlay-badge')
    if (selBadge) {
      selBadge.style.top          = hovAbove ? 'calc(100% + 2px)'   : '-22px'
      selBadge.style.borderRadius = hovAbove ? '0 0 4px 4px'        : '4px 4px 0 0'
    }
  }

  // Animates overlay position updates over `ms` to cover CSS transition duration
  function animateOverlayUpdate(ms = 260) {
    if (!selectedEl) return
    const end = performance.now() + ms
    const tick = () => {
      if (selectedEl) { updateOverlay(overlay, selectedEl); updateBoxModel(bm, selectedEl) }
      if (performance.now() < end) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  // ── State helpers ──────────────────────────────────────────────────────────

  function openPanel() {
    panelOpen = true
    panel.classList.add('open')
    syncBodyMargin()
    animateOverlayUpdate()
  }

  function closePanel() {
    panelOpen = false
    panel.classList.remove('open')
    selectedEl = null
    selectedOriginals = null
    activeTab = 'element'
    selectionContext     = null
    lastContextualHover = null
    aKeyHeld            = false
    overlay.style.display = 'none'
    hideHoverOverlay()
    hideSpacing(spacingContainer)
    setElementBar(null)
    stopInspect(true)
    syncBodyMargin()
  }

  function startInspect() {
    inspecting = true
    cog.classList.add('active')
    document.body.classList.add('di-inspect-mode')
    hideHoverOverlay()
    hideSpacing(spacingContainer)
    // Mark re-inspect button as active if panel is open
    const reinspectBtn = document.getElementById('di-reinspect-btn')
    if (reinspectBtn) reinspectBtn.classList.add('active')
  }

  function stopInspect(clearSelected = false) {
    inspecting = false
    cog.classList.remove('active')
    document.body.classList.remove('di-inspect-mode')
    tooltip.style.display = 'none'
    hideBoxModel(bm)

    const reinspectBtn = document.getElementById('di-reinspect-btn')
    if (reinspectBtn) reinspectBtn.classList.remove('active')

    if (clearSelected || !selectedEl) {
      overlay.style.display = 'none'
      overlay.classList.remove('selected')
    } else {
      // Re-show box model for the still-selected element
      updateBoxModel(bm, selectedEl)
    }
  }

  function selectElement(el) {
    lastContextualHover = null  // clear stale hover so subsequent clicks recompute fresh
    textEditCleanup()
    activeTab = 'element'
    hideHoverOverlay()
    hideSpacing(spacingContainer)

     // Stop inspect mode without hiding the selected-element overlay
    inspecting = false
    cog.classList.remove('active')
    document.body.classList.remove('di-inspect-mode')
    tooltip.style.display = 'none'
    const reinspectBtn = document.getElementById('di-reinspect-btn')
    if (reinspectBtn) reinspectBtn.classList.remove('active')

    selectedEl = el
    selectedOriginals = captureOriginals(el)

    // Show green border overlay + box model on selected element
    overlay.classList.remove('selected')
    overlay.classList.add('selected')
    updateOverlay(overlay, el)
    updateBoxModel(bm, el)

    // Update element bar
    setElementBar(el)

    renderPanel(el)
    openPanel()
  }

  function setElementBar(el) {
    const bar = document.getElementById('di-element-bar')
    const label = document.getElementById('di-element-label')
    if (!bar || !label) return
    if (!el) {
      bar.style.display = 'none'
      label.textContent = ''
      updateTabRow(null)
      updateVueBar(null)
      return
    }
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = [...el.classList]
      .filter(c => !c.startsWith('di-') && !c.startsWith('__dev'))
      .slice(0, 2)
      .map(c => `.${c}`)
      .join('')
    label.textContent = `${tag}${id}${cls}`
    bar.style.display = 'flex'
    updateTabRow(el)
    updateVueBar(el)
  }

  function updateTabRow(el) {
    const tabRow   = document.getElementById('di-tab-row')
    const classTab = document.getElementById('di-tab-class')
    const classLabel = document.getElementById('di-tab-class-label')
    if (!tabRow) return
    if (!el) { tabRow.style.display = 'none'; return }
    tabRow.style.display = 'flex'
    const cls = getSelectedClass(el)
    if (classLabel) classLabel.textContent = cls ? `.${cls}` : 'No class'
    if (classTab) classTab.disabled = !cls
    document.getElementById('di-tab-element')?.classList.toggle('active', activeTab === 'element')
    classTab?.classList.toggle('active', activeTab === 'class')
  }

  function updateVueBar(el) {
    const bar       = document.getElementById('di-vue-bar')
    const nameEl    = document.getElementById('di-vue-comp-name')
    const iconEl    = document.getElementById('di-vue-icon')
    const vscodeBtn = document.getElementById('di-vscode-btn')
    if (!bar) return

    const vue   = el ? getVueComponent(el) : null
    const react = el ? getReactComponent(el) : null
    const comp  = vue || react

    if (!comp) { bar.style.display = 'none'; return }
    bar.style.display = 'flex'

    // Icon: ⚛ for React, ⬡ for Vue
    if (iconEl) iconEl.textContent = react ? '⚛' : '⬡'

    if (nameEl) nameEl.textContent = `<${comp.name}>`

    if (vscodeBtn) {
      let fileTarget = null
      if (vue) {
        // vInspector = "relative/path.vue:line:col" (from vite-plugin-vue-inspector)
        // vue.file   = absolute path (from __file, set by @vitejs/plugin-vue)
        const vInspector = el.closest?.('[data-v-inspector]')?.dataset?.vInspector
        const absFile = resolveAbsPath(vue.file)
        if (vInspector) {
          const match = vInspector.match(/^(.*):(\d+):(\d+)$/)
          if (match && absFile) {
            fileTarget = `vscode://file/${absFile}:${match[2]}:${match[3]}`
          } else if (absFile) {
            fileTarget = `vscode://file/${absFile}`
          } else {
            fileTarget = `vscode://file/${vInspector}`
          }
        } else if (absFile) {
          fileTarget = `vscode://file/${absFile}`
        }
      } else if (react?.file) {
        const absFile = resolveAbsPath(react.file)
        const loc = react.line ? `:${react.line}${react.col ? `:${react.col}` : ''}` : ''
        fileTarget = `vscode://file/${absFile}${loc}`
      }

      if (isLocalhost && fileTarget) {
        vscodeBtn.style.display = 'flex'
        vscodeBtn.dataset.href = fileTarget
      } else {
        vscodeBtn.style.display = 'none'
        delete vscodeBtn.dataset.href
      }
    }
  }

  function renderPanel(el) {
    textEditCleanup()
    const content = document.getElementById('di-panel-content')
    const footer  = document.getElementById('di-panel-footer')

    if (!el) {
      content.innerHTML = `
        <div class="di-panel-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>Click any element on the page to inspect and edit it</p>
        </div>`
      if (footer) footer.style.display = 'none'
      return
    }

    if (footer) footer.style.display = 'flex'
    updateFeedbackCount()

    const cls = getSelectedClass(el)
    const isClassMode = activeTab === 'class' && !!cls
    const applyStyle = isClassMode
      ? (prop, val) => setClassRule(cls, prop, val)
      : (prop, val) => el.style.setProperty(prop, val)
    const clearStyle = isClassMode
      ? (prop) => removeClassRule(cls, prop)
      : (prop) => el.style.removeProperty(prop)

    textEditCleanup = renderEditPanel(
      content,
      el,
      selectedOriginals,
      // onChange
      (el, prop, from, to) => {
        tracker.track(el, prop, from, to)
        updateFeedbackCount()
        if (selectedEl) { updateOverlay(overlay, selectedEl); updateBoxModel(bm, selectedEl) }
      },
      // onReset
      (el, prop, restoredVal) => {
        tracker.remove(el, prop)
        updateFeedbackCount()
        if (selectedEl) { updateOverlay(overlay, selectedEl); updateBoxModel(bm, selectedEl) }
      },
      { applyStyle, clearStyle }
    )
  }

  let changesLogOpen = false

  function updateFeedbackCount() {
    const count = tracker.count()
    const countEl  = document.getElementById('di-feedback-count')
    const toggleEl = document.getElementById('di-changes-toggle')
    const arrowEl  = document.getElementById('di-toggle-arrow')

    if (countEl) {
      countEl.textContent = count > 0
        ? `${count} change${count === 1 ? '' : 's'} tracked`
        : 'No changes yet'
    }
    if (toggleEl) toggleEl.classList.toggle('has-changes', count > 0)

    // Re-render log content if it's currently open
    if (changesLogOpen) renderChangesLog()

    // Close log automatically if all changes cleared
    if (count === 0 && changesLogOpen) {
      changesLogOpen = false
      const log = document.getElementById('di-changes-log')
      if (log) log.style.display = 'none'
      if (arrowEl) arrowEl.classList.remove('open')
    }
  }

  function renderChangesLog() {
    const list = document.getElementById('di-changes-list')
    if (!list) return

    const changes = tracker.getAll()
    if (changes.length === 0) { list.innerHTML = ''; return }

    // Group by selector
    const grouped = {}
    changes.forEach(({ selector, property, from, to }) => {
      if (!grouped[selector]) grouped[selector] = []
      grouped[selector].push({ property, from, to })
    })

    list.innerHTML = Object.entries(grouped).map(([selector, props]) => `
      <div class="di-change-group">
        <div class="di-change-selector">${selector}</div>
        ${props.map(({ property, from, to }) => `
          <div class="di-change-row">
            <span class="di-change-prop">${property}</span>
            <span class="di-change-from">${from || '—'}</span>
            <span class="di-change-arrow">→</span>
            <span class="di-change-to">${to || '—'}</span>
          </div>`).join('')}
      </div>`).join('')
  }

  // ── Cog button ─────────────────────────────────────────────────────────────
  cog.addEventListener('click', () => {
    if (panelOpen) {
      closePanel()
    } else {
      openPanel()
      startInspect()
    }
  })

  // ── Panel close button ─────────────────────────────────────────────────────
  document.getElementById('di-close-panel')?.addEventListener('click', closePanel)

  // ── Help modal ─────────────────────────────────────────────────────────────
  document.getElementById('di-help-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('di-help-modal')
    if (modal) modal.style.display = 'flex'
  })
  document.getElementById('di-help-close')?.addEventListener('click', () => {
    const modal = document.getElementById('di-help-modal')
    if (modal) modal.style.display = 'none'
  })

  // ── Fix 2: Re-inspect button ───────────────────────────────────────────────
  document.getElementById('di-reinspect-btn')?.addEventListener('click', () => {
    if (inspecting) {
      stopInspect()
    } else {
      startInspect()
    }
  })

  // ── VS Code link ───────────────────────────────────────────────────────────
  document.getElementById('di-vscode-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('di-vscode-btn')
    const href = btn?.dataset?.href
    if (href) window.open(href)
  })

  // ── Mode tabs ──────────────────────────────────────────────────────────────
  document.getElementById('di-tab-element')?.addEventListener('click', () => {
    if (activeTab === 'element') return
    activeTab = 'element'
    updateTabRow(selectedEl)
    if (selectedEl) renderPanel(selectedEl)
  })

  document.getElementById('di-tab-class')?.addEventListener('click', () => {
    if (activeTab === 'class' || !getSelectedClass(selectedEl)) return
    activeTab = 'class'
    updateTabRow(selectedEl)
    if (selectedEl) renderPanel(selectedEl)
  })

  // ── Collapse toggle ────────────────────────────────────────────────────────
  document.getElementById('di-collapse-btn')?.addEventListener('click', () => {
    isCollapsed = !isCollapsed
    panel.classList.toggle('collapsed', isCollapsed)
    syncBodyMargin()
    animateOverlayUpdate()
  })

  // ── Resize handle (drag left edge to resize panel width) ───────────────────
  const resizeHandle = document.getElementById('di-resize-handle')
  if (resizeHandle) {
    let isResizing = false
    let resizeStartX = 0
    let resizeStartWidth = 0

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true
      resizeStartX = e.clientX
      resizeStartWidth = panel.offsetWidth
      resizeHandle.classList.add('dragging')
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
      e.preventDefault()
    })

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return
      const dx = resizeStartX - e.clientX // drag left = wider
      const newWidth = Math.min(580, Math.max(220, resizeStartWidth + dx))
      panel.style.width = newWidth + 'px'
      syncBodyMargin()
      if (selectedEl) { updateOverlay(overlay, selectedEl); updateBoxModel(bm, selectedEl) }
    })

    document.addEventListener('mouseup', () => {
      if (!isResizing) return
      isResizing = false
      resizeHandle.classList.remove('dragging')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    })
  }

  // ── Mouse wheel on changes log ────────────────────────────────────────────
  panel.addEventListener('wheel', (e) => {
    const log = document.getElementById('di-changes-log')
    if (log && log.contains(e.target) && log.style.display !== 'none') {
      log.scrollTop += e.deltaY
      e.stopPropagation()
      e.preventDefault()
      return
    }
  }, { passive: false, capture: true })

  // ── Mouse wheel scroll ────────────────────────────────────────────────────
  // #di-panel-content is the direct flex child that scrolls.
  // We intercept wheel on the whole panel and drive scrollTop manually so
  // the event never reaches the page underneath.
  panel.addEventListener('wheel', (e) => {
    const content = document.getElementById('di-panel-content')
    if (!content) return
    content.scrollTop += e.deltaY
    e.stopPropagation()
    e.preventDefault()
  }, { passive: false })

  // ── Changes log toggle (Fix 3) ─────────────────────────────────────────────
  document.getElementById('di-changes-toggle')?.addEventListener('click', () => {
    if (tracker.count() === 0) return
    changesLogOpen = !changesLogOpen
    const log   = document.getElementById('di-changes-log')
    const arrow = document.getElementById('di-toggle-arrow')
    if (log)   log.style.display = changesLogOpen ? 'block' : 'none'
    if (arrow) arrow.classList.toggle('open', changesLogOpen)
    if (changesLogOpen) renderChangesLog()
  })

  // ── Copy feedback ──────────────────────────────────────────────────────────
  document.getElementById('di-copy-feedback')?.addEventListener('click', async () => {
    const text = tracker.formatAsText()
    const ok = await copyToClipboard(text)
    showCopiedFlash(ok ? 'Feedback copied to clipboard!' : 'Copy failed — check browser permissions')
  })

  // ── Clear changes ──────────────────────────────────────────────────────────
  document.getElementById('di-clear-changes')?.addEventListener('click', () => {
    tracker.clear()
    updateFeedbackCount()
    if (selectedEl) renderPanel(selectedEl)
  })

  // ── Mouse move: hover highlight ────────────────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    if (!inspecting) return
    const el = e.target
    if (isInspectorElement(el)) {
      if (!selectedEl) overlay.style.display = 'none'
      tooltip.style.display = 'none'
      hideBoxModel(bm)
      lastContextualHover = null
      return
    }
    // Ctrl held: show exact element (depth cheat code), otherwise respect level
    const hoverTarget = e.ctrlKey ? el : getContextualTarget(el)
    lastContextualHover = hoverTarget
    lastMousePos = { x: e.clientX, y: e.clientY }
    overlay.classList.remove('selected')
    updateOverlay(overlay, hoverTarget)
    updateBoxModel(bm, hoverTarget)
    const styles = getElementStyles(hoverTarget)
    renderTooltip(tooltip, styles, e.clientX, e.clientY)
  })

  // ── Hover while selected: spacing + tooltip on self ──────────────────────
  document.addEventListener('mousemove', (e) => {
    if (inspecting || !selectedEl) {
      if (hoverOverlay.style.display !== 'none') {
        hideHoverOverlay()
        hideSpacing(spacingContainer)
      }
      if (!inspecting) tooltip.style.display = 'none'
      return
    }
    const el = e.target
    if (isInspectorElement(el)) {
      hideHoverOverlay()
      hideSpacing(spacingContainer)
      tooltip.style.display = 'none'
      lastContextualHover = null
      return
    }
    // Ctrl held: bypass depth, show exact element
    const hoverTarget = e.ctrlKey ? el : getContextualTarget(el)
    lastContextualHover = hoverTarget
    lastMousePos = { x: e.clientX, y: e.clientY }
    if (hoverTarget === selectedEl) {
      hideHoverOverlay()
      hideSpacing(spacingContainer)
      if (aKeyHeld) {
        const styles = getElementStyles(hoverTarget)
        renderTooltip(tooltip, styles, e.clientX, e.clientY)
      } else {
        tooltip.style.display = 'none'
      }
      return
    }
    updateHoverOverlay(hoverOverlay, hoverTarget)
    if (e.altKey) {
      updateSpacing(spacingContainer, selectedEl, hoverTarget)
    } else {
      hideSpacing(spacingContainer)
    }
    repositionBadges(hoverTarget)
    tooltip.style.display = 'none'
  })

  // ── Click + double-click: Figma-style depth navigation ────────────────────
  //
  //  Single click  → getContextualTarget(): snaps to current depth level.
  //                  Clicking a parent element (back-navigation) resets depth.
  //  Double-click  → drills ONE level deeper into the selected element.
  //                  Subsequent dblclicks on same spot keep drilling deeper.
  //  Ctrl+click    → exact element, resets context (escape hatch).
  //  Pick mode     → exact element, resets context.
  //
  //  Hover follows the same depth, so you only see elements at the
  //  current level highlighted — parents are also hoverable for back-nav.

  // Prevent native text selection while panel is open or inspecting (especially on dblclick spam)
  document.addEventListener('mousedown', (e) => {
    if ((!panelOpen && !inspecting) || isInspectorElement(e.target)) return
    e.preventDefault()
  }, true)

  document.addEventListener('click', (e) => {
    if (!inspecting && !panelOpen) return
    const el = e.target
    if (isInspectorElement(el)) return
    e.preventDefault()
    e.stopPropagation()

    // Ctrl+click → exact element, reset context (cheat code)
    if (e.ctrlKey) {
      const p = el.parentElement
      selectionContext = (p && !isInspectorElement(p) && p !== document.body) ? p : null
      selectElement(el)
      return
    }

    // Pick mode (inspect) → same depth-aware behavior as panel mode
    if (inspecting) {
      const target = (lastContextualHover && !isInspectorElement(lastContextualHover))
        ? lastContextualHover
        : getContextualTarget(el)
      if (!(selectionContext && selectionContext.contains(target) && target !== selectionContext)) {
        selectionContext = (target.parentElement && !isInspectorElement(target.parentElement)
          && target.parentElement !== document.documentElement)
          ? target.parentElement : null
      }
      selectElement(target)
      return
    }

    // Panel mode: use last hover target if available (avoids mismatch when e.target differs from hovered element)
    const target = (lastContextualHover && !isInspectorElement(lastContextualHover))
      ? lastContextualHover
      : getContextualTarget(el)

    // If target is a child of current context: sibling navigation (context unchanged)
    // If target is outside / above context: back-navigation → reset context to target's parent
    if (!(selectionContext && selectionContext.contains(target) && target !== selectionContext)) {
      selectionContext = (target.parentElement && !isInspectorElement(target.parentElement)
        && target.parentElement !== document.documentElement)
        ? target.parentElement : null
    }

    selectElement(target)
  }, true)

  // Double-click: drill one level deeper into the selected element.
  // Only drills if the cursor is within selectedEl — otherwise acts as a normal click.
  document.addEventListener('dblclick', (e) => {
    if (!panelOpen || inspecting) return
    const el = e.target
    if (isInspectorElement(el)) return
    e.preventDefault()
    e.stopPropagation()

    if (selectedEl && el !== selectedEl && selectedEl.contains(el)) {
      // Enter selectedEl — its children become the new selectable level
      selectionContext = selectedEl
      // Must use getContextualTarget here (not lastContextualHover) because selectionContext
      // just changed — we need to snap to a child of the new context, not the old hover target
      const target = getContextualTarget(el)
      // Update context after the new selection
      if (!(selectionContext && selectionContext.contains(target) && target !== selectionContext)) {
        selectionContext = (target.parentElement && !isInspectorElement(target.parentElement))
          ? target.parentElement : null
      }
      selectElement(target)
    } else {
      // Cursor outside selected element: treat as normal click
      const target = (lastContextualHover && !isInspectorElement(lastContextualHover))
        ? lastContextualHover
        : getContextualTarget(el)
      if (!(selectionContext && selectionContext.contains(target) && target !== selectionContext)) {
        selectionContext = (target.parentElement && !isInspectorElement(target.parentElement))
          ? target.parentElement : null
      }
      selectElement(target)
    }
  }, true)

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Skip if user is typing inside an input / textarea / contenteditable
    const tag = document.activeElement?.tagName.toLowerCase()
    const isTyping = ['input', 'textarea', 'select'].includes(tag)
      || document.activeElement?.isContentEditable

    if (e.key === 'Escape') {
      if (inspecting) stopInspect()
      else if (panelOpen) closePanel()
    }

    // i — toggle inspect mode while panel is open
    if ((e.key === 'i' || e.key === 'I') && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (panelOpen) {
        if (inspecting) stopInspect()
        else startInspect()
      }
    }

    // a — show style tooltip on hovered selected element
    if ((e.key === 'a' || e.key === 'A') && !isTyping && !e.metaKey && !e.ctrlKey) {
      if (!aKeyHeld && panelOpen && selectedEl && lastContextualHover === selectedEl) {
        aKeyHeld = true
        const styles = getElementStyles(selectedEl)
        renderTooltip(tooltip, styles, lastMousePos.x, lastMousePos.y)
      } else {
        aKeyHeld = true
      }
    }
  })

  document.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A') {
      aKeyHeld = false
      // Hide tooltip when A is released (unless in inspect mode which manages its own)
      if (!inspecting) tooltip.style.display = 'none'
    }
  })

  // ── Fix 1: scroll — update overlay using fresh getBoundingClientRect ────────
  // Since overlay is position:fixed, getBoundingClientRect gives us exactly what we need.
  document.addEventListener('scroll', () => {
    if (selectedEl && panelOpen) {
      updateOverlay(overlay, selectedEl)
      updateBoxModel(bm, selectedEl)
    }
    if (inspecting) {
      overlay.style.display = 'none'
      tooltip.style.display = 'none'
      hideBoxModel(bm)
    }
    // Clear hover overlay, spacing, and tooltip on scroll (positions are stale)
    hideHoverOverlay()
    hideSpacing(spacingContainer)
    tooltip.style.display = 'none'
  }, true)

  // ── Agentic mode ─────────────────────────────────────────────────────────

  function startAgenticMode() {
    agenticMode = true
    agenticBtn.classList.add('active')
    document.body.classList.add('di-agentic-mode')
    // Create a hover overlay for agentic mode
    if (!agenticHoverOverlay) {
      agenticHoverOverlay = document.createElement('div')
      agenticHoverOverlay.id = '__dev_inspector_agentic_hover__'
      agenticHoverOverlay.className = 'di-agentic-hover'
      agenticHoverOverlay.style.display = 'none'
      document.body.appendChild(agenticHoverOverlay)
    }
  }

  function stopAgenticMode() {
    agenticMode = false
    agenticBtn.classList.remove('active')
    document.body.classList.remove('di-agentic-mode')
    agenticHoverEl = null
    if (agenticHoverOverlay) {
      agenticHoverOverlay.style.display = 'none'
    }
    promptPopover.style.display = 'none'
  }

  function showPromptFor(el) {
    agenticMode = false
    agenticBtn.classList.remove('active')
    document.body.classList.remove('di-agentic-mode')
    if (agenticHoverOverlay) agenticHoverOverlay.style.display = 'none'

    // Set element label in popover
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = [...el.classList]
      .filter(c => !c.startsWith('di-') && !c.startsWith('__dev'))
      .slice(0, 2).map(c => `.${c}`).join('')
    const labelEl = promptPopover.querySelector('.di-prompt-element-label')
    if (labelEl) labelEl.textContent = `${tag}${id}${cls}`

    // Clear previous input
    const input = promptPopover.querySelector('.di-prompt-input')
    if (input) { input.value = ''; }

    // Position and show
    promptPopover.style.display = 'block'
    positionPromptPopover(promptPopover, el)

    // Focus the input
    setTimeout(() => input?.focus(), 50)

    // Store the target element
    promptPopover._targetEl = el
  }

  // Agentic button click: toggle agentic mode
  agenticBtn.addEventListener('click', () => {
    if (agenticMode) {
      stopAgenticMode()
    } else {
      // Close inspector panel if open
      if (inspecting) stopInspect()
      startAgenticMode()
    }
  })

  // Agentic mode: hover highlight
  document.addEventListener('mousemove', (e) => {
    if (!agenticMode) return
    const el = e.target
    if (isInspectorElement(el)) {
      if (agenticHoverOverlay) agenticHoverOverlay.style.display = 'none'
      agenticHoverEl = null
      return
    }
    agenticHoverEl = el
    if (agenticHoverOverlay) {
      const rect = el.getBoundingClientRect()
      agenticHoverOverlay.style.display = 'block'
      agenticHoverOverlay.style.top = rect.top + 'px'
      agenticHoverOverlay.style.left = rect.left + 'px'
      agenticHoverOverlay.style.width = rect.width + 'px'
      agenticHoverOverlay.style.height = rect.height + 'px'
    }
  })

  // Agentic mode: click to select element and show prompt
  document.addEventListener('click', (e) => {
    if (!agenticMode) return
    const el = e.target
    if (isInspectorElement(el)) return
    e.preventDefault()
    e.stopPropagation()
    showPromptFor(el)
  }, true)

  // Prompt popover: close button
  promptPopover.querySelector('.di-prompt-close')?.addEventListener('click', () => {
    promptPopover.style.display = 'none'
    promptPopover._targetEl = null
  })

  // Prompt popover: apply button
  promptPopover.querySelector('.di-prompt-apply')?.addEventListener('click', async () => {
    const input = promptPopover.querySelector('.di-prompt-input')
    const applyBtn = promptPopover.querySelector('.di-prompt-apply')
    const el = promptPopover._targetEl
    const instruction = input?.value?.trim()

    if (!el || !instruction) return

    applyBtn.disabled = true
    applyBtn.textContent = 'Sending...'

    try {
      const result = await sendToAgent(agenticClient, el, instruction, {
        rootPath,
        tracker,
        cwd: '', // Will be resolved by the extension
      })

      promptPopover.style.display = 'none'
      promptPopover._targetEl = null

      if (result.method === 'extension') {
        // Add session card to status panel
        const selector = buildSelector(el)
        const card = createSessionCard(result.sessionId, selector)
        statusPanel.appendChild(card)
      } else if (result.method === 'clipboard') {
        // Show flash message
        const flash = document.createElement('div')
        flash.className = 'di-agentic-flash'
        flash.textContent = result.copied
          ? 'Claude command copied! Paste in your terminal.'
          : 'Could not connect to extension or copy to clipboard.'
        document.body.appendChild(flash)
        setTimeout(() => flash.remove(), 2800)
      }
    } catch (err) {
      const flash = document.createElement('div')
      flash.className = 'di-agentic-flash'
      flash.textContent = 'Error: ' + (err.message || 'Unknown error')
      document.body.appendChild(flash)
      setTimeout(() => flash.remove(), 2800)
    } finally {
      applyBtn.disabled = false
      applyBtn.textContent = 'Apply with Claude'
    }
  })

  // Prompt popover: Ctrl+Enter to apply
  promptPopover.querySelector('.di-prompt-input')?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      promptPopover.querySelector('.di-prompt-apply')?.click()
    }
    // Escape to close
    if (e.key === 'Escape') {
      promptPopover.style.display = 'none'
      promptPopover._targetEl = null
    }
  })

  // Agentic client event handler: update status panel cards with live activity feed
  agenticClient.onEvent((event) => {
    const card = event.sessionId
      ? statusPanel.querySelector(`.di-agent-card[data-session-id="${event.sessionId}"]`)
      : null

    switch (event.type) {
      case 'session:started':
        if (card) {
          updateSessionStatus(card, 'running')
          // Don't add log here — the system:init event from stream-json handles it
        }
        break

      case 'session:progress':
        if (card && event.rawEvent) {
          const entry = parseEventToLogEntry(event.rawEvent)
          if (entry) addLogEntry(card, entry)
        }
        break

      case 'session:complete':
        if (card) {
          addLogEntry(card, { type: 'result', icon: '✅', text: event.summary || 'Changes applied' })
          updateSessionStatus(card, 'done')
          card.classList.add('done')
        }
        break

      case 'session:error':
        if (card) {
          addLogEntry(card, { type: 'error', icon: '❌', text: event.error || 'Something went wrong' })
          updateSessionStatus(card, 'error')
          card.classList.add('error')
        }
        break

      case 'session:cancelled':
        if (card) {
          addLogEntry(card, { type: 'error', icon: '🚫', text: 'Cancelled' })
          updateSessionStatus(card, 'cancelled')
          setTimeout(() => {
            card.classList.add('fade-out')
            setTimeout(() => card.remove(), 500)
          }, 3000)
        }
        break
    }
  })

  // Status panel: cancel and minimize button delegation
  statusPanel.addEventListener('click', (e) => {
    const cancelBtn = e.target.closest('.di-agent-cancel')
    if (cancelBtn) {
      const card = cancelBtn.closest('.di-agent-card')
      const sessionId = card?.dataset?.sessionId
      if (sessionId) agenticClient.cancelSession(sessionId)
      return
    }
    const minimizeBtn = e.target.closest('.di-agent-minimize')
    if (minimizeBtn) {
      const card = minimizeBtn.closest('.di-agent-card')
      if (card) card.classList.toggle('minimized')
      return
    }
  })

  // Status panel: follow-up input — send new instruction for the same element
  statusPanel.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return
    const input = e.target.closest('.di-agent-followup-input')
    if (!input) return
    const instruction = input.value.trim()
    if (!instruction) return
    const card = input.closest('.di-agent-card')
    const sessionId = card?.dataset?.sessionId
    if (!sessionId) return
    submitFollowUp(card, sessionId, instruction, input)
  })

  statusPanel.addEventListener('click', (e) => {
    const sendBtn = e.target.closest('.di-agent-followup-send')
    if (!sendBtn) return
    const card = sendBtn.closest('.di-agent-card')
    const input = card?.querySelector('.di-agent-followup-input')
    const instruction = input?.value?.trim()
    if (!instruction || !card) return
    const sessionId = card.dataset?.sessionId
    if (!sessionId) return
    submitFollowUp(card, sessionId, instruction, input)
  })

  async function submitFollowUp(card, oldSessionId, instruction, input) {
    const elementLabel = card.querySelector('.di-agent-element')?.textContent || ''
    input.value = ''
    input.disabled = true

    // Hide follow-up, reset card for new session
    const followup = card.querySelector('.di-agent-followup')
    if (followup) followup.style.display = 'none'
    card.classList.remove('done')

    addLogEntry(card, { type: 'system', icon: '💬', text: `Follow-up: ${instruction}` })
    updateSessionStatus(card, 'starting')

    // Use --resume to continue the same Claude conversation
    // Claude will have full context of what it did before
    const newSessionId = crypto.randomUUID()
    card.dataset.sessionId = newSessionId

    const isConnected = agenticClient.isConnected() || await agenticClient.connect()
    if (isConnected) {
      // Use startFollowUp which sends session:followup with Claude session ID for --resume
      agenticClient.startFollowUp(newSessionId, instruction, '', elementLabel, oldSessionId)
    }
    input.disabled = false
  }

  // Escape key closes agentic mode and prompt
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (promptPopover.style.display !== 'none') {
        promptPopover.style.display = 'none'
        promptPopover._targetEl = null
      } else if (agenticMode) {
        stopAgenticMode()
      }
    }
  })

  return {
    destroy() {
      textEditCleanup()
      stopAgenticMode()
      agenticClient.disconnect()
      cog.remove()
      overlay.remove()
      tooltip.remove()
      panel.remove()
      bm.remove()
      hoverOverlay.remove()
      spacingContainer.remove()
      agenticBtn.remove()
      promptPopover.remove()
      statusPanel.remove()
      agenticHoverOverlay?.remove()
      classStyleEl?.remove()
      classStyleEl = null
      classRules = {}
      document.getElementById('__dev_inspector_styles__')?.remove()
      document.body.classList.remove('di-inspect-mode')
      document.body.classList.remove('di-agentic-mode')
      document.body.style.marginRight = ''
      document.body.style.transition = ''
    }
  }
}
