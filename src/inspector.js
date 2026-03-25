import { positionTooltip, colorToHex } from './ui.js'

const IGNORED_IDS = [
  '__dev_inspector__',
  '__dev_inspector_overlay__',
  '__dev_inspector_panel__',
  '__dev_inspector_tooltip__',
  '__dev_inspector_hover_overlay__',
  '__dev_inspector_spacing__',
  '__dev_inspector_boxmodel__',
  '__dev_inspector_agentic_btn__',
  '__dev_inspector_prompt__',
  '__dev_inspector_agent_status__',
  '__dev_inspector_agentic_hover__',
]

export function isInspectorElement(el) {
  if (!el || el === document.body || el === document.documentElement) return true
  if (IGNORED_IDS.includes(el.id)) return true
  if (el.closest('#__dev_inspector_panel__')) return true
  if (el.closest('#__dev_inspector__')) return true
  if (el.closest('#__dev_inspector_prompt__')) return true
  if (el.closest('#__dev_inspector_agent_status__')) return true
  return false
}

const VUE_WRAPPERS = new Set([
  'Transition', 'TransitionGroup', 'BaseTransition',
  'KeepAlive', 'Suspense', 'Teleport',
  'RouterView', 'RouterLink',
  'NuxtPage', 'NuxtLayout', 'NuxtLink', 'NuxtLoadingIndicator',
])

const REACT_WRAPPERS = new Set([
  'StrictMode', 'Fragment', 'Suspense', 'SuspenseList', 'Profiler',
  'BrowserRouter', 'HashRouter', 'MemoryRouter', 'Router', 'StaticRouter',
  'Routes', 'Route', 'Switch', 'Outlet', 'RouterProvider',
  'Link', 'NavLink', 'Navigate', 'ScrollRestoration',
])

function getReactFiber(el) {
  const key = Object.keys(el).find(k =>
    k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  )
  return key ? el[key] : null
}

function getReactTypeName(type) {
  if (!type) return null
  if (typeof type === 'function') return type.displayName || type.name || null
  if (typeof type === 'object') {
    return type.displayName
      || type.render?.displayName || type.render?.name
      || type.type?.displayName || type.type?.name
      || null
  }
  return null
}

export function getReactComponent(el) {
  const fiber = getReactFiber(el)
  if (!fiber) return null
  let node = fiber
  while (node) {
    const name = getReactTypeName(node.type)
    if (name && /^[A-Z]/.test(name) && !REACT_WRAPPERS.has(name)) {
      const src = node._debugSource
      return {
        name,
        file: src?.fileName || null,
        line: src?.lineNumber || null,
        col: src?.columnNumber || null,
      }
    }
    node = node.return
  }
  return null
}

export function getVueComponent(el) {
  let node = el
  while (node && node !== document.documentElement) {
    const instance = node.__vueParentComponent
    if (instance?.type && typeof instance.type === 'object') {
      const name = instance.type.__name || instance.type.name || null
      const file = instance.type.__file || null
      if (name && VUE_WRAPPERS.has(name)) { node = node.parentElement; continue }
      if (name || file) return { name: name || 'Anonymous', file }
    }
    node = node.parentElement
  }
  return null
}

export function getElementStyles(el) {
  const cs = window.getComputedStyle(el)
  const rect = el.getBoundingClientRect()

  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const classes = [...el.classList]
    .filter(c => !c.startsWith('di-') && !c.startsWith('__dev'))
    .slice(0, 3)
    .map(c => `.${c}`)
    .join('')
  const label = `${tag}${id}${classes}`

  const textContent = [...el.childNodes]
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 40) || null

  return {
    label,
    tag,
    isSvg: el instanceof SVGElement,
    textContent,
    vueComponent: getVueComponent(el),
    reactComponent: getReactComponent(el),
    size: {
      width: Math.round(rect.width) + 'px',
      height: Math.round(rect.height) + 'px',
    },
    typography: {
      fontFamily: cs.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      color: cs.color,
      colorHex: colorToHex(cs.color),
      textAlign: cs.textAlign,
    },
    background: {
      color: cs.backgroundColor,
      colorHex: colorToHex(cs.backgroundColor),
    },
    spacing: {
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      marginTop: cs.marginTop,
      marginRight: cs.marginRight,
      marginBottom: cs.marginBottom,
      marginLeft: cs.marginLeft,
    },
    border: {
      radius: cs.borderRadius,
      color: cs.borderColor,
      colorHex: colorToHex(cs.borderColor),
      width: cs.borderWidth,
      style: cs.borderStyle,
    },
    layout: {
      display: cs.display,
      flexDirection: cs.flexDirection,
      justifyContent: cs.justifyContent,
      alignItems: cs.alignItems,
      gap: cs.gap,
      gridTemplateColumns: cs.gridTemplateColumns !== 'none' ? cs.gridTemplateColumns : null,
    },
    dimensions: {
      width: cs.width,
      height: cs.height,
    },
    opacity: cs.opacity,
    zIndex: cs.zIndex,
  }
}

