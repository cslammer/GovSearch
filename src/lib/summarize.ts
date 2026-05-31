// Congress.gov bill summaries arrive as HTML. We strip them to plain text and
// trim to one or two sentences for the vote list. Stripping uses the DOM so
// entities (&amp;, &#8217;, …) decode correctly — never a naive regex.

/** Strip HTML → plain text, collapsing whitespace. */
export function stripHtml(html: string): string {
  if (!html) return '';
  let text: string;
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    text = el.textContent ?? '';
  } else {
    // Non-DOM fallback (SSR/tests without jsdom): crude tag removal.
    text = html.replace(/<[^>]*>/g, ' ');
  }
  return text.replace(/\s+/g, ' ').trim();
}

/** Drop a common boilerplate prefix Congress.gov summaries start with. */
function trimBoilerplate(text: string): string {
  // e.g. "This bill ...", "(This measure has not been amended...)" wrappers.
  return text.replace(/^\((?:This measure|This bill)[^)]*\)\s*/i, '').trim();
}

/**
 * Reduce a bill summary to ~1–2 sentences, breaking on sentence boundaries and
 * never mid-word. Adds an ellipsis if truncated.
 */
export function summarize(html: string, maxSentences = 2, maxChars = 320): string {
  const text = trimBoilerplate(stripHtml(html));
  if (!text) return '';

  // Split into sentences (keep terminators).
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text];
  let out = '';
  let used = 0;
  for (const s of sentences) {
    if (used >= maxSentences) break;
    const next = (out + s).trim();
    if (next.length > maxChars && out.length > 0) break;
    out = next;
    used += 1;
  }
  out = out || text;

  if (out.length > maxChars) {
    const cut = out.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(' ');
    out = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
  }
  if (out.length < text.length) {
    out = out.replace(/[.!?]*$/, '') + '…';
  }
  return out;
}
