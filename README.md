# Untrap

A Chrome extension that takes the bottomless parts out of YouTube and Instagram: Shorts and Reels, endless feeds, autoplay, recommendations. Each site has its own on/off switch, with sensible defaults and a few extra toggles under "More".

Built because I kept doomscrolling sites I had no real reason to be on. It pairs well with [ScreenZen](https://screenzen.co) on iPhone, which makes you choose to open a site instead of drifting into it.

## Install

1. Clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the `extension/` folder.

Works in any Chromium browser (Chrome, Arc, Brave, Edge).

## Make it yours

Every site is one file in `extension/sites/` plus one entry in `manifest.json`. Fork it, open it in [Claude Code](https://claude.com/claude-code), and ask for the site that gets you: "add Reddit, hide r/popular and stop infinite scroll". Sites change their markup often, so when something stops hiding, paste the element's HTML and ask for a fix.
