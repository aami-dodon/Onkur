# Frontend HTML & Vite Guidelines

- Preserve the `crossorigin="anonymous"` attribute on module entry scripts in `index.html` so Cloudflare Rocket Loader and Vite preloads share the same credentials mode.
- If you add or rename modulepreload tags or adjust Vite HTML transforms, update the `ensure-crossorigin-attributes` plugin in `vite.config.js` to keep the injected scripts in sync.
- Load Google Fonts via `<link>` tags in `index.html` (not `@import`) and include `display=swap` so rendering stays non-blocking.
- Avoid committing binary font assets; rely on the Google Fonts API with latin subsets when adjusting typography and note any changes in the wiki.
