// Runs at document_start. The manifest loads exactly one file from sites/ next to
// this one, so SITES[0] is the current site. Injects one <style> built from the
// enabled toggles and drives the site's redirect/update hooks.

const site = SITES[0];
const STYLE_ID = "untrap-style";
let settings = siteDefaults(site);

function buildCss(s) {
  if (!s.enabled) return "";
  const rules = site.toggles
    .filter((t) => t.css && s[t.id])
    .map((t) => `${t.css.join(",\n")} { display: none !important; }`);
  if (site.baseCss) rules.unshift(site.baseCss);
  return rules.join("\n");
}

function applyCss() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    // <head> may not exist yet at document_start.
    (document.head || document.documentElement).appendChild(style);
  }
  style.textContent = buildCss(settings);
}

function checkRedirect(url = location.href) {
  if (!settings.enabled || !site.redirect) return;
  const target = site.redirect(new URL(url, location.origin), settings);
  if (target) location.replace(target);
}

// Coalesces bursts of DOM mutations into at most one update per UPDATE_MS, so a
// page streaming in thousands of nodes doesn't re-run the site's DOM scan every frame.
const UPDATE_MS = 150;
let updateQueued = false;
let lastUpdate = 0;
function scheduleUpdate() {
  if (!site.update || updateQueued) return;
  updateQueued = true;
  setTimeout(() => requestAnimationFrame(() => {
    updateQueued = false;
    lastUpdate = performance.now();
    site.update(settings);
  }), Math.max(0, lastUpdate + UPDATE_MS - performance.now()));
}

// Exposes the path to CSS, so a site can scope rules to pages, e.g.
// html[data-untrap-path^='/explore'] for Instagram's Explore grid.
function markPath() {
  document.documentElement.setAttribute("data-untrap-path", location.pathname);
}

function refresh() {
  markPath();
  applyCss();
  checkRedirect();
  scheduleUpdate();
}

function load(stored) {
  settings = { ...siteDefaults(site), ...stored };
  refresh();
}

chrome.storage.local.get(site.id, (r) => load(r[site.id]));
markPath();
applyCss();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[site.id]) load(changes[site.id].newValue);
});

if (site.update) {
  new MutationObserver(scheduleUpdate).observe(document.documentElement, { childList: true, subtree: true });
}

// Single-page apps navigate with history.pushState, which fires no event a content
// script can see, so poll for URL changes. Sites with their own events add them in init().
let lastHref = location.href;
setInterval(() => {
  if (location.href === lastHref) return;
  lastHref = location.href;
  markPath();
  checkRedirect();
  scheduleUpdate();
}, 250);
window.addEventListener("popstate", () => checkRedirect());
if (site.init) site.init({ checkRedirect, getSettings: () => settings });
