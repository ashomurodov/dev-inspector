import { colorToHex } from './ui.js'
import { getElementStyles } from './inspector.js'

const ALL_PROPS = [
  'color', 'background-color', 'font-size', 'font-weight', 'line-height',
  'font-style', 'text-align', 'text-decoration', 'text-transform', 'letter-spacing',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'border-radius', 'border-width', 'border-style', 'border-color',
  'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'display', 'flex-direction', 'justify-content', 'align-items', 'gap', 'overflow',
  'opacity', 'box-shadow', 'object-fit',
]

export function captureOriginals(el) {
  const cs = window.getComputedStyle(el)
  const map = {}
  ALL_PROPS.forEach(prop => { map[prop] = cs.getPropertyValue(prop).trim() })
  // Also capture direct text content so it can be reset
  map['textContent'] = [...el.childNodes]
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent)
    .join('')
    .trim()
  return map
}

export function renderEditPanel(panelContent, el, originals, onChange, onReset, { applyStyle, clearStyle } = {}) {
  const _apply = applyStyle || ((p, v) => el.style.setProperty(p, v))
  const _clear = clearStyle || ((p) => el.style.removeProperty(p))
  const styles = getElementStyles(el)
  const { typography, background, spacing, border, layout, dimensions, opacity } = styles
  const cs = window.getComputedStyle(el)

  // ── HTML helpers ──────────────────────────────────────────────────────────

  const section = (title) => `<div class="di-section-header">${title}</div>`

  const resetBtn = (prop) =>
    `<button class="di-reset-btn" data-reset-prop="${prop}" title="Reset to original">↺</button>`

  // Numeric stepper: − [value] +
  const numberField = (label, prop, value, unit = '') => {
    const orig = originals[prop] || ''
    const display = parseFloat(value) !== undefined ? (parseFloat(value) ?? value) : value
    return `
      <div class="di-field">
        <label>${label}</label>
        <div class="di-field-control">
          <div class="di-number-wrap">
            <button class="di-step-btn" data-step="-1" data-target="${prop}" title="Decrease (↓ key)">−</button>
            <input class="di-input di-number-input" data-prop="${prop}" data-unit="${unit}" data-original="${orig}" value="${parseFloat(value) || 0}" />
            <button class="di-step-btn" data-step="1" data-target="${prop}" title="Increase (↑ key)">+</button>
          </div>
        </div>
        ${resetBtn(prop)}
      </div>`
  }

  const colorInput = (prop, hex, origHex) => {
    const safe = hex || '#000000'
    return `
      <div class="di-color-wrap">
        <button class="di-color-swatch" style="background:${safe};" title="Pick color">
          <input type="color" data-prop="${prop}" data-original="${origHex || safe}" value="${safe}" />
        </button>
        <input class="di-input" data-prop="${prop}" data-original="${origHex || safe}" value="${safe}" style="flex:1;" />
      </div>`
  }

  const colorField = (label, prop, hex, origHex) => `
    <div class="di-field">
      <label>${label}</label>
      <div class="di-field-control">${colorInput(prop, hex, origHex)}</div>
      ${resetBtn(prop)}
    </div>`

  const selectInput = (prop, value, options) => {
    const orig = originals[prop] || ''
    const opts = options.map(o =>
      `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`
    ).join('')
    return `<select class="di-input" data-prop="${prop}" data-original="${orig}">${opts}</select>`
  }

  const selectField = (label, prop, value, options) => `
    <div class="di-field">
      <label>${label}</label>
      <div class="di-field-control">${selectInput(prop, value, options)}</div>
      ${resetBtn(prop)}
    </div>`

  // Plain text input — for values like "none", "auto", "100%", "0 4px 8px rgba(...)"
  const textField = (label, prop, value) => {
    const orig = originals[prop] || ''
    return `
      <div class="di-field">
        <label>${label}</label>
        <div class="di-field-control">
          <input class="di-input" data-prop="${prop}" data-original="${escAttr(orig)}"
            value="${escAttr(value || '')}" placeholder="auto" />
        </div>
        ${resetBtn(prop)}
      </div>`
  }

  // Spacing grid cell with mini stepper
  const spacingCell = (prop, val, label) => {
    const orig = originals[prop] || ''
    return `
      <div style="display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:9px;color:#52525b;font-family:monospace;text-align:center;">${label}</span>
        <div style="display:flex;gap:2px;align-items:center;">
          <button class="di-step-btn di-step-sm" data-step="-1" data-target="${prop}">−</button>
          <input class="di-input di-number-input" data-prop="${prop}" data-unit="px"
            data-original="${orig}" value="${parseFloat(val) || 0}"
            style="text-align:center;padding:3px 2px;min-width:0;" />
          <button class="di-step-btn di-step-sm" data-step="1" data-target="${prop}">+</button>
          <button class="di-reset-btn" data-reset-prop="${prop}"
            style="width:16px;height:20px;font-size:10px;" title="Reset ${prop}">↺</button>
        </div>
      </div>`
  }

  const spacingGrid = (cells) => `
    <div class="di-field">
      <div class="di-field-control">
        <div class="di-spacing-grid">${cells.map(([p, v, l]) => spacingCell(p, v, l)).join('')}</div>
      </div>
    </div>`

  // ── Text content section (Fix 3) ──────────────────────────────────────────
  const directText = [...el.childNodes]
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent)
    .join('')
    .trim()
  const hasDirectText = directText.length > 0 ||
    [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE)

  const textSection = hasDirectText ? `
    ${section('Text Content')}
    <div style="padding:6px 16px 10px;display:flex;flex-direction:column;gap:6px;">
      <div style="display:flex;gap:4px;align-items:flex-start;">
        <textarea class="di-input di-text-area" id="di-text-textarea"
          rows="3" style="flex:1;">${escHtml(directText)}</textarea>
        <button class="di-reset-btn" id="di-text-reset-btn"
          data-reset-prop="textContent" title="Reset text to original">↺</button>
      </div>
      <div class="di-text-hint">
        <span style="flex:1;">Applies live</span>
        <button class="di-edit-on-page-btn" id="di-edit-on-page-btn">✎ Edit on page</button>
      </div>
    </div>` : ''

  // ── Element type flags ────────────────────────────────────────────────────
  const isImg  = el.tagName === 'IMG'
  const isSvg  = el instanceof SVGElement
  const isTextEl = ['p','h1','h2','h3','h4','h5','h6','span','a','li','td','th',
    'label','button','em','strong','small','code','pre','blockquote',
  ].includes(el.tagName.toLowerCase())

  // ── Image section (Fix 1) ─────────────────────────────────────────────────
  const imgSection = isImg ? `
    ${section('Image')}
    <div style="padding:8px 16px 12px;display:flex;flex-direction:column;gap:8px;">
      <img class="di-img-preview" src="${el.src}" alt="${el.alt || ''}" />
      <div class="di-img-meta">${el.src.split('/').pop().split('?')[0] || 'image'}</div>
      <div class="di-img-meta">${el.naturalWidth}×${el.naturalHeight}px · ${el.alt ? `alt: "${el.alt}"` : 'no alt'}</div>
      <button class="di-btn di-btn-ghost" id="di-download-img-btn" style="font-size:12px;padding:7px;">
        ⬇ Download Image
      </button>
    </div>` : ''

  // ── Size section ──────────────────────────────────────────────────────────
  const sizeSection = `
    ${section('Size')}
    ${numberField('width', 'width', dimensions.width, 'px')}
    ${numberField('height', 'height', dimensions.height, 'px')}
    ${textField('min-width', 'min-width', cs.minWidth)}
    ${textField('max-width', 'max-width', cs.maxWidth)}
    ${textField('min-height', 'min-height', cs.minHeight)}
    ${textField('max-height', 'max-height', cs.maxHeight)}
  `

  // ── Typography ────────────────────────────────────────────────────────────
  const origColorHex = colorToHex(originals['color'])
  const typoSection = `
    ${section('Typography')}
    ${numberField('font-size', 'font-size', typography.fontSize, 'px')}
    ${selectField('font-style', 'font-style', cs.fontStyle,
      ['normal','italic','oblique'])}
    ${selectField('font-weight', 'font-weight', typography.fontWeight,
      ['100','200','300','400','500','600','700','800','900'])}
    ${numberField('line-height', 'line-height', typography.lineHeight, 'px')}
    ${colorField('color', 'color', typography.colorHex, origColorHex)}
    ${selectField('text-align', 'text-align', typography.textAlign,
      ['left','center','right','justify'])}
    ${selectField('decoration', 'text-decoration', cs.textDecorationLine,
      ['none','underline','line-through','overline'])}
    ${selectField('transform', 'text-transform', cs.textTransform,
      ['none','uppercase','lowercase','capitalize'])}
    ${textField('letter-spacing', 'letter-spacing', cs.letterSpacing)}
  `

  // ── Background ────────────────────────────────────────────────────────────
  const origBgHex = colorToHex(originals['background-color'])
  const bgSection = `
    ${section('Background')}
    ${colorField('color', 'background-color', background.colorHex, origBgHex)}
  `

  // ── Spacing ───────────────────────────────────────────────────────────────
  const spacingSection = `
    ${section('Padding')}
    ${spacingGrid([
      ['padding-top', spacing.paddingTop, 'top'],
      ['padding-right', spacing.paddingRight, 'right'],
      ['padding-bottom', spacing.paddingBottom, 'bottom'],
      ['padding-left', spacing.paddingLeft, 'left'],
    ])}
    ${section('Margin')}
    ${spacingGrid([
      ['margin-top', spacing.marginTop, 'top'],
      ['margin-right', spacing.marginRight, 'right'],
      ['margin-bottom', spacing.marginBottom, 'bottom'],
      ['margin-left', spacing.marginLeft, 'left'],
    ])}
  `

  // ── Border ────────────────────────────────────────────────────────────────
  const origBorderHex = colorToHex(originals['border-color'])
  const borderSection = `
    ${section('Border')}
    ${numberField('radius', 'border-radius', border.radius, 'px')}
    ${numberField('width', 'border-width', border.width, 'px')}
    ${selectField('style', 'border-style', border.style,
      ['none','solid','dashed','dotted','double'])}
    ${colorField('color', 'border-color', border.colorHex, origBorderHex)}
  `

  // ── Layout ────────────────────────────────────────────────────────────────
  const isFlex = layout.display === 'flex'
  const isGrid = layout.display === 'grid'
  const layoutSection = `
    ${section('Layout')}
    ${selectField('display', 'display', layout.display,
      ['block','flex','grid','inline-flex','inline-block','inline','none'])}
    ${isFlex ? `
      ${selectField('direction', 'flex-direction', layout.flexDirection,
        ['row','row-reverse','column','column-reverse'])}
      ${selectField('justify', 'justify-content', layout.justifyContent,
        ['flex-start','flex-end','center','space-between','space-around','space-evenly'])}
      ${selectField('align', 'align-items', layout.alignItems,
        ['flex-start','flex-end','center','stretch','baseline'])}
    ` : ''}
    ${(isFlex || isGrid) ? numberField('gap', 'gap', layout.gap, 'px') : ''}
    ${selectField('overflow', 'overflow', cs.overflow,
      ['visible','hidden','auto','scroll','clip'])}
  `

  // ── Position ──────────────────────────────────────────────────────────────
  const isPositioned = cs.position !== 'static'
  const posSection = `
    ${section('Position')}
    ${selectField('position', 'position', cs.position,
      ['static','relative','absolute','fixed','sticky'])}
    ${isPositioned ? `
      ${textField('top', 'top', cs.top)}
      ${textField('right', 'right', cs.right)}
      ${textField('bottom', 'bottom', cs.bottom)}
      ${textField('left', 'left', cs.left)}
    ` : ''}
    ${textField('z-index', 'z-index', cs.zIndex === 'auto' ? 'auto' : cs.zIndex)}
  `

  // ── Misc ──────────────────────────────────────────────────────────────────
  const miscSection = `
    ${section('Misc')}
    ${numberField('opacity', 'opacity', opacity)}
    ${textField('box-shadow', 'box-shadow', cs.boxShadow === 'none' ? '' : cs.boxShadow)}
    ${isImg ? selectField('object-fit', 'object-fit', cs.objectFit,
      ['fill','contain','cover','none','scale-down']) : ''}
  `

  // SVGs: show color only instead of full typography
  const origColorHexForSvg = colorToHex(originals['color'])
  const svgColorSection = `
    ${section('Color')}
    ${colorField('color', 'color', typography.colorHex, origColorHexForSvg)}
  `

  // Typography visibility: hidden for images, color-only for SVGs, full for everything else
  const typoRendered = isImg ? '' : isSvg ? svgColorSection : typoSection

  // Section order: text elements get typography first for quick access
  panelContent.innerHTML = isTextEl ? `
    ${textSection}
    ${typoRendered}
    ${bgSection}
    ${sizeSection}
    ${spacingSection}
    ${borderSection}
    ${layoutSection}
    ${posSection}
    ${miscSection}
  ` : `
    ${imgSection}
    ${textSection}
    ${sizeSection}
    ${typoRendered}
    ${bgSection}
    ${spacingSection}
    ${borderSection}
    ${layoutSection}
    ${posSection}
    ${miscSection}
  `

  // ── Wire: regular inputs ───────────────────────────────────────────────────
  panelContent.querySelectorAll('.di-input[data-prop]').forEach(input => {
    input.addEventListener('input', () => applyChange(input, el, onChange, originals, _apply))
    input.addEventListener('change', () => applyChange(input, el, onChange, originals, _apply))
  })

  // ── Wire: color pickers ───────────────────────────────────────────────────
  panelContent.querySelectorAll('input[type="color"][data-prop]').forEach(picker => {
    const wrap = picker.closest('.di-color-wrap')
    const textBox = wrap?.querySelector('.di-input[data-prop]')
    const swatch = picker.parentElement

    picker.addEventListener('input', () => {
      if (textBox) textBox.value = picker.value
      if (swatch) swatch.style.background = picker.value
      applyColorChange(picker.dataset.prop, picker.value, el, onChange, originals, _apply)
      markResetBtn(picker.dataset.prop, picker.value, picker.dataset.original)
    })

    if (textBox) {
      textBox.addEventListener('input', () => {
        const val = textBox.value.trim()
        if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
          picker.value = val
          swatch.style.background = val
          applyColorChange(picker.dataset.prop, val, el, onChange, originals, _apply)
          markResetBtn(textBox.dataset.prop, val, textBox.dataset.original)
        }
      })
    }
  })

  // ── Wire: stepper buttons (Fix 1) ─────────────────────────────────────────
  panelContent.querySelectorAll('.di-step-btn[data-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prop = btn.dataset.target
      const input = panelContent.querySelector(`.di-number-input[data-prop="${prop}"]`)
      if (!input) return
      const delta = parseFloat(btn.dataset.step)
      const current = parseFloat(input.value) || 0
      input.value = round(current + delta)
      applyChange(input, el, onChange, originals, _apply)
    })
  })

  // ── Wire: arrow keys on numeric inputs ────────────────────────────────────
  panelContent.querySelectorAll('.di-number-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
      const delta = e.key === 'ArrowUp' ? step : -step
      const current = parseFloat(input.value) || 0
      input.value = round(current + delta)
      applyChange(input, el, onChange, originals, _apply)
    })
  })

  // ── Wire: reset buttons ───────────────────────────────────────────────────
  panelContent.querySelectorAll('.di-reset-btn[data-reset-prop]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prop = btn.dataset.resetProp
      _clear(prop)
      const restored = window.getComputedStyle(el).getPropertyValue(prop).trim()

      const input = panelContent.querySelector(`.di-input[data-prop="${prop}"]`)
      if (input) input.value = parseFloat(restored) || restored

      const picker = panelContent.querySelector(`input[type="color"][data-prop="${prop}"]`)
      if (picker) {
        const hex = colorToHex(restored)
        if (hex) {
          picker.value = hex
          picker.parentElement.style.background = hex
          if (input) input.value = hex
        }
      }

      btn.classList.remove('changed')
      onReset(el, prop, restored)
    })
  })

  // ── Wire: text content textarea (Fix 3) ───────────────────────────────────
  let textEditCleanup = () => {}
  const textArea = panelContent.querySelector('#di-text-textarea')
  const editOnPageBtn = panelContent.querySelector('#di-edit-on-page-btn')

  if (textArea) {
    const origText = originals['textContent'] ?? directText
    textArea.addEventListener('input', () => {
      setDirectText(el, textArea.value)
      onChange(el, 'textContent', origText, textArea.value)
      const resetBtn = panelContent.querySelector('#di-text-reset-btn')
      if (resetBtn) resetBtn.classList.toggle('changed', textArea.value !== origText)
    })

    const textResetBtn = panelContent.querySelector('#di-text-reset-btn')
    if (textResetBtn) {
      textResetBtn.addEventListener('click', () => {
        setDirectText(el, origText)
        textArea.value = origText
        textResetBtn.classList.remove('changed')
        onReset(el, 'textContent', origText)
      })
    }
  }

  if (editOnPageBtn) {
    editOnPageBtn.addEventListener('click', () => {
      textEditCleanup()
      textEditCleanup = startTextEditing(el, textArea, editOnPageBtn, onChange)
    })
  }

  // ── Image download (Fix 1) ────────────────────────────────────────────────
  const downloadBtn = panelContent.querySelector('#di-download-img-btn')
  if (downloadBtn && isImg) {
    downloadBtn.addEventListener('click', async () => {
      const src = el.src
      const filename = src.split('/').pop().split('?')[0] || 'image'
      try {
        const res = await fetch(src)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        // Cross-origin fallback
        window.open(src, '_blank')
      }
    })
  }

  return () => textEditCleanup()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyChange(input, el, onChange, originals, applyStyleFn) {
  const prop = input.dataset.prop
  const unit = input.dataset.unit || ''
  const rawVal = input.value.trim()

  const numericProps = [
    'font-size','line-height','border-radius','border-width',
    'padding-top','padding-right','padding-bottom','padding-left',
    'margin-top','margin-right','margin-bottom','margin-left',
    'gap','width','height',
  ]

  let value = rawVal
  if (numericProps.includes(prop) && unit && !isNaN(parseFloat(rawVal))) {
    value = parseFloat(rawVal) + unit
  }

  const oldValue = el.style.getPropertyValue(prop) || window.getComputedStyle(el).getPropertyValue(prop)
  applyStyleFn(prop, value)
  onChange(el, prop, oldValue, value)
  markResetBtn(prop, value, originals[prop])
}