export function hideBoxModel(bm) {
  if (!bm) return
  bm.querySelectorAll('.di-bm-area').forEach(d => { d.style.display = 'none' })
  bm.querySelectorAll('.di-bm-gap').forEach(d => d.remove())
}

export function updateBoxModel(bm, el) {
  if (!bm || !el) return
  hideBoxModel(bm)

  const rect = el.getBoundingClientRect()
  const cs   = window.getComputedStyle(el)

  const m = {
    t: parseFloat(cs.marginTop)    || 0,
    r: parseFloat(cs.marginRight)  || 0,
    b: parseFloat(cs.marginBottom) || 0,
    l: parseFloat(cs.marginLeft)   || 0,
  }
  const p = {
    t: parseFloat(cs.paddingTop)    || 0,
    r: parseFloat(cs.paddingRight)  || 0,
    b: parseFloat(cs.paddingBottom) || 0,
    l: parseFloat(cs.paddingLeft)   || 0,
  }
  const bd = {
    t: parseFloat(cs.borderTopWidth)    || 0,
    r: parseFloat(cs.borderRightWidth)  || 0,
    b: parseFloat(cs.borderBottomWidth) || 0,
    l: parseFloat(cs.borderLeftWidth)   || 0,
  }

  const { top, left, width, height } = rect

  function show(id, x, y, w, h, label) {
    const div = bm.querySelector(`#__di_bm_${id}__`)
    if (!div) return
    w = Math.max(0, w); h = Math.max(0, h)
    if (w === 0 || h === 0) { div.style.display = 'none'; return }
    div.style.cssText += `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`
    div.style.display = 'flex'
    div.textContent = (w >= 20 && h >= 10 && label !== '') ? label : ''
  }

  // ── Margin strips (outside border box) ───────────────────────────────────
  show('mt', left - m.l, top - m.t, width + m.l + m.r, m.t, `${m.t}`)
  show('mr', left + width, top - m.t, m.r, height + m.t + m.b, `${m.r}`)
  show('mb', left - m.l, top + height, width + m.l + m.r, m.b, `${m.b}`)
  show('ml', left - m.l, top - m.t, m.l, height + m.t + m.b, `${m.l}`)

  // ── Padding strips (inside border, outside content) ───────────────────────
  const pbL = left + bd.l, pbT = top + bd.t
  const pbW = width - bd.l - bd.r, pbH = height - bd.t - bd.b
  const ctW = pbW - p.l - p.r, ctH = pbH - p.t - p.b

  show('pt', pbL, pbT, pbW, p.t, `${p.t}`)
  show('pr', pbL + pbW - p.r, pbT + p.t, p.r, ctH, `${p.r}`)
  show('pb', pbL, pbT + pbH - p.b, pbW, p.b, `${p.b}`)
  show('pl', pbL, pbT + p.t, p.l, ctH, `${p.l}`)

  // ── Content area ──────────────────────────────────────────────────────────
  show('content', pbL + p.l, pbT + p.t, ctW, ctH, '')

  // ── Gap strips between flex/grid children ─────────────────────────────────
  const display = cs.display
  if (display === 'flex' || display === 'inline-flex' || display === 'grid') {
    const colGap = parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0
    const rowGap = parseFloat(cs.rowGap)    || parseFloat(cs.gap) || 0
    if (colGap > 0 || rowGap > 0) {
      const isRow = cs.flexDirection !== 'column' && cs.flexDirection !== 'column-reverse'
      const children = [...el.children].filter(c => {
        const s = window.getComputedStyle(c)
        return s.display !== 'none' && s.visibility !== 'hidden'
      })
      for (let i = 0; i < children.length - 1; i++) {
        const a = children[i].getBoundingClientRect()
        const b = children[i + 1].getBoundingClientRect()
        let gx, gy, gw, gh
        if (isRow) {
          gx = a.right; gy = Math.min(a.top, b.top)
          gw = Math.max(0, b.left - a.right)
          gh = Math.max(a.bottom, b.bottom) - gy
        } else {
          gx = Math.min(a.left, b.left); gy = a.bottom
          gw = Math.max(a.right, b.right) - gx
          gh = Math.max(0, b.top - a.bottom)
        }
        if (gw > 0 && gh > 0) {
          const gDiv = document.createElement('div')
          gDiv.className = 'di-bm-gap'
          gDiv.style.left = gx + 'px'; gDiv.style.top = gy + 'px'
          gDiv.style.width = gw + 'px'; gDiv.style.height = gh + 'px'
          gDiv.textContent = (gw >= 20 && gh >= 10)
            ? `${Math.round(isRow ? gw : gh)}`
            : ''
          bm.appendChild(gDiv)
        }
      }
    }
  }
}

