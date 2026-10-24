/**
 * tools/mineralienatlas-size-capture.mjs — the read-only extractor run on Mineralienatlas gallery
 * pages for the story-pocket size evidence (2026-10-22).
 *
 * HOW THE CAPTURE RAN: in a real browser session, as for the 2026-10-21 photo counts (the site serves
 * a JavaScript check to scripted clients, and the capture did not bypass it). Each page was opened by
 * ordinary navigation. Each locality's photo overview (LokationMineralBilder, all sub-localities, up
 * to 6 photographs per section — one section per mineral per sub-locality) was read first; then the
 * galleries (MediaDataShow, 60 photographs a page) of the wanted species' sections, largest first,
 * until at least 20 photographs of the species had been read or every section had (the sampling rule
 * the capture file records). On every page this function read the loaded document only: it fetches
 * nothing. Node imports it only to hash its source text against the copy pasted into the page (the
 * capture file, proposals/DATA-STORY-POCKET-SIZES-CAPTURE-2026-10-22.json, records both). Its pattern
 * also caught inches; no captured stretch held a length in inches, and the offline parser reads
 * mm, cm and µm only.
 *
 * WHAT IT RECORDS per photograph whose FIRST-named mineral (the "Mineral:" links, in the uploader's
 * order) is one of `want`: its image id, that lead mineral, how many minerals it names, and every
 * stretch of its title and caption that holds a number with a length unit (30 characters before,
 * 15 after, overlapping stretches merged). It does not interpret them: which stretch is a crystal
 * length, a specimen size or a picture width is decided offline by tools/story-pocket-size-evidence.mjs,
 * which can be re-run on the capture without the site. Photographs led by a wanted mineral but with
 * no such stretch are counted (leadCounts: [photographs, with a size stretch]), not listed.
 */
export async function maSizePage(want, label) {
  const SIZE = /\d+(?:[.,]\d+)?(?:\s*(?:mm|cm))?(?:\s*[x×х*]\s*\d+(?:[.,]\d+)?(?:\s*(?:mm|cm))?){0,2}\s*(?:mm|cm|µm|μm|in\b|inch(?:es)?\b|")/gi;
  const W = new Set(want);
  const captionText = (d) => {
    let text = '';
    for (const node of d.childNodes) {
      if (node.nodeType === 1 && node.tagName === 'I' && /Copyright/.test(node.textContent)) break;
      if (node.nodeType === 1 && node.tagName === 'BR') { text += ' ; '; continue; }
      text += node.textContent;
    }
    return text.replace(/\s+/g, ' ').trim();
  };
  const seen = new Set();
  const leadCounts = {};
  const rows = [];
  for (const td of document.querySelectorAll('td.onethumb')) {
    const d = td.querySelector('.glightbox-desc');
    const a = td.querySelector('a.glightbox');
    if (!d || !a) continue;
    const id = (a.getAttribute('href').match(/param\/(\d+)/) || [])[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const minerals = [...d.querySelectorAll('a[title^="Mineral - "]')].map((x) => x.textContent.trim());
    if (!W.has(minerals[0])) continue;
    const text = captionText(d);
    const spans = [];
    for (const m of text.matchAll(SIZE)) {
      const s = Math.max(0, m.index - 30), e = Math.min(text.length, m.index + m[0].length + 15);
      const last = spans[spans.length - 1];
      if (last && s <= last[1]) last[1] = Math.max(last[1], e); else spans.push([s, e]);
    }
    const c = (leadCounts[minerals[0]] ||= [0, 0]);
    c[0]++;
    if (spans.length) {
      c[1]++;
      rows.push([id, minerals[0], minerals.length, spans.map(([s, e]) => text.slice(s, e))]);
    }
  }
  const pageButtons = [...document.querySelectorAll('form input[type=submit]')]
    .filter((i) => /^picturepage\[/.test(i.name)).map((i) => i.value);
  const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  // The site's script library replaces Array.prototype.toJSON (arrays then serialize as strings), so
  // the payload is hashed in the standard serialization, as Node computes it, with that replacement
  // set aside for the one call.
  const stdJson = (v) => {
    const own = Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON');
    if (own) delete Array.prototype.toJSON;
    try { return JSON.stringify(v); } finally { if (own) Object.defineProperty(Array.prototype, 'toJSON', own); }
  };
  // Keys in alphabetical order, so the payload serializes the same after a viewer re-sorts its keys;
  // fn = the hash of this function's own source text.
  const payload = {
    fn: await sha(maSizePage.toString()),
    label,
    leadCounts: Object.fromEntries(Object.entries(leadCounts).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))),
    pageButtons,
    photos: seen.size,
    rows,
    url: location.pathname + location.search,
  };
  return { ...payload, sha256: await sha(stdJson(payload)) };
}
