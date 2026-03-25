export const INSPECTOR_ID = '__dev_inspector__'
export const OVERLAY_ID = '__dev_inspector_overlay__'
export const PANEL_ID = '__dev_inspector_panel__'
export const TOOLTIP_ID = '__dev_inspector_tooltip__'

export function injectStyles() {
  if (document.getElementById('__dev_inspector_styles__')) return
  const style = document.createElement('style')
  style.id = '__dev_inspector_styles__'
  style.textContent = `
    /* ── Cog trigger button ── */
    #__dev_inspector__ {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483640;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #18181b;
      border: 1.5px solid #3f3f46;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      transition: background 0.15s, transform 0.15s;
      font-family: system-ui, sans-serif;
      user-select: none;
    }
    #__dev_inspector__:hover { background: #27272a; transform: scale(1.08); }
    #__dev_inspector__.active { background: #6366f1; border-color: #818cf8; }
    #__dev_inspector__ svg { width: 20px; height: 20px; pointer-events: none; }

    /* ── Hover highlight overlay ── */
    #__dev_inspector_overlay__ {
      position: fixed;
      z-index: 2147483638;
      pointer-events: none;
      border: 2px solid #6366f1;
      background: rgba(99,102,241,0.08);
      border-radius: 3px;
      box-sizing: border-box;
    }
    #__dev_inspector_overlay__.selected {
      border-color: #22c55e;
      background: rgba(34,197,94,0.06);
    }

    /* ── Hover tooltip ── */
    #__dev_inspector_tooltip__ {
      position: fixed;
      z-index: 2147483639;
      pointer-events: none;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 10px;
      padding: 10px 13px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px;
      color: #e4e4e7;
      min-width: 220px;
      max-width: 300px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      line-height: 1.6;
    }
    #__dev_inspector_tooltip__ .di-tag {
      font-size: 10px;
      color: #818cf8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    #__dev_inspector_tooltip__ .di-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 1px 0;
    }
    #__dev_inspector_tooltip__ .di-key { color: #71717a; }
    #__dev_inspector_tooltip__ .di-val { color: #f4f4f5; font-weight: 500; }
    #__dev_inspector_tooltip__ .di-section {
      margin-top: 7px;
      padding-top: 7px;
      border-top: 1px solid #27272a;
      font-size: 10px;
      color: #52525b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    #__dev_inspector_tooltip__ .di-swatch {
      display: inline-block;
      width: 10px; height: 10px;
      border-radius: 2px;
      border: 1px solid #52525b;
      vertical-align: middle;
      margin-right: 4px;
    }
    #__dev_inspector_tooltip__ .di-vue-name { color: #a78bfa; font-weight: 600; }
    #__dev_inspector_tooltip__ .di-react-name { color: #61dafb; font-weight: 600; }

    /* ── Side edit panel ── */
    #__dev_inspector_panel__ {
      position: fixed;
      top: 0; right: 0;
      width: 300px;
      min-width: 220px;
      max-width: 580px;
      height: 100vh;
      z-index: 2147483641;
      background: #18181b;
      border-left: 1px solid #3f3f46;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: #e4e4e7;
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 40px rgba(0,0,0,0.4);
      transform: translateX(100%);
      transition: transform 0.22s cubic-bezier(.4,0,.2,1);
    }
    #__dev_inspector_panel__.open { transform: translateX(0); }

    /* ── Collapsed state: shrinks to a 40px strip ── */
    #__dev_inspector_panel__.collapsed {
      width: 40px !important;
      min-width: 40px;
    }
    #__dev_inspector_panel__.collapsed .di-element-bar,
    #__dev_inspector_panel__.collapsed .di-vue-bar,
    #__dev_inspector_panel__.collapsed .di-tab-row,
    #__dev_inspector_panel__.collapsed #di-panel-content,
    #__dev_inspector_panel__.collapsed .di-panel-footer,
    #__dev_inspector_panel__.collapsed .di-panel-header h3 {
      display: none !important;
    }
    #__dev_inspector_panel__.collapsed .di-panel-header {
      flex-direction: column;
      padding: 12px 0;
      align-items: center;
      gap: 10px;
      height: 100%;
      justify-content: flex-start;
    }
    #__dev_inspector_panel__.collapsed .di-collapse-btn svg {
      transform: rotate(180deg);
    }

    /* ── Resize handle (drag left edge) ── */
    .di-resize-handle {
      position: absolute;
      left: 0; top: 0;
      width: 5px;
      height: 100%;
      cursor: ew-resize;
      z-index: 10;
      background: transparent;
      transition: background 0.15s;
    }
    .di-resize-handle:hover,
    .di-resize-handle.dragging { background: #6366f1; }

    /* ── Collapse button ── */
    .di-collapse-btn {
      width: 24px; height: 24px;
      background: #27272a;
      border: none;
      border-radius: 6px;
      color: #a1a1aa;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.12s;
      flex-shrink: 0;
      padding: 0;
    }
    .di-collapse-btn:hover { background: #3f3f46; color: #fff; }
    .di-collapse-btn svg { pointer-events: none; }

    .di-panel-header {
      padding: 12px 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      gap: 8px;
    }
    .di-panel-header h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: #f4f4f5;
      flex: 1;
    }
    .di-panel-header .di-close {
      width: 24px; height: 24px;
      background: #27272a;
      border: none;
      border-radius: 6px;
      color: #a1a1aa;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      transition: background 0.12s;
      flex-shrink: 0;
    }
    .di-panel-header .di-close:hover { background: #3f3f46; color: #fff; }

    .di-help-btn {
      width: 22px; height: 22px;
      background: #27272a; border: none; border-radius: 50%;
      color: #a1a1aa; font-size: 12px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-family: inherit;
    }
    .di-help-btn:hover { background: #3f3f46; color: #fff; }

    .di-help-modal {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: #18181b; z-index: 10; display: flex; flex-direction: column;
      overflow: hidden;
    }
    .di-help-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid #27272a;
      font-size: 13px; font-weight: 600; color: #e4e4e7; flex-shrink: 0;
    }
    .di-help-close {
      background: none; border: none; color: #71717a; cursor: pointer;
      font-size: 14px; padding: 2px 6px; border-radius: 4px;
    }
    .di-help-close:hover { color: #fff; background: #27272a; }
    .di-help-body { padding: 12px 16px; overflow-y: auto; flex: 1; }
    .di-help-section {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: #52525b; margin: 14px 0 6px;
    }
    .di-help-section:first-child { margin-top: 0; }
    .di-help-row {
      display: flex; align-items: center; gap: 10px;
      padding: 5px 0; border-bottom: 1px solid #27272a20;
    }
    .di-help-row kbd {
      background: #27272a; border: 1px solid #3f3f46; border-radius: 4px;
      padding: 2px 7px; font-size: 11px; font-family: inherit; color: #a1a1aa;
      white-space: nowrap; flex-shrink: 0; min-width: 90px; text-align: center;
    }
    .di-help-row span { font-size: 12px; color: #a1a1aa; }

    /* ── Element bar (shown when element is selected) ── */
    .di-element-bar {
      padding: 8px 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      background: #1c1c1f;
    }
    .di-element-label {
      flex: 1;
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      color: #818cf8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .di-reinspect-btn {
      flex-shrink: 0;
      padding: 4px 10px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      font-family: system-ui, sans-serif;
      transition: border-color 0.12s, color 0.12s, background 0.12s;
      white-space: nowrap;
    }
    .di-reinspect-btn:hover { border-color: #6366f1; color: #818cf8; background: #1e1e2e; }
    .di-reinspect-btn.active { border-color: #6366f1; color: #818cf8; background: #1e1e2e; }

    /* ── Vue component bar ── */
    .di-vue-bar {
      padding: 5px 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      background: #16162a;
    }
    .di-vue-icon { font-size: 11px; color: #7c3aed; flex-shrink: 0; }
    .di-vue-comp-name {
      flex: 1;
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      color: #a78bfa;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .di-vscode-btn {
      flex-shrink: 0;
      padding: 3px 8px;
      background: #1e2433;
      border: 1px solid #1e3a5f;
      border-radius: 6px;
      color: #5b9bd5;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: border-color 0.12s, color 0.12s, background 0.12s;
      font-family: system-ui, sans-serif;
      white-space: nowrap;
    }
    .di-vscode-btn:hover { border-color: #007acc; color: #fff; background: #007acc; }
    .di-vscode-btn svg { flex-shrink: 0; }

    .di-panel-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #52525b;
      gap: 10px;
      padding: 24px;
      text-align: center;
    }
    .di-panel-empty svg { opacity: 0.3; }
    .di-panel-empty p { margin: 0; font-size: 13px; line-height: 1.5; }

    /* The scrollable region is #di-panel-content — a direct flex child of the panel.
       flex: 1 1 0 (base 0) + min-height: 0 forces it to shrink, enabling overflow. */
    #di-panel-content {
      flex: 1 1 0;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    #di-panel-content::-webkit-scrollbar { width: 4px; }
    #di-panel-content::-webkit-scrollbar-track { background: transparent; }
    #di-panel-content::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }

    .di-section-header {
      padding: 12px 16px 5px 14px;
      font-size: 10px;
      font-weight: 700;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-left: 2px solid #6366f1;
      margin-left: 0;
      position: sticky;
      top: 0;
      background: #18181b;
      z-index: 1;
    }

    .di-field {
      padding: 5px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .di-field label {
      flex: 0 0 90px;
      font-size: 11px;
      color: #71717a;
      font-family: 'SF Mono', monospace;
    }
    .di-field-control { flex: 1; display: flex; align-items: center; gap: 5px; min-width: 0; }

    .di-input {
      width: 100%;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      color: #f4f4f5;
      font-size: 12px;
      font-family: 'SF Mono', monospace;
      padding: 4px 8px;
      outline: none;
      transition: border-color 0.12s;
      box-sizing: border-box;
      min-width: 0;
    }
    .di-input:focus { border-color: #6366f1; }

    /* Fix 4: reset button per field */
    .di-reset-btn {
      flex-shrink: 0;
      width: 22px; height: 22px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 5px;
      color: #3f3f46;
      cursor: pointer;
      font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: color 0.12s, border-color 0.12s, background 0.12s;
      padding: 0;
      line-height: 1;
    }
    .di-reset-btn:hover { color: #f97316; border-color: #3f3f46; background: #27272a; }
    .di-reset-btn.changed { color: #f97316; border-color: #431407; }

    /* ── Number stepper (− value +) ── */
    .di-number-wrap {
      display: flex;
      align-items: center;
      gap: 2px;
      width: 100%;
    }
    .di-number-wrap .di-input {
      text-align: center;
      padding: 4px 2px;
      min-width: 0;
    }
    .di-step-btn {
      flex-shrink: 0;
      width: 22px;
      height: 26px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 5px;
      color: #a1a1aa;
      font-size: 15px;
      font-weight: 400;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      line-height: 1;
      user-select: none;
      transition: background 0.1s, color 0.1s;
    }
    .di-step-btn:hover { background: #3f3f46; color: #fff; }
    .di-step-btn:active { background: #6366f1; color: #fff; border-color: #6366f1; }
    /* Smaller variant for spacing grid cells */
    .di-step-sm {
      width: 16px;
      height: 20px;
      font-size: 12px;
      border-radius: 3px;
    }

    /* ── Panel textarea (text content editor) ── */
    .di-text-area {
      width: 100%;
      resize: vertical;
      min-height: 56px;
      font-family: system-ui, sans-serif;
      line-height: 1.5;
      font-size: 12px;
      box-sizing: border-box;
    }
    .di-text-hint {
      font-size: 10px;
      color: #52525b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .di-edit-on-page-btn {
      padding: 3px 10px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 5px;
      color: #a1a1aa;
      font-size: 11px;
      cursor: pointer;
      font-family: system-ui, sans-serif;
      transition: border-color 0.12s, color 0.12s;
      white-space: nowrap;
    }
    .di-edit-on-page-btn:hover { border-color: #6366f1; color: #818cf8; }
    .di-edit-on-page-btn.editing { border-color: #6366f1; color: #818cf8; background: #1e1e2e; }

    .di-color-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
      width: 100%;
      min-width: 0;
    }
    .di-color-swatch {
      width: 24px; height: 24px;
      border-radius: 5px;
      border: 1px solid #3f3f46;
      cursor: pointer;
      flex-shrink: 0;
      overflow: hidden;
      padding: 0;
      background: transparent;
      position: relative;
    }
    .di-color-swatch input[type="color"] {
      width: 36px; height: 36px;
      border: none;
      background: transparent;
      cursor: pointer;
      margin: -6px;
      opacity: 0;
      position: absolute;
    }

    .di-text-edit-btn {
      width: 100%;
      padding: 6px 10px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      color: #a1a1aa;
      font-size: 12px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.12s, color 0.12s;
      font-family: system-ui, sans-serif;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .di-text-edit-btn:hover { border-color: #6366f1; color: #f4f4f5; }
    .di-text-edit-btn.editing {
      border-color: #6366f1;
      color: #f4f4f5;
      background: #1e1e2e;
    }

    .di-spacing-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      width: 100%;
    }
    .di-spacing-grid .di-input { font-size: 11px; padding: 3px 6px; }

    .di-panel-footer {
      padding: 12px 16px;
      border-top: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    .di-btn {
      width: 100%;
      padding: 9px;
      border-radius: 8px;
      border: none;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.12s, transform 0.1s;
      font-family: system-ui, sans-serif;
    }
    .di-btn:hover { opacity: 0.88; }
    .di-btn:active { transform: scale(0.98); }
    .di-btn-primary { background: #6366f1; color: #fff; }
    .di-btn-ghost {
      background: #27272a;
      color: #a1a1aa;
      border: 1px solid #3f3f46;
    }
    .di-btn-ghost:hover { color: #f4f4f5; }

    .di-feedback-count {
      font-size: 11px;
      color: #71717a;
      text-align: center;
    }

    /* ── Changes toggle button ── */
    .di-changes-toggle {
      width: 100%;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      color: #a1a1aa;
      padding: 7px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      transition: background 0.12s, color 0.12s;
      text-align: left;
    }
    .di-changes-toggle:hover { background: #3f3f46; color: #f4f4f5; }
    .di-changes-toggle.has-changes { color: #c4b5fd; border-color: #4c1d95; background: #1e1b2e; }
    .di-changes-toggle.has-changes:hover { background: #2e2a42; }
    .di-toggle-arrow { transition: transform 0.18s; font-size: 11px; }
    .di-toggle-arrow.open { transform: rotate(180deg); }

    /* ── Changes log (collapsable list) ── */
    .di-changes-log {
      max-height: 220px;
      overflow-y: auto;
      overscroll-behavior: contain;
      border: 1px solid #27272a;
      border-radius: 8px;
      background: #0f0f11;
      margin-bottom: 4px;
    }
    .di-changes-log::-webkit-scrollbar { width: 3px; }
    .di-changes-log::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
    .di-change-group { padding: 8px 10px 6px; border-bottom: 1px solid #1c1c1f; }
    .di-change-group:last-child { border-bottom: none; }
    .di-change-selector {
      font-family: 'SF Mono', monospace;
      font-size: 10px;
      color: #818cf8;
      font-weight: 600;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .di-change-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-family: 'SF Mono', monospace;
      font-size: 10px;
      padding: 1px 0;
    }
    .di-change-prop { color: #71717a; flex-shrink: 0; }
    .di-change-from { color: #f87171; text-decoration: line-through; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .di-change-arrow { color: #52525b; flex-shrink: 0; }
    .di-change-to { color: #86efac; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── Image section ── */
    .di-img-preview {
      width: 100%;
      max-height: 90px;
      object-fit: contain;
      border-radius: 6px;
      background: #27272a;
      display: block;
    }
    .di-img-meta {
      font-size: 10px;
      color: #52525b;
      font-family: 'SF Mono', monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Copy flash ── */
    .di-copied-flash {
      position: fixed;
      bottom: 76px;
      right: 20px;
      background: #22c55e;
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      font-family: system-ui, sans-serif;
      z-index: 2147483645;
      animation: diFadeUp 2s ease forwards;
    }
    @keyframes diFadeUp {
      0% { opacity: 0; transform: translateY(6px); }
      15% { opacity: 1; transform: translateY(0); }
      75% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-4px); }
    }

    /* ── Box model visualization overlays ── */
    .di-bm-area {
      position: fixed;
      pointer-events: none;
      z-index: 2147483636;
      box-sizing: border-box;
      display: none;
      align-items: center;
      justify-content: center;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 9px;
      font-weight: 600;
      overflow: hidden;
      white-space: nowrap;
    }
    /* Margin: orange */
    .di-bm-mt, .di-bm-mr, .di-bm-mb, .di-bm-ml {
      background: rgba(246, 178, 107, 0.38);
      color: rgba(120, 70, 0, 0.9);
    }
    /* Padding: green */
    .di-bm-pt, .di-bm-pr, .di-bm-pb, .di-bm-pl {
      background: rgba(147, 196, 125, 0.38);
      color: rgba(30, 90, 30, 0.9);
    }
    /* Content: blue */
    .di-bm-content {
      background: rgba(111, 168, 220, 0.15);
      border: 1px dashed rgba(111, 168, 220, 0.5);
    }
    /* Gap: purple */
    .di-bm-gap {
      position: fixed;
      pointer-events: none;
      z-index: 2147483636;
      background: rgba(167, 139, 250, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'SF Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      color: rgba(109, 40, 217, 0.9);
      overflow: hidden;
      white-space: nowrap;
      box-sizing: border-box;
    }

    /* ── Element badge on overlay ── */
    .di-overlay-badge {
      position: absolute;
      left: -1px;
      top: -22px;
      background: #6366f1;
      color: #fff;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px 4px 0 0;
      white-space: nowrap;
      pointer-events: none;
      line-height: 1.6;
      letter-spacing: 0.02em;
      z-index: 1;
    }
    #__dev_inspector_overlay__.selected .di-overlay-badge { background: #22c55e; }

    /* ── Hover overlay (shown when an element is selected and user hovers others) ── */
    #__dev_inspector_hover_overlay__ {
      position: fixed;
      z-index: 2147483637;
      pointer-events: none;
      border: 2px dashed #a78bfa;
      background: rgba(167,139,250,0.07);
      border-radius: 3px;
      box-sizing: border-box;
    }
    #__dev_inspector_hover_overlay__ .di-overlay-badge { background: #7c3aed; }

    /* ── Figma-style spacing measurement lines ── */
    .di-spacing-line {
      position: fixed;
      z-index: 2147483637;
      pointer-events: none;
      background: #f43f5e;
      box-sizing: border-box;
    }
    .di-spacing-label {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f43f5e;
      color: #fff;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      white-space: nowrap;
      line-height: 1.6;
    }

    /* ── Mode tabs (Element / Class) ── */
    .di-tab-row {
      display: flex;
      padding: 6px 10px;
      gap: 4px;
      border-bottom: 1px solid #27272a;
      flex-shrink: 0;
      background: #18181b;
    }
    .di-tab {
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: #71717a;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      font-family: 'SF Mono', 'Fira Code', monospace;
      transition: color 0.12s, background 0.12s, border-color 0.12s;
      white-space: nowrap;
    }
    .di-tab:hover:not(:disabled) { color: #e4e4e7; background: #27272a; }
    .di-tab.active { background: #27272a; border-color: #6366f1; color: #818cf8; }
    .di-tab:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ── Inspect cursor mode ── */
    body.di-inspect-mode * { cursor: crosshair !important; }

    /* ── Agentic mode button (above the cog) ── */
    #__dev_inspector_agentic_btn__ {
      position: fixed;
      bottom: 74px;
      right: 20px;
      z-index: 2147483640;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #18181b;
      border: 1.5px solid #3f3f46;
      color: #a1a1aa;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      transition: background 0.15s, transform 0.15s, border-color 0.15s, color 0.15s;
      font-family: system-ui, sans-serif;
      user-select: none;
    }
    #__dev_inspector_agentic_btn__:hover { background: #27272a; transform: scale(1.08); color: #c4b5fd; border-color: #6366f1; }
    #__dev_inspector_agentic_btn__.active { background: #4c1d95; border-color: #7c3aed; color: #fff; }
    #__dev_inspector_agentic_btn__ svg { pointer-events: none; }

    /* ── Agentic cursor mode ── */
    body.di-agentic-mode * { cursor: crosshair !important; }
    body.di-agentic-mode #__dev_inspector_agentic_btn__ { cursor: pointer !important; }
    body.di-agentic-mode #__dev_inspector__ { cursor: pointer !important; }

    /* ── Agentic overlay (purple highlight for agentic selection) ── */
    .di-agentic-hover {
      position: fixed;
      z-index: 2147483638;
      pointer-events: none;
      border: 2px solid #7c3aed;
      background: rgba(124,58,237,0.1);
      border-radius: 3px;
      box-sizing: border-box;
      transition: all 0.08s ease-out;
    }

    /* ── Prompt popover ── */
    #__dev_inspector_prompt__ {
      position: fixed;
      z-index: 2147483645;
      width: 340px;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 12px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: #e4e4e7;
      overflow: hidden;
    }
    .di-prompt-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid #27272a;
      background: #1c1c1f;
    }
    .di-prompt-element-label {
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      color: #7c3aed;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .di-prompt-close {
      width: 22px; height: 22px;
      background: #27272a;
      border: none;
      border-radius: 5px;
      color: #71717a;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
      transition: background 0.12s, color 0.12s;
      flex-shrink: 0;
    }
    .di-prompt-close:hover { background: #3f3f46; color: #fff; }
    .di-prompt-body { padding: 10px 14px; }
    .di-prompt-input {
      width: 100%;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      color: #f4f4f5;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      padding: 10px 12px;
      outline: none;
      resize: vertical;
      min-height: 52px;
      max-height: 200px;
      line-height: 1.5;
      box-sizing: border-box;
      transition: border-color 0.12s;
    }
    .di-prompt-input:focus { border-color: #7c3aed; }
    .di-prompt-input::placeholder { color: #52525b; }
    .di-prompt-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px 12px;
      gap: 8px;
    }
    .di-prompt-hint {
      font-size: 10px;
      color: #52525b;
      flex: 1;
    }
    .di-prompt-apply {
      padding: 7px 16px;
      background: #7c3aed;
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: system-ui, sans-serif;
      transition: background 0.12s, transform 0.1s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .di-prompt-apply:hover { background: #6d28d9; }
    .di-prompt-apply:active { transform: scale(0.97); }
    .di-prompt-apply:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Agent status panel (bottom-left) ── */
    #__dev_inspector_agent_status__ {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 2147483644;
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
      pointer-events: auto;
    }
    .di-agent-card {
      width: 280px;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 10px;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      color: #e4e4e7;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      animation: diSlideUp 0.25s ease-out;
    }
    @keyframes diSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .di-agent-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid #27272a;
      background: #1c1c1f;
    }
    .di-agent-element {
      flex: 1;
      font-family: 'SF Mono', monospace;
      font-size: 10px;
      color: #a78bfa;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .di-agent-status {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      flex-shrink: 0;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .di-agent-starting { background: #27272a; color: #a1a1aa; }
    .di-agent-running { background: #1e1b4b; color: #818cf8; }
    .di-agent-done { background: #052e16; color: #4ade80; }
    .di-agent-error { background: #450a0a; color: #f87171; }
    .di-agent-cancel {
      width: 18px; height: 18px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: #52525b;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px;
      transition: color 0.12s, background 0.12s;
      flex-shrink: 0;
      padding: 0;
    }
    .di-agent-cancel:hover { color: #f87171; background: #27272a; }
    .di-agent-progress { padding: 8px 10px; }
    .di-agent-step {
      font-size: 11px;
      color: #71717a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .di-agent-card.done { border-color: #166534; }
    .di-agent-card.error { border-color: #7f1d1d; }
    .di-agent-card.fade-out { animation: diFadeOut 0.5s ease forwards; }
    @keyframes diFadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-8px); }
    }

    /* ── Agentic mode flash messages ── */
    .di-agentic-flash {
      position: fixed;
      bottom: 76px;
      left: 20px;
      background: #7c3aed;
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      font-family: system-ui, sans-serif;
      z-index: 2147483645;
      animation: diFadeUp 2.5s ease forwards;
    }
  `
  document.head.appendChild(style)
}

