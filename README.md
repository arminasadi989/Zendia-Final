<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1d5b516d-3094-4bb0-83c8-99f607704f66

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` (or `.env.local`) and set `GEMINI_API_KEY` to your Gemini API key.
   This key is read only by `server.ts` on the Node.js process — it is never bundled into the
   browser JavaScript, unlike the previous version of this app.
3. Run the app (this now starts a single Express server on port 3000 that serves the
   frontend AND proxies all Gemini API calls — same architecture as Zencraft):
   `npm run dev`
4. To build for production: `npm run build`, then `npm run start`.
