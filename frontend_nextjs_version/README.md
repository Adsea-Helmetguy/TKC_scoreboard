# TKC Scoreboard - Next.js version

This folder contains the Next.js App Router rewrite of the scoreboard.

Routes:

- `/` - editor view
- `/overlay` - OBS browser source overlay
- `/history` - match history view

Run locally with:

```bash
npm install
npm run dev
```

The overlay still reads and writes match state the same way as the Vite version, but the UI is now organized using `app/page.tsx` style routes.
