// YouTube renames elements often; when something stops hiding, fix the selector here.

registerSite({
  id: "youtube",
  name: "YouTube",
  defaultEnabled: true,
  groups: [
    {
      toggles: [
        {
          // Also sends /shorts/ links to the normal player (see redirect below).
          id: "hideShorts",
          label: "Hide Shorts",
          hint: "Shared links open as normal videos",
          default: true,
          css: [
            "ytd-reel-shelf-renderer",
            "ytd-rich-shelf-renderer[is-shorts]",
            "ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])",
            "grid-shelf-view-model:has(ytm-shorts-lockup-view-model)",
            "ytd-rich-item-renderer:has(a[href^='/shorts/'])",
            "ytd-video-renderer:has(a[href^='/shorts/'])",
            "ytd-grid-video-renderer:has(a[href^='/shorts/'])",
            "ytd-guide-entry-renderer:has(a[title='Shorts'])",
            "ytd-guide-entry-renderer:has(a[href^='/shorts'])",
            "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
            "ytd-mini-guide-entry-renderer:has(a[title='Shorts'])",
            "ytd-mini-guide-entry-renderer:has(a[href^='/shorts'])",
            "yt-tab-shape[tab-title='Shorts']",
          ],
        },
        {
          // YouTube loads the next batch when this spinner element scrolls into view;
          // hiding it means it never intersects, so loading stops after the first batch.
          // Subscriptions, playlists and comments are left alone.
          id: "stopInfiniteScroll",
          label: "Stop endless scroll",
          hint: "Home, search and related videos",
          default: true,
          css: [
            "ytd-browse[page-subtype='home'] ytd-continuation-item-renderer",
            "ytd-search ytd-continuation-item-renderer",
            "ytd-watch-next-secondary-results-renderer ytd-continuation-item-renderer",
          ],
        },
        {
          id: "hideRelated",
          label: "Hide related videos",
          default: true,
          css: ["ytd-watch-flexy #related"],
        },
        {
          id: "hideEndScreen",
          label: "Hide end-of-video suggestions",
          default: true,
          css: [".ytp-ce-element", ".ytp-endscreen-content", ".html5-endscreen", ".videowall-endscreen"],
        },
        {
          id: "hideTopicChips",
          label: "Hide the filter bar",
          hint: "All, Music, Gaming…",
          default: true,
          css: [
            "ytd-browse[page-subtype='home'] ytd-feed-filter-chip-bar-renderer",
            "ytd-browse[page-subtype='home'] #chips-wrapper",
            "yt-related-chip-cloud-renderer",
            "ytd-watch-next-secondary-results-renderer yt-chip-cloud-renderer",
          ],
        },
      ],
    },
    {
      name: "Home",
      more: true,
      toggles: [
        {
          id: "hideHomeFeed",
          label: "Hide home recommendations",
          default: false,
          css: [
            "ytd-browse[page-subtype='home'] ytd-rich-grid-renderer",
            "ytd-browse[page-subtype='home'] ytd-feed-filter-chip-bar-renderer",
          ],
        },
        {
          id: "redirectHome",
          label: "Send Home to Subscriptions",
          default: false,
        },
        {
          id: "hideMixes",
          label: "Hide Mixes",
          hint: "Auto-made radio playlists",
          default: false,
          css: [
            "ytd-rich-item-renderer:has(a[href*='start_radio=1'])",
            "ytd-radio-renderer",
            "ytd-compact-radio-renderer",
          ],
        },
      ],
    },
    {
      name: "Watch page",
      more: true,
      toggles: [
        {
          id: "hideComments",
          label: "Hide comments",
          default: false,
          css: ["ytd-watch-flexy #comments", "ytd-comments#comments"],
        },
        {
          id: "hideLiveChat",
          label: "Hide live chat",
          default: false,
          css: ["ytd-watch-flexy #chat", "ytd-live-chat-frame"],
        },
        {
          id: "hideInfoCards",
          label: "Hide info cards",
          hint: "The “i” pop-ups during a video",
          default: false,
          css: [".ytp-cards-teaser", ".ytp-cards-button"],
        },
        {
          id: "hideMerch",
          label: "Hide merch and ticket shelves",
          default: false,
          css: ["ytd-merch-shelf-renderer", "ytd-ticket-shelf-renderer", "ytd-offer-module-renderer"],
        },
      ],
    },
    {
      name: "Other",
      more: true,
      toggles: [
        {
          id: "hideSidebarExtras",
          label: "Hide sidebar extras",
          hint: "Explore, Trending, More from YouTube",
          default: false,
          css: [
            "ytd-guide-section-renderer:has(a[href='/feed/trending'])",
            "ytd-guide-section-renderer:has(a[href^='/gaming'])",
            "ytd-guide-entry-renderer:has(a[href='/feed/explore'])",
            "ytd-mini-guide-entry-renderer:has(a[href='/feed/explore'])",
            "ytd-guide-section-renderer:has(a[href*='studio.youtube.com'])",
          ],
        },
        {
          id: "hideNotifications",
          label: "Hide notification bell",
          default: false,
          css: ["ytd-notification-topbar-button-renderer"],
        },
        {
          id: "hideSearchShelves",
          label: "Hide extra shelves in search",
          hint: "People also watched, For you…",
          default: false,
          css: [
            "ytd-search ytd-shelf-renderer",
            "ytd-search ytd-horizontal-card-list-renderer",
          ],
        },
      ],
    },
  ],

  redirect(u, s) {
    if (s.hideShorts) {
      const m = u.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (m) return `/watch?v=${m[1]}`;
    }
    if (s.redirectHome && u.pathname === "/") return "/feed/subscriptions";
    return null;
  },

  // YouTube's own SPA events fire before the new page renders, so redirects don't flash.
  init({ checkRedirect }) {
    document.addEventListener("yt-navigate-start", (e) => checkRedirect(e.detail?.url || location.href));
    document.addEventListener("yt-navigate-finish", () => checkRedirect());
  },
});
