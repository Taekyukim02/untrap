// Instagram's class names are obfuscated and change on every deploy, so selectors here
// key off hrefs, aria-labels and visible text instead. Text matching assumes the
// English UI. When something stops hiding, fix the selector or text list here.

const FEED_CAP = 10;
const PROMO_TEXTS = ["Sponsored", "Ad", "Suggested for you", "Suggested posts", "Follow"];
const HIDDEN = "data-untrap-hidden";
const END = "data-untrap-end";
const FEED_ROOT = "data-untrap-feed-root";
const AFTER_END = "data-untrap-after-end";
const CAPPED = "data-untrap-capped";
const EXPLORE = "html[data-untrap-path^='/explore']:not([data-untrap-path^='/explore/search'])";
// Instagram's loading spinner; it may render outside <main>, so it's matched directly.
const SPINNER = ["[role='progressbar']", "svg[aria-label^='Loading']"];
const TILE = "main a[href*='/p/'], main a[href*='/reel/']";

// Post ids on the home feed in the order they first appeared, so the cap holds even
// if Instagram recycles <article> elements as you scroll. Reset per page.
let feedKeys = [];
let feedPath = null;

function postKey(article) {
  for (const a of article.querySelectorAll("a[href*='/p/'], a[href*='/reel/']")) {
    const m = a.getAttribute("href").match(/\/(?:p|reel)\/([^/?#]+)/);
    if (m) return m[1];
  }
  return null;
}

// True if any text node under root is exactly one of texts, e.g. the "Sponsored"
// label in a post header. Exact matching avoids hits inside captions.
function hasExactText(root, texts) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode()); ) if (texts.includes(n.data.trim())) return true;
  return false;
}

// Climbs from el to its outermost ancestor inside <main> that holds nothing matching
// `avoid`, e.g. from one story bubble up to the whole stories tray (avoiding posts).
// Only safe once posts have loaded, otherwise it climbs to the entire feed column.
function containerOf(el, avoid) {
  const main = el.closest("main");
  if (!main || el.closest(avoid)) return null;
  while (el.parentElement !== main && !el.parentElement.querySelector(avoid)) el = el.parentElement;
  return el;
}

// The innermost element holding every post: the feed list.
function feedRoot(articles) {
  let root = articles[0].parentElement;
  while (!root.contains(articles[articles.length - 1])) root = root.parentElement;
  return root;
}

// A post's outermost wrapper below the feed list. Hiding the wrapper rather than the
// <article> keeps empty, fixed-height wrappers from leaving blank space behind.
function wrapperOf(article, root) {
  let el = article;
  while (el.parentElement !== root && el.parentElement.querySelectorAll("article").length === 1) el = el.parentElement;
  return el;
}

// Marks `last` and its ancestors up to <main>; CSS then hides every later sibling at
// each level (later posts, the load-more spinner). Being CSS, it also hides posts
// Instagram adds afterwards before they ever paint.
function addChain(last, out) {
  for (let el = last; el && el.tagName !== "MAIN"; el = el.parentElement) out.add(el);
}

function syncMarks(attr, wanted) {
  for (const el of document.querySelectorAll(`[${attr}]`)) if (!wanted.has(el)) el.removeAttribute(attr);
  for (const el of wanted) if (!el.hasAttribute(attr)) el.setAttribute(attr, "");
}

// The visible <video> under a screen point. Instagram lays a click-catching overlay
// over videos, so elementFromPoint would return the overlay instead.
function videoAt(x, y) {
  for (const v of document.querySelectorAll("video")) {
    const r = v.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return v;
  }
  return null;
}

const isExploreGrid = (p) => /^\/explore(\/|$)/.test(p) && !p.startsWith("/explore/search");

