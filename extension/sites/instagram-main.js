// Runs in the page's own JS world (see "world": "MAIN" in manifest.json) so it can wrap
// the IntersectionObserver Instagram uses for infinite scroll. Content scripts can't,
// since they see a separate copy of window.
//
// Once sites/instagram.js caps the feed it marks the last post with data-untrap-end.
// From then on, "now visible" entries for anything below that post are dropped, so
// the load-more sentinel never fires and Instagram stops fetching posts.

(() => {
  const Native = window.IntersectionObserver;
  if (!Native) return;

  // Dialogs (a post opened from the feed, the share sheet) render after the feed in
  // the DOM but need their own lazy loading, so they're exempt.
  const belowEnd = (el) => {
    const end = document.querySelector("[data-untrap-end]");
    return end && !end.contains(el) && !el.closest("[role='dialog']") &&
      end.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
  };

  window.IntersectionObserver = class extends Native {
    constructor(callback, options) {
      super((entries, observer) => {
        const kept = entries.filter((e) => !(e.isIntersecting && belowEnd(e.target)));
        if (kept.length) callback(kept, observer);
      }, options);
    }
  };
})();
