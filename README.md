# Editor

<p align="center">
  <strong>Line-level markdown editor with instant preview.</strong><br>
  <sub>Preview first, click any line to edit raw markdown.</sub>
</p>

<p align="center">
  <a href="https://sanath-editor.netlify.app"><strong>Try it now</strong></a>
</p>

---

## Why Editor?

- **Line-level editing** - Preview by default, click a line to edit only that line
- **Fast** - Single-file app, instant load
- **Markdown-native** - Full GFM support without context switching
- **Shareable** - Document state compressed into URL hash
- **Focused UX** - Built for writing, not fighting the editor

## Features

### Editing Experience
- **Hybrid mode** - Rendered preview + inline raw editing
- **Contenteditable lines** - No modal editors or detached input boxes
- **Keyboard-first** - Smooth line navigation and formatting shortcuts
- **List continuation** - Press Enter to continue bullets, numbered lists, checklists
- **Multi-line paste** - Pasted blocks split correctly across lines

### Markdown Support
- **Core formatting** - Headings, bold, italic, strikethrough, links
- **Blocks** - Blockquotes, code blocks, horizontal rules
- **Lists** - Ordered, unordered, nested lists, checklists
- **Tables** - Full table rendering and editing
- **Collapsible sections** - Heading-level collapse/expand

### Table Editor
- **Cell-level editing** - Click any cell and edit directly
- **Navigation** - Tab and Enter across cells
- **Structure controls** - Add/remove rows and columns
- **Inline behavior** - Stay in flow without leaving preview mode

### State & Sharing
- **URL hash storage** - LZ-compressed state in URL fragment
- **Share links** - Send a link with full doc state included
- **Export** - Download as `.md`
- **Undo/redo** - Built-in history handling

## Quick Start

**Online:** [sanath-editor.netlify.app](https://sanath-editor.netlify.app)

**Local:**
```bash
git clone https://github.com/sanathks/editor.git
cd editor
npx serve
```

Or open `index.html` directly.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+K` | Link |
| `Tab` | Indent / table navigation |
| `Enter` | New line / continue list / table navigation |
| `Arrow Up/Down` | Line navigation |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Architecture:** Single-page app (`index.html`)
- **Storage:** URL hash (client-side only)
- **Theme:** Tokyo Night Storm
- **Deploy:** Netlify

## Project Status

- Core editing UX is complete
- Icon set and favicon configured
- Remaining work is polish, edge-case testing, and custom domain setup (`editor.sanath.dev`)

## License

MIT

---

<p align="center">
  Made by <a href="https://sanath.dev">Sanath</a>
</p>