export function createCogButton() {
  const btn = document.createElement('button')
  btn.id = INSPECTOR_ID
  btn.title = 'Dev Inspector'
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`
  document.body.appendChild(btn)
  return btn
}

export function createOverlay() {
  const el = document.createElement('div')
  el.id = OVERLAY_ID
  el.style.display = 'none'
  const badge = document.createElement('div')
  badge.className = 'di-overlay-badge'
  el.appendChild(badge)
  document.body.appendChild(el)
  return el
}

export function createTooltip() {
  const el = document.createElement('div')
  el.id = TOOLTIP_ID
  el.style.display = 'none'
  document.body.appendChild(el)
  return el
}

export function createPanel() {
  const el = document.createElement('div')
  el.id = PANEL_ID
  el.innerHTML = `
    <div class="di-resize-handle" id="di-resize-handle"></div>
    <div class="di-panel-header">
      <h3>Dev Inspector</h3>
      <button class="di-collapse-btn" id="di-collapse-btn" title="Collapse panel">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      <button class="di-help-btn" id="di-help-btn" title="Keyboard shortcuts">?</button>
      <button class="di-close" id="di-close-panel">✕</button>
    </div>
    <div class="di-help-modal" id="di-help-modal" style="display:none;">
      <div class="di-help-header">
        <span>Shortcuts &amp; Controls</span>
        <button class="di-help-close" id="di-help-close">✕</button>
      </div>
      <div class="di-help-body">
        <div class="di-help-section">Inspect mode</div>
        <div class="di-help-row"><kbd>Click</kbd><span>Select element (parent-first)</span></div>
        <div class="di-help-row"><kbd>Ctrl+Click</kbd><span>Select exact deepest element</span></div>
        <div class="di-help-row"><kbd>Esc</kbd><span>Exit inspect mode</span></div>
        <div class="di-help-section">Panel mode</div>
        <div class="di-help-row"><kbd>Click</kbd><span>Select at current depth level</span></div>
        <div class="di-help-row"><kbd>Double-click</kbd><span>Drill one level deeper</span></div>
        <div class="di-help-row"><kbd>Ctrl+Click</kbd><span>Jump to exact element</span></div>
        <div class="di-help-row"><kbd>Alt+Hover</kbd><span>Show spacing between elements</span></div>
        <div class="di-help-row"><kbd>A+Hover</kbd><span>Show style tooltip on selected</span></div>
        <div class="di-help-section">Global</div>
        <div class="di-help-row"><kbd>I</kbd><span>Toggle inspect mode</span></div>
        <div class="di-help-row"><kbd>Esc</kbd><span>Close panel</span></div>
      </div>
    </div>
    <div class="di-element-bar" id="di-element-bar" style="display:none;">
      <span class="di-element-label" id="di-element-label"></span>
      <button class="di-reinspect-btn" id="di-reinspect-btn">↖ Pick</button>
    </div>
    <div class="di-vue-bar" id="di-vue-bar" style="display:none;">
      <span class="di-vue-icon" id="di-vue-icon">⬡</span>
      <span class="di-vue-comp-name" id="di-vue-comp-name"></span>
      <button class="di-vscode-btn" id="di-vscode-btn" style="display:none;" title="Open in VS Code">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
        </svg>
        Open in VS Code
      </button>
    </div>
    <div class="di-tab-row" id="di-tab-row" style="display:none;">
      <button class="di-tab active" id="di-tab-element">Element</button>
      <button class="di-tab" id="di-tab-class"><span id="di-tab-class-label">.class</span></button>
    </div>
    <div id="di-panel-content">
      <div class="di-panel-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>Click any element on the page to inspect and edit it</p>
      </div>
    </div>
    <div class="di-panel-footer" id="di-panel-footer" style="display:none;">
      <div class="di-changes-log" id="di-changes-log" style="display:none;">
        <div id="di-changes-list"></div>
      </div>
      <button class="di-changes-toggle" id="di-changes-toggle">
        <span id="di-feedback-count">No changes yet</span>
        <span class="di-toggle-arrow" id="di-toggle-arrow">▾</span>
      </button>
      <button class="di-btn di-btn-primary" id="di-copy-feedback">Copy Feedback</button>
      <button class="di-btn di-btn-ghost" id="di-clear-changes">Clear All Changes</button>
    </div>
  `
  document.body.appendChild(el)
  return el
}

export function createBoxModelOverlay() {
  const container = document.createElement('div')
  container.id = '__dev_inspector_boxmodel__'
  container.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:2147483636;'
  const keys = ['mt','mr','mb','ml','pt','pr','pb','pl','content']
  keys.forEach(k => {
    const div = document.createElement('div')
    div.id = `__di_bm_${k}__`
    div.className = `di-bm-area di-bm-${k}`
    container.appendChild(div)
  })
  document.body.appendChild(container)
  return container
}

const VUE_WRAPPERS = new Set([
  'Transition', 'TransitionGroup', 'BaseTransition',
  'KeepAlive', 'Suspense', 'Teleport',
  'RouterView', 'RouterLink',
  'NuxtPage', 'NuxtLayout', 'NuxtLink', 'NuxtLoadingIndicator',
])

const REACT_WRAPPERS_BADGE = new Set([
  'StrictMode', 'Fragment', 'Suspense', 'SuspenseList', 'Profiler',
  'BrowserRouter', 'HashRouter', 'MemoryRouter', 'Router', 'StaticRouter',
  'Routes', 'Route', 'Switch', 'Outlet', 'RouterProvider',
  'Link', 'NavLink', 'Navigate', 'ScrollRestoration',
])

function getReactFiberBadge(el) {
  const key = Object.keys(el).find(k =>
    k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  )
  return key ? el[key] : null
}

function getReactComponentName(el) {
  const fiber = getReactFiberBadge(el)
  if (!fiber) return null
  let node = fiber
  while (node) {
    const type = node.type
    let name = null
    if (typeof type === 'function') name = type.displayName || type.name
    else if (type && typeof type === 'object') name = type.displayName || type.render?.name || type.type?.name
    if (name && /^[A-Z]/.test(name) && !REACT_WRAPPERS_BADGE.has(name)) return name
    node = node.return
  }
  return null
}

function getComponentBadgeLabel(el) {
  // Vue boundary check
  const instance = el.__vueParentComponent
  if (instance?.type && typeof instance.type === 'object') {
    const name = instance.type.__name || instance.type.name
    if (name && !VUE_WRAPPERS.has(name)) {
      const parentInstance = el.parentElement?.__vueParentComponent
      if (instance !== parentInstance) return `<${name}>`
    }
  }
  // React boundary check
  const reactName = getReactComponentName(el)
  if (reactName) {
    const parentReactName = el.parentElement ? getReactComponentName(el.parentElement) : null
    if (reactName !== parentReactName) return `<${reactName}>`
  }
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls = [...el.classList]
    .filter(c => !c.startsWith('di-') && !c.startsWith('__dev'))
    .slice(0, 2).map(c => `.${c}`).join('')
  return `${tag}${id}${cls}`
}

// Fix 1: use raw viewport coords (fixed positioning needs no scrollY offset)
export function updateOverlay(overlay, el) {
  if (!el) { overlay.style.display = 'none'; return }
  const rect = el.getBoundingClientRect()
  overlay.style.display = 'block'
  overlay.style.top = rect.top + 'px'
  overlay.style.left = rect.left + 'px'
  overlay.style.width = rect.width + 'px'
  overlay.style.height = rect.height + 'px'
  const badge = overlay.querySelector('.di-overlay-badge')
  if (badge) {
    badge.textContent = getComponentBadgeLabel(el)
    // Selected badge always sits above the element (static position)
    badge.style.top = '-22px'
    badge.style.borderRadius = '4px 4px 0 0'
  }
}

export function createHoverOverlay() {
  const el = document.createElement('div')
  el.id = '__dev_inspector_hover_overlay__'
  el.style.display = 'none'
  const badge = document.createElement('div')
  badge.className = 'di-overlay-badge'
  el.appendChild(badge)
  document.body.appendChild(el)
  return el
}

export function updateHoverOverlay(overlay, el) {
  if (!el) { overlay.style.display = 'none'; return }
  const rect = el.getBoundingClientRect()
  overlay.style.display = 'block'
  overlay.style.top = rect.top + 'px'
  overlay.style.left = rect.left + 'px'
  overlay.style.width = rect.width + 'px'
  overlay.style.height = rect.height + 'px'
  const badge = overlay.querySelector('.di-overlay-badge')
  if (badge) {
    badge.textContent = getComponentBadgeLabel(el)
    // Hover badge always sits below the highlighted element
    badge.style.top = 'calc(100% + 2px)'
    badge.style.borderRadius = '0 0 4px 4px'
  }
}

export function createSpacingOverlay() {
  const el = document.createElement('div')
  el.id = '__dev_inspector_spacing__'
  el.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:2147483637;width:0;height:0;overflow:visible;'
  document.body.appendChild(el)
  return el
}

export function hideSpacing(container) {
  container.innerHTML = ''
}

export function updateSpacing(container, selEl, hovEl) {
  container.innerHTML = ''
  if (!selEl || !hovEl) return
  const sR = selEl.getBoundingClientRect()
  const hR = hovEl.getBoundingClientRect()

  const hOverlap = sR.right > hR.left && hR.right > sR.left
  const vOverlap = sR.bottom > hR.top && hR.bottom > sR.top
  const lines = []

  if (!hOverlap && !vOverlap) {
    // ── Diagonal: L-shaped measurement anchored at the nearest corner ─────────
    const isBelowV = hR.top >= sR.bottom
    const isRightH = hR.left >= sR.right

    const vGap = Math.round(isBelowV ? hR.top - sR.bottom : sR.top - hR.bottom)
    const hGap = Math.round(isRightH ? hR.left - sR.right : sR.left - hR.right)

    // Corner of the L: sR's nearest horizontal edge × hR's nearest vertical edge
    const cornerX = isRightH ? sR.right : sR.left
    const cornerY = isBelowV ? hR.top   : hR.bottom

    // Vertical segment: from sR's bottom/top down/up to cornerY
    const vY1 = isBelowV ? sR.bottom : cornerY
    const vY2 = isBelowV ? cornerY   : sR.top
    if (vGap > 0) lines.push({ x: cornerX - 0.5, y: vY1, w: 1, h: vY2 - vY1, label: vGap + 'px' })

    // Horizontal segment: from cornerX across to hR's nearest edge, at cornerY
    const hX1 = isRightH ? cornerX  : hR.right
    const hX2 = isRightH ? hR.left  : cornerX
    if (hGap > 0) lines.push({ x: hX1, y: cornerY - 0.5, w: hX2 - hX1, h: 1, label: hGap + 'px' })

  } else if (!hOverlap) {
    // ── Side by side (vertical overlap): single horizontal gap line ───────────
    const isRight = hR.left > sR.right
    const x1 = isRight ? sR.right : hR.right
    const x2 = isRight ? hR.left  : sR.left
    const gap = Math.round(x2 - x1)
    if (gap > 0) {
      const y = (Math.max(sR.top, hR.top) + Math.min(sR.bottom, hR.bottom)) / 2
      lines.push({ x: x1, y: y - 0.5, w: x2 - x1, h: 1, label: gap + 'px' })
    }

  } else if (!vOverlap) {
    // ── Stacked (horizontal overlap): single vertical gap line ────────────────
    const isBelow = hR.top > sR.bottom
    const y1 = isBelow ? sR.bottom : hR.bottom
    const y2 = isBelow ? hR.top    : sR.top
    const gap = Math.round(y2 - y1)
    if (gap > 0) {
      const x = (Math.max(sR.left, hR.left) + Math.min(sR.right, hR.right)) / 2
      lines.push({ x: x - 0.5, y: y1, w: 1, h: y2 - y1, label: gap + 'px' })
    }
  }

  if (hOverlap && vOverlap) {
    // Elements overlap: show internal edge distances
    const cx = (sR.left + sR.right) / 2
    const cy = (sR.top + sR.bottom) / 2
    const top    = hR.top    - sR.top
    const bottom = sR.bottom - hR.bottom
    const left   = hR.left   - sR.left
    const right  = sR.right  - hR.right
    if (Math.abs(top)    > 1) lines.push({ x: cx - 0.5, y: Math.min(sR.top, hR.top),       w: 1, h: Math.abs(top),    label: Math.abs(Math.round(top))    + 'px' })
    if (Math.abs(bottom) > 1) lines.push({ x: cx - 0.5, y: Math.min(sR.bottom, hR.bottom), w: 1, h: Math.abs(bottom), label: Math.abs(Math.round(bottom)) + 'px' })
    if (Math.abs(left)   > 1) lines.push({ x: Math.min(sR.left,  hR.left),  y: cy - 0.5, w: Math.abs(left),  h: 1, label: Math.abs(Math.round(left))  + 'px' })
    if (Math.abs(right)  > 1) lines.push({ x: Math.min(sR.right, hR.right), y: cy - 0.5, w: Math.abs(right), h: 1, label: Math.abs(Math.round(right)) + 'px' })
  }

  lines.forEach(({ x, y, w, h, label }) => {
    const line = document.createElement('div')
    line.className = 'di-spacing-line'
    line.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`
    const lbl = document.createElement('span')
    lbl.className = 'di-spacing-label'
    lbl.textContent = label
    line.appendChild(lbl)
    container.appendChild(line)
  })
}

export function positionTooltip(tooltip, x, y) {
  const margin = 16
  const tw = tooltip.offsetWidth || 230
  const th = tooltip.offsetHeight || 180
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = x + 14
  let top = y + 14

  if (left + tw > vw - margin) left = x - tw - 14
  if (top + th > vh - margin) top = y - th - 14
  if (left < margin) left = margin
  if (top < margin) top = margin

  tooltip.style.left = left + 'px'
  tooltip.style.top = top + 'px'
}

export function showCopiedFlash(message = 'Feedback copied!') {
  const existing = document.querySelector('.di-copied-flash')
  if (existing) existing.remove()
  const el = document.createElement('div')
  el.className = 'di-copied-flash'
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2100)
}

export function colorToHex(color) {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null
  if (color.startsWith('#')) return color
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function buildSelector(el) {
  if (el.id) return `#${el.id}`
  const tag = el.tagName.toLowerCase()
  const classes = [...el.classList]
    .filter(c => !c.startsWith('di-') && !c.startsWith('__dev'))
    .slice(0, 2)
    .map(c => `.${c}`)
    .join('')
  const parent = el.parentElement
  if (!parent || parent === document.body) return `${tag}${classes}`
  return `${buildSelector(parent)} > ${tag}${classes}`
}