function applyColorChange(prop, value, el, onChange, originals, applyStyleFn) {
  const oldValue = el.style.getPropertyValue(prop) || window.getComputedStyle(el).getPropertyValue(prop)
  applyStyleFn(prop, value)
  onChange(el, prop, colorToHex(oldValue) || oldValue, value)
}

function markResetBtn(prop, currentValue, originalValue) {
  const btn = document.querySelector(`.di-reset-btn[data-reset-prop="${prop}"]`)
  if (btn) btn.classList.toggle('changed', currentValue !== originalValue)
}

function setDirectText(el, text) {
  const textNodes = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE)
  if (textNodes.length > 0) {
    textNodes[0].textContent = text
    textNodes.slice(1).forEach(n => n.remove())
  } else {
    el.insertBefore(document.createTextNode(text), el.firstChild)
  }
}

function startTextEditing(el, textArea, btn, onChange) {
  const originalHTML = el.innerHTML
  const originalText = el.textContent.trim()

  btn.classList.add('editing')
  btn.textContent = '✎ Click outside to save'

  el.contentEditable = 'true'
  el.focus()

  // Sync live typing on element → panel textarea
  const onElementInput = () => {
    if (textArea) textArea.value = el.textContent.trim()
  }
  el.addEventListener('input', onElementInput)

  const save = () => {
    el.contentEditable = 'false'
    const newText = el.textContent.trim()
    if (textArea) textArea.value = newText
    btn.classList.remove('editing')
    btn.textContent = '✎ Edit on page'
    if (newText !== originalText) onChange(el, 'textContent', originalText, newText)
    cleanup()
  }

  const outsideClick = (e) => {
    if (!el.contains(e.target) && e.target !== btn && e.target !== textArea) save()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      el.innerHTML = originalHTML
      el.contentEditable = 'false'
      if (textArea) textArea.value = originalText
      btn.classList.remove('editing')
      btn.textContent = '✎ Edit on page'
      cleanup()
    }
  }

  const cleanup = () => {
    el.removeEventListener('input', onElementInput)
    document.removeEventListener('mousedown', outsideClick)
    document.removeEventListener('keydown', onKeyDown)
  }

  setTimeout(() => {
    document.addEventListener('mousedown', outsideClick)
    document.addEventListener('keydown', onKeyDown)
  }, 100)

  return () => {
    el.contentEditable = 'false'
    cleanup()
  }
}

function round(n) {
  return Math.round(n * 10) / 10
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function camelize(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}