export function renderTooltip(tooltip, styles, x, y) {
  const { label, size, typography, background, spacing, border, layout, textContent, isSvg, vueComponent, reactComponent } = styles

  const colorDot = (hex) => hex
    ? `<span class="di-swatch" style="background:${hex};"></span>`
    : ''

  const row = (key, val) =>
    `<div class="di-row"><span class="di-key">${key}</span><span class="di-val">${val}</span></div>`

  const isImg  = styles.tag === 'img'
  const isText = ['p','h1','h2','h3','h4','h5','h6','span','a','li','td','th','label','button'].includes(styles.tag)
  const isFlex = layout.display === 'flex'
  const isGrid = layout.display === 'grid'

  let html = `<div class="di-tag">${label}</div>`

  if (vueComponent) {
    html += `<div class="di-section">Vue</div>`
    html += row('component', `<span class="di-vue-name">&lt;${vueComponent.name}&gt;</span>`)
    if (vueComponent.file) {
      const fileName = vueComponent.file.replace(/\\/g, '/').split('/').pop()
      html += row('file', fileName)
    }
  }

  if (reactComponent) {
    html += `<div class="di-section">React</div>`
    html += row('component', `<span class="di-react-name">&lt;${reactComponent.name}&gt;</span>`)
    if (reactComponent.file) {
      const fileName = reactComponent.file.replace(/\\/g, '/').split('/').pop()
      const loc = reactComponent.line ? `:${reactComponent.line}` : ''
      html += row('file', `${fileName}${loc}`)
    }
  }

  if (textContent) {
    html += row('text', `"${textContent.length > 28 ? textContent.slice(0,28)+'…' : textContent}"`)
  }

  html += row('size', `${size.width} × ${size.height}`)

  // Typography: skip for images and SVGs
  if (!isImg && !isSvg && (isText || typography.fontSize !== '0px')) {
    html += `<div class="di-section">Typography</div>`
    html += row('font', typography.fontFamily)
    html += row('size', typography.fontSize)
    html += row('weight', typography.fontWeight)
    html += row('color', `${colorDot(typography.colorHex)}${typography.colorHex || typography.color}`)
  }

  if (background.colorHex) {
    html += `<div class="di-section">Background</div>`
    html += row('fill', `${colorDot(background.colorHex)}${background.colorHex}`)
  }

  html += `<div class="di-section">Spacing</div>`
  html += row('padding', `${spacing.paddingTop} ${spacing.paddingRight} ${spacing.paddingBottom} ${spacing.paddingLeft}`)
  html += row('margin', `${spacing.marginTop} ${spacing.marginRight} ${spacing.marginBottom} ${spacing.marginLeft}`)

  if (border.width !== '0px' || border.radius !== '0px') {
    html += `<div class="di-section">Border</div>`
    if (border.radius !== '0px') html += row('radius', border.radius)
    if (border.width !== '0px') {
      html += row('border', `${border.width} ${border.style} ${colorDot(border.colorHex)}${border.colorHex || border.color}`)
    }
  }

  if (isFlex || isGrid) {
    html += `<div class="di-section">${isFlex ? 'Flexbox' : 'Grid'}</div>`
    if (isFlex) {
      html += row('direction', layout.flexDirection)
      html += row('justify', layout.justifyContent)
      html += row('align', layout.alignItems)
    }
    if (isGrid && layout.gridTemplateColumns) {
      html += row('columns', layout.gridTemplateColumns)
    }
    if (layout.gap && layout.gap !== 'normal') html += row('gap', layout.gap)
  }

  tooltip.innerHTML = html
  tooltip.style.display = 'block'
  positionTooltip(tooltip, x, y)
}
