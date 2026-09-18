// Task 5 — the assets list is generated from docs/CREDITS.md itself (Vite's `?raw`
// import reads the file as plain text at build time, works for the dist build too),
// not hand-copied into this file, so it can never drift out of sync with the actual
// credited source of truth.
import creditsRaw from '../docs/CREDITS.md?raw';

/** Parses docs/CREDITS.md's "| Asset | Source | Licence | Author | Notes |" table.
 * Implementation notes (the 5th column) are internal/repo-maintenance detail, not
 * player-facing credit info, so they're read but not rendered — see setupCredits(). */
function parseCreditsTable(markdown) {
  const tableLines = markdown.split('\n').filter((line) => line.trim().startsWith('|'));
  const rows = tableLines.slice(2); // [0] header, [1] '---' separator
  return rows.map((line) => {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    const [asset, source, licence, author] = cells;
    const linkMatch = source.match(/\[([^\]]+)\]\(([^)]+)\)/);
    return {
      asset,
      sourceText: linkMatch ? linkMatch[1] : source,
      sourceUrl: linkMatch ? linkMatch[2] : null,
      licence,
      author,
    };
  });
}

function renderAssetList(container, entries) {
  container.innerHTML = '';
  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'credit-entry';

    const assetLine = document.createElement('span');
    assetLine.className = 'credit-asset';
    assetLine.textContent = entry.asset;
    row.appendChild(assetLine);

    const metaLine = document.createElement('span');
    metaLine.className = 'credit-meta';
    if (entry.sourceUrl) {
      const link = document.createElement('a');
      link.href = entry.sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.style.color = 'inherit';
      link.textContent = entry.sourceText;
      metaLine.appendChild(link);
    } else {
      metaLine.appendChild(document.createTextNode(entry.sourceText));
    }
    metaLine.appendChild(document.createTextNode(` · ${entry.licence} · ${entry.author}`));
    row.appendChild(metaLine);

    container.appendChild(row);
  }
}

/** Wires the credits screen (index.html #credits-overlay) — same warm palette-built
 * gradient as the title screen (see the CSS comment in index.html), reachable from
 * the pause menu and shown after the final (both-errands-complete) end card. Returns
 * {open, close} for main.js to call from those two triggers. */
export function setupCredits() {
  const overlay = document.getElementById('credits-overlay');
  const listEl = document.getElementById('credits-assets-list');
  const closeBtn = document.getElementById('credits-close-btn');

  renderAssetList(listEl, parseCreditsTable(creditsRaw));

  function open() {
    overlay.classList.add('visible');
  }
  function close() {
    overlay.classList.remove('visible');
  }

  closeBtn.addEventListener('pointerdown', close);

  return { open, close };
}
