// Site registry, loaded by the content script and the popup.
// Each file in sites/ calls registerSite() with:
//   id, name, defaultEnabled
//   groups: [{ name?, more?, toggles: [{ id, label, hint?, default, css? }] }]
//     Groups with `more` are folded under "More" in the popup; the rest are always shown.
//     Labels start with Hide (removes something), Stop (limits a behavior) or
//     Open/Send (redirects); `hint` is a short gray line for jargon or caveats only.
//     `css` is a selector list hidden with display:none when the toggle is on.
//     Toggles without `css` are behaviors handled by the hooks below.
//   baseCss         optional CSS always injected while the site is enabled
//   redirect(u, s)  optional; given a URL and settings, returns a path to go to or null
//   update(s)       optional; called on load, settings change, navigation and DOM changes
//   init(ctx)       optional; runs once in the content script to install listeners.
//                   ctx.checkRedirect(url?) re-runs redirect; ctx.getSettings() returns current settings
// Settings are stored per site under chrome.storage.local[site.id].
// To add a site: write sites/<id>.js and add a content_scripts entry in manifest.json.

const SITES = [];

function registerSite(site) {
  site.toggles = site.groups.flatMap((g) => g.toggles);
  SITES.push(site);
}

function siteDefaults(site) {
  const s = { enabled: site.defaultEnabled };
  for (const t of site.toggles) s[t.id] = t.default;
  return s;
}
