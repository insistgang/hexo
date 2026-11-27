# Luyao Main-Domain Entry

## Objective

Serve the Luyao application at `https://insistgang.top/luyao/` without moving the blog or changing DNS. This static full-screen entry embeds the existing Aliyun application at `https://dmp.insistgang.top/luyao/`; it is not a same-origin backend proxy. Chat and voice still require a configured server-side MiniMax Key.

## Commands

- Tests: `npm test`
- Build: `npm run build`
- Generated asset audit: `npm run audit`

## Structure And Style

- `source/luyao/index.html`: standalone HTML with Hexo `layout: false`, a Chinese title, viewport-filling iframe, and no blog layout or marketing screen.
- `source/img/luyao-ai/luyao-avatar.png`: unchanged original portrait used as the entry favicon.
- `test/luyao-entry.test.js`: Node test-runner checks for route, embed URL, file signature, and security settings.

## Verification

The generated route and favicon must exist, remain free of the theme's header/footer, and reference only the intended HTTPS app. Verify the online main-domain address, anonymous iframe UI, portrait loading, console, and viewport overflow on desktop and a 390px mobile view.

## Boundaries

Keep paid API credentials, private configuration, and chat memory on Aliyun. Never include diary or unrelated local changes in this release. Preserve the blog homepage and all existing routes. Use explicit paths for Git staging and deploy only the clean committed version.
