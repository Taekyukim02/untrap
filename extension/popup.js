const sitesEl = document.getElementById("sites");

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function chevron() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("class", "chevron");
  svg.innerHTML = '<path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  return svg;
}

// A button that shows/hides `panel`; everything starts collapsed.
function disclosure(className, text, panel) {
  const button = el("button", { className: `disclosure ${className}` }, chevron(), text);
  button.setAttribute("aria-expanded", "false");
  panel.hidden = true;
  button.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
  });
  return button;
}

function toggleRow(t, checked, onChange) {
  const box = el("input", { type: "checkbox", checked });
  box.addEventListener("change", () => onChange(box.checked));
  const text = el("span", {}, t.label);
  if (t.hint) text.append(el("span", { className: "hint" }, t.hint));
  return el("label", { className: "toggle" }, box, text);
}

chrome.storage.local.get(SITES.map((s) => s.id), (stored) => {
  for (const site of SITES) {
    const settings = { ...siteDefaults(site), ...stored[site.id] };
    const save = (key, value) => {
      settings[key] = value;
      chrome.storage.local.set({ [site.id]: settings });
    };

    const body = el("div", { className: "body" });
    const moreBody = el("div", { className: "more-body" });
    const moreToggles = site.groups.filter((g) => g.more).flatMap((g) => g.toggles);
    const moreLabel = el("span");
    const updateMoreLabel = () => {
      const on = moreToggles.filter((t) => settings[t.id]).length;
      moreLabel.textContent = on ? `More · ${on} on` : "More";
    };

    for (const group of site.groups) {
      const target = group.more ? moreBody : body;
      if (group.name) target.append(el("h2", {}, group.name));
      for (const t of group.toggles) {
        target.append(toggleRow(t, settings[t.id], (v) => {
          save(t.id, v);
          updateMoreLabel();
        }));
      }
    }
    if (moreToggles.length) {
      updateMoreLabel();
      body.append(disclosure("more", moreLabel, moreBody), moreBody);
    }

    const section = el("section");
    section.classList.toggle("off", !settings.enabled);
    const master = el("input", { type: "checkbox", checked: settings.enabled });
    master.addEventListener("change", () => {
      save("enabled", master.checked);
      section.classList.toggle("off", !master.checked);
    });

    section.append(
      el("header", {}, disclosure("site", site.name, body), el("label", { className: "master" }, master, "On")),
      body,
    );
    sitesEl.append(section);
  }
});
