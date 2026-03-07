# aetherx-ui-inspector

A zero-config, dev-only UI inspector with live CSS editing, box model visualization, and one-click **Open in VS Code**. Works with Vue, React, or plain HTML — automatically disabled in production.

---

## Installation

```bash
npm install aetherx-ui-inspector
```

---

## Usage

### Vue 3

```vue
<!-- App.vue or layouts/default.vue -->
<script setup>
import DevInspector from 'aetherx-ui-inspector/vue'
const isDev = import.meta.env.DEV
</script>

<template>
  <!-- Nuxt: wrap in <ClientOnly> -->
  <ClientOnly>
    <DevInspector v-if="isDev" />
  </ClientOnly>
</template>
```

### React

```jsx
// app/layout.jsx or _app.jsx
import DevInspector from 'aetherx-ui-inspector/react'

export default function Layout({ children }) {
  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && <DevInspector />}
    </>
  )
}
```

### Plain HTML / Vanilla JS

```js
// Auto-init — just importing is enough, no function call needed
import 'aetherx-ui-inspector'
```

Or with a manual call if you need options:

```js
import { init } from 'aetherx-ui-inspector'
init()
```

---

## Features

**Inspect mode** — click the ⚙ cog button (bottom-right) to enter inspect mode. Hover any element to see a tooltip with its component name, size, typography, colors, spacing, and layout info.

**Side panel** — clicking an element opens a panel with live editors for every CSS property: size, typography, background, padding, margin, border, layout, position, and more. Changes apply instantly on the page.

**Box model overlay** — selected elements show color-coded margin (orange), padding (green), content (blue), and flex/grid gap (purple) regions directly on the page.

**Element / Class tab** — switch between editing inline styles on the element or editing via its CSS class rule, so changes apply to all matching elements at once.

**Figma-style depth navigation**
- Single click → selects at the current depth level (parent-first)
- Double-click → drills one level deeper into the selected element
- `Ctrl+Click` → jumps to the exact deepest element

**Spacing measurement** — while an element is selected, hold `Alt` and hover another element to see Figma-style distance lines between them.

**Text editing** — elements with direct text content show a textarea in the panel, plus an "Edit on page" button for in-place editing. Press `Esc` to revert.

**Image info** — images show a preview, natural dimensions, alt text, and a download button in the panel.

**Open in VS Code** — when inspecting a Vue or React component, a button appears to jump directly to the source file at the exact line and column. Only shown on localhost.

**Change tracker** — every edit is tracked. The panel footer shows a live count, a log of all changes (grouped by element), a **Copy Feedback** button that copies a Markdown summary to clipboard, and a **Clear All Changes** button that also reverts the DOM.

**Panel resize & collapse** — drag the left edge to resize the panel, or click the collapse button to shrink it to a narrow strip without closing it.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Exit inspect mode / close panel |
| `I` | Toggle inspect mode while panel is open |
| `A` + hover | Show style tooltip on the currently selected element |
| `↑` / `↓` | Increase / decrease numeric values in focused inputs |
| `Shift+↑/↓` | Step by 10 |
| `Alt+↑/↓` | Step by 0.1 |

---

## Open in VS Code — `rootPath` option

The VS Code button builds a `vscode://file/` URL from the component's `__file` path. In most Vite setups `__file` is already absolute, so it works without any configuration.

If your `__file` values are relative (e.g. `layouts/landing.vue` instead of `/D:/Work/project/layouts/landing.vue`), pass your project's absolute root path:

**Vue**
```vue
<DevInspector v-if="isDev" root-path="D:/Work/my-project" />
```

**React**
```jsx
<DevInspector rootPath="D:/Work/my-project" />
```

**Plain JS**
```js
import { init } from 'aetherx-ui-inspector'
init({ rootPath: 'D:/Work/my-project' })
```

Using an env variable keeps it clean:

```vue
<DevInspector v-if="isDev" :root-path="import.meta.env.VITE_PROJECT_ROOT" />
```

```env
# .env.local
VITE_PROJECT_ROOT=D:/Work/my-project
```

> **Note:** The `rootPath` option was added in v1.3.11. Earlier versions without it are unaffected — the option is optional and defaults to `''`.

---

## Production safety

The inspector only mounts on `localhost`, `127.0.0.1`, `::1`, `.local` domains, and bare IP addresses. It never loads in production builds.

- Vue / React wrappers: controlled by your `v-if="isDev"` / `NODE_ENV` check — never rendered in production
- Auto-init (`import 'aetherx-ui-inspector'`): skips mounting if `NODE_ENV === 'production'`

---

## Backward compatibility

All changes are fully backward compatible. Existing code requires no updates:

```js
// Still works — nothing changed
import 'aetherx-ui-inspector'
init()
```

```vue
<!-- Still works — rootPath prop is optional -->
<DevInspector v-if="isDev" />
```

```jsx
// Still works — rootPath prop is optional
<DevInspector />
```

---

## License

MIT
