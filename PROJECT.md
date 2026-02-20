# Editor - Markdown Editor

A line-level hybrid markdown editor with Tokyo Night Storm theme, matching the Draph design language.

## Links
- **Live:** https://sanath-editor.netlify.app
- **Planned domain:** editor.sanath.dev
- **Netlify site:** sanath-editor

## Architecture
- Single `index.html` file (no build step, no API)
- Line-level editing: document stored as array of lines, each line renders as preview by default
- Click any line to edit raw markdown via `contenteditable` (no input boxes)
- Interactive table component with cell-level editing
- URL hash storage with LZ-string compression for sharing
- Tokyo Night Storm color palette, Draph-style toolbar

## Tech
- Tailwind CSS (CDN)
- marked.js for markdown parsing
- LZ-string for URL compression
- No framework, vanilla JS

## Features
- Full GFM (headings, bold/italic/strikethrough, lists, checklists, tables, code blocks, blockquotes, HR)
- Line-level contenteditable editing
- Interactive tables (cell edit, Tab/Enter nav, add/delete rows & cols)
- Clickable checkboxes with green + strikethrough
- Collapsible headings
- Keyboard shortcuts (Ctrl+B/I/K, Tab indent, arrow keys, Enter list continuation)
- Multi-line paste
- Undo/redo
- Export .md, share link

## Deploy
```bash
source ~/.env.openclaw
cd ~/Code/editor
NETLIFY_AUTH_TOKEN=$NETLIFY_AUTH_TOKEN npx netlify-cli deploy --prod --dir=.
```

## TODO
- [ ] Custom domain (editor.sanath.dev)
- [ ] GitHub repo (public, like draph)
- [ ] Favicon / logo
- [ ] Syntax highlighting in code blocks
- [ ] Image drag & drop support
- [ ] More table polish (resize columns?)
- [ ] Mobile responsiveness
