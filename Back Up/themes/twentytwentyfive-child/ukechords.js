/*  Uke chords gallery mapper (SAFE)
    - Only runs when a ChordPress sheet is present
    - Maps each chord name to /uke-chords/<Name>.svg (or UKECHORDS_CFG.base)
    - Handles Unicode ♯/♭, proper-cases roots, and simple enharmonic fallbacks
*/

(function () {
  "use strict";

  // Use localized base if provided by functions.php; otherwise fallback
  const BASE =
    (window.UKECHORDS_CFG && window.UKECHORDS_CFG.base) ||
    "/wp-content/themes/twentytwentyfive-child/uke-chords/";

  // ---- helpers -------------------------------------------------------------

  function normalizeChordLabel(raw) {
    if (!raw) return "";
    let t = String(raw).replace(/\u00A0/g, " ").trim();
    t = t.replace(/♯/g, "#").replace(/♭/g, "b");
    t = t.replace(/^([a-gA-G])/, (_, r) => r.toUpperCase());
    return t;
  }

  function filenameCandidates(label) {
    const exact = encodeURIComponent(label) + ".svg";
    const enharm = {
      "A#": "Bb", "Bb": "A#",
      "C#": "Db", "Db": "C#",
      "D#": "Eb", "Eb": "D#",
      "F#": "Gb", "Gb": "F#",
      "G#": "Ab", "Ab": "G#",
    };
    const m = label.match(/^([A-G](?:#|b)?)(.*)$/);
    if (!m) return [exact];
    const root = m[1], tail = m[2] || "";
    const altRoot = enharm[root];
    return altRoot ? [exact, encodeURIComponent(altRoot + tail) + ".svg"] : [exact];
  }

  // Find the ChordPress container; return null if none
  function findChordSheetRoot() {
    // Typical container id starts with cpress-id-
    const idRoot = document.querySelector('[id^="cpress-id-"]');
    if (idRoot) return idRoot;

    // Heuristic: the “These known chords…” text lives near the sheet
    const marker = Array.from(document.querySelectorAll("div, p, section"))
      .find(el => /These known chords are used in this song\./i.test(el.textContent || ""));
    if (marker) {
      let parent = marker;
      for (let i = 0; i < 5 && parent; i++) {
        if (parent.id && parent.id.indexOf("cpress-id-") !== -1) return parent;
        parent = parent.parentElement;
      }
    }

    // No sheet found
    return null;
  }

  function collectChordLabels(root) {
    const nodes = root.querySelectorAll(
      'span.chord, span.chordshort, span.cpress_chord, span[data-chordshort], span[data-chord]'
    );
    const seen = new Set();
    const labels = [];
    nodes.forEach(el => {
      const raw = el.getAttribute("data-chordshort") || el.getAttribute("data-chord") || el.textContent;
      const label = normalizeChordLabel(raw);
      if (label && /^[A-G]/.test(label) && !seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    });
    return labels;
  }

  function ensureGalleryContainer(root) {
    let wrap = document.getElementById("chord-gallery");
    if (wrap) return wrap;

    wrap = document.createElement("div");
    wrap.id = "chord-gallery";
    wrap.className = "chord-gallery two-rows";

    const heading = document.createElement("h3");
    heading.className = "chord-gallery__title";
    heading.textContent = "Chords in this song";
    wrap.appendChild(heading);

    const rail = document.createElement("div");
    rail.className = "chord-gallery__rail";
    wrap.appendChild(rail);

    // Insert near the sheet root only
    if (root.firstElementChild) {
      root.insertBefore(wrap, root.firstElementChild.nextSibling);
    } else {
      root.appendChild(wrap);
    }
    return wrap;
  }

  function empty(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function renderGallery(root, labels) {
    if (!labels.length) return; // nothing to render
    const wrap = ensureGalleryContainer(root);
    const rail = wrap.querySelector(".chord-gallery__rail");
    if (!rail) return;
    empty(rail);

    labels.forEach(name => {
      const card = document.createElement("div");
      card.className = "chord-card";

      const cap = document.createElement("div");
      cap.className = "chord-card__label";
      cap.textContent = name;

      const img = document.createElement("img");
      img.className = "chord-card__img";
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = `${name} chord diagram`;

      const cands = filenameCandidates(name);
      let idx = 0;
      function tryNext() {
        if (idx >= cands.length) { card.style.display = "none"; return; }
        img.src = BASE + cands[idx++];
      }
      img.addEventListener("error", tryNext);
      tryNext();

      card.appendChild(cap);
      card.appendChild(img);
      rail.appendChild(card);
    });
  }

  // Build once (only if a sheet exists)
  function buildOnce() {
    const root = findChordSheetRoot();
    if (!root) return;          // bail: no chord sheet on this page
    const labels = collectChordLabels(root);
    if (!labels.length) return; // bail: no chords detected
    renderGallery(root, labels);
  }

  // Observe changes inside the sheet (transpose etc.)
  let mo;
  function observeSheet() {
    const root = findChordSheetRoot();
    if (!root) return;
    if (mo) mo.disconnect();
    mo = new MutationObserver(() => {
      if (observeSheet._t) cancelAnimationFrame(observeSheet._t);
      observeSheet._t = requestAnimationFrame(() => {
        const labels = collectChordLabels(root);
        // Only update if there are chords and the gallery exists
        if (labels.length && document.getElementById("chord-gallery")) {
          renderGallery(root, labels);
        }
      });
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  ready(() => {
    buildOnce();
    observeSheet();
  });
})();