registerSite({
  id: "instagram",
  name: "Instagram",
  defaultEnabled: true,
  groups: [
    {
      toggles: [
        {
          // /reels/ is the endless swipe feed; a single /reel/<id> (e.g. a link a
          // friend sent) still opens on its own page.
          id: "blockReels",
          label: "Hide Reels",
          hint: "Shared reel links still open",
          default: true,
          css: ["a[href='/reels/']", "main article:has(a[href*='/reel/'])"],
        },
        {
          // Explore stays reachable for search; only the grid of posts is hidden.
          id: "hideExploreGrid",
          label: "Hide Explore posts",
          hint: "Search still works",
          default: true,
          css: [
            `${EXPLORE} main a[href*='/p/']`,
            `${EXPLORE} main a[href*='/reel/']`,
            // Desktop Explore is only the grid (search lives in the sidebar), so hide it all.
            `${EXPLORE} main:not(:has(input))`,
            ...SPINNER.map((sel) => `${EXPLORE} ${sel}`),
          ],
        },
        {
          id: "capFeed",
          label: `Stop feed after ${FEED_CAP} posts`,
          default: true,
        },
        {
          // Sponsored posts, suggested posts and "Suggested for you" accounts.
          id: "hidePromoted",
          label: "Hide ads and suggestions",
          hint: "Posts and accounts you don't follow",
          default: true,
        },
        {
          id: "noAutoplay",
          label: "Stop video autoplay",
          hint: "Click a video to play it",
          default: true,
        },
      ],
    },
    {
      more: true,
      toggles: [
        {
          id: "followingFeed",
          label: "Open home on Following",
          default: false,
        },
        {
          id: "hideStories",
          label: "Hide stories row",
          default: false,
        },
        {
          id: "hideLikeCounts",
          label: "Hide like counts",
          default: true,
          css: ["a[href$='/liked_by/']"],
        },
        {
          id: "hideNotifications",
          label: "Hide activity (heart) icon",
          default: true,
          css: [
            "a:has(svg[aria-label='Notifications'])",
            "[role='button']:has(svg[aria-label='Notifications'])",
          ],
        },
        {
          id: "hideThreads",
          label: "Hide Threads links",
          default: true,
          css: ["a[href*='threads.net']", "a[href*='threads.com']"],
        },
      ],
    },
  ],

  baseCss: `
    [${HIDDEN}] { display: none !important; }
    [${FEED_ROOT}] { padding-bottom: 0 !important; min-height: 0 !important; }
    [${AFTER_END}] ~ * { display: none !important; }
    ${SPINNER.map((sel) => `html[${CAPPED}] ${sel}`).join(", ")} { display: none !important; }
    [${END}]::after {
      content: "That's the end of your feed.";
      display: block; padding: 32px 0; text-align: center; color: #8e8e8e; font-size: 14px;
    }`,

  redirect(u, s) {
    const p = u.pathname;
    if (s.blockReels) {
      const m = p.match(/^\/reels\/([^/?#]+)/);
      if (m) return `/reel/${m[1]}/`;
      if (/^\/reels\/?$/.test(p)) return "/";
    }
    if (s.followingFeed && p === "/" && !u.searchParams.has("variant")) return "/?variant=following";
    return null;
  },

  update(s) {
    const hidden = new Set();
    const end = new Set();
    const roots = new Set();
    const chain = new Set();
    const path = location.pathname;
    if (path !== feedPath) {
      feedPath = path;
      feedKeys = [];
    }

    // CSS already hides the tiles; hiding their container too hides the grid's
    // load-more spinner, so the grid stops fetching in the background.
    if (s.enabled && s.hideExploreGrid && isExploreGrid(path)) {
      const tile = document.querySelector(TILE);
      const grid = tile && containerOf(tile, "input");
      if (grid) hidden.add(grid);
    }

    const articles = s.enabled ? [...document.querySelectorAll("main article")] : [];
    if (articles.length) {
      const add = (el) => el && hidden.add(el);
      if (s.hideStories) {
        for (const el of document.querySelectorAll("main [aria-label*='story' i], main a[href^='/stories/']")) add(containerOf(el, "article"));
      }
      if (s.hidePromoted) {
        for (const el of document.querySelectorAll("main a[href='/explore/people/']")) add(containerOf(el, "article"));
      }

      const root = feedRoot(articles);
      const capping = s.capFeed && path === "/";
      let lastShown = null;
      for (const article of articles) {
        // Hidden posts don't count toward the cap.
        const isReel = s.blockReels && article.querySelector("a[href*='/reel/']");
        if (isReel || (s.hidePromoted && hasExactText(article, PROMO_TEXTS))) {
          hidden.add(wrapperOf(article, root));
          continue;
        }
        if (!capping) continue;
        const key = postKey(article);
        if (key && !feedKeys.includes(key) && feedKeys.length < FEED_CAP) feedKeys.push(key);
        if (key && feedKeys.includes(key)) lastShown = article;
        else hidden.add(wrapperOf(article, root));
      }
      if (lastShown && feedKeys.length >= FEED_CAP) {
        end.add(lastShown);
        roots.add(root);
        addChain(wrapperOf(lastShown, root), chain);
      }
    }

    syncMarks(HIDDEN, hidden);
    syncMarks(END, end);
    syncMarks(FEED_ROOT, roots);
    syncMarks(AFTER_END, chain);
    syncMarks(CAPPED, new Set(end.size ? [document.documentElement] : []));
  },

  // Pauses any video that starts without a click on it. Clicking a paused video plays
  // it, in case Instagram's own click handler toggles mute instead of playback.
  // Stories are left alone, since opening one is already a deliberate click.
  init({ getSettings }) {
    let press = null;
    const active = () => {
      const s = getSettings();
      return s.enabled && s.noAutoplay && !location.pathname.startsWith("/stories/");
    };

    document.addEventListener("pointerdown", (e) => {
      const video = videoAt(e.clientX, e.clientY);
      press = { video, time: performance.now() };
      if (active() && video?.paused) setTimeout(() => video.paused && video.play(), 300);
    }, true);

    // Media events don't bubble, so listen in the capture phase.
    document.addEventListener("play", (e) => {
      const v = e.target;
      if (!(v instanceof HTMLVideoElement) || !active()) return;
      const clicked = press && press.video === v && performance.now() - press.time < 1500;
      if (!clicked) v.pause();
    }, true);
  },
});
