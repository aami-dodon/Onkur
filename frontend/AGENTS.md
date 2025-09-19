# Frontend HTML & Vite Guidelines

- Preserve the `crossorigin="anonymous"` attribute on module entry scripts in `index.html` so Cloudflare Rocket Loader and Vite preloads share the same credentials mode.
- If you add or rename modulepreload tags or adjust Vite HTML transforms, update the `ensure-crossorigin-attributes` plugin in `vite.config.js` to keep the injected scripts in sync.
- Load external fonts via `<link>` tags in `index.html` rather than `@import` directives inside CSS files.
