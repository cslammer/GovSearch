// ─────────────────────────────────────────────────────────────────────────────
// senateApi.ts — Senate roll-call votes from Senate.gov XML.
//
// The Congress.gov API has NO Senate vote endpoint, so we read the Senate's own
// published XML. Senate.gov is behind Akamai and blocks non-browser clients +
// cross-origin requests, so these calls MUST go through the proxy (dev server or
// deployed worker), which spoofs a browser User-Agent and adds CORS headers.
//
// Member positions are keyed by `lis_member_id`; we join them back to bioguide
// IDs via the roster (Member.lisId).
// ─────────────────────────────────────────────────────────────────────────────

import type { RollCall, VotePosition } from '../types';
import { config } from './config';
import { normalizeVoteCast } from './congressApi';
import { runWithConcurrency } from './concurrency';

function senateUrl(path: string): string {
  return `${config.senateBase}${path}`;
}

async function fetchXml(path: string, signal?: AbortSignal): Promise<Document> {
  const res = await fetch(senateUrl(path), { signal, headers: { Accept: 'application/xml, text/xml' } });
  if (!res.ok) throw new Error(`Senate.gov request failed (${res.status})`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Failed to parse Senate XML');
  return doc;
}

const text = (parent: Element | Document, tag: string): string =>
  parent.querySelector(tag)?.textContent?.trim() ?? '';

export interface SenateVoteRef {
  congress: number;
  session: number;
  voteNumber: number;
  date: string;
  question: string;
  result: string;
  legislationType?: string;
  legislationNumber?: string;
}

function parseDocument(el: Element): { type?: string; number?: string } {
  // The menu uses <issue> like "H.R. 1"; detail uses <document_name>/<document>.
  const issue = text(el, 'issue') || text(el, 'document_name');
  const m = issue.match(/([A-Za-z]+)\.?\s*([A-Za-z]*\.?)\s*(\d+)/);
  if (!m) return {};
  const kind = (m[1] + m[2]).replace(/\./g, '').toLowerCase(); // "hr", "s", "sjres"
  return { type: kind || undefined, number: m[3] };
}

/** Fetch the menu of Senate roll-call votes for a congress/session. */
export async function fetchSenateVoteMenu(
  congress: number,
  session: number,
  signal?: AbortSignal,
): Promise<SenateVoteRef[]> {
  const doc = await fetchXml(
    `/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.xml`,
    signal,
  );
  const votes = [...doc.querySelectorAll('vote')];
  return votes
    .map((v) => {
      const doc2 = parseDocument(v);
      return {
        congress,
        session,
        voteNumber: parseInt(text(v, 'vote_number'), 10),
        date: text(v, 'vote_date'),
        question: text(v, 'question') || text(v, 'vote_question_text'),
        result: text(v, 'result') || text(v, 'vote_result'),
        legislationType: doc2.type,
        legislationNumber: doc2.number,
      };
    })
    .filter((v) => Number.isFinite(v.voteNumber));
}

/** Fetch a single Senate roll call, joining positions to bioguide IDs. */
export async function fetchSenateVoteDetail(
  ref: SenateVoteRef,
  lisToBioguide: Map<string, string>,
  signal?: AbortSignal,
): Promise<RollCall> {
  const num = String(ref.voteNumber).padStart(5, '0');
  const doc = await fetchXml(
    `/legislative/LIS/roll_call_votes/vote${ref.congress}${ref.session}/vote_${ref.congress}_${ref.session}_${num}.xml`,
    signal,
  );

  const positions: VotePosition[] = [];
  for (const m of doc.querySelectorAll('members > member')) {
    const lis = text(m, 'lis_member_id');
    const bioguide = lisToBioguide.get(lis);
    if (!bioguide) continue;
    const partyRaw = text(m, 'party').toUpperCase();
    positions.push({
      bioguide,
      voteCast: normalizeVoteCast(text(m, 'vote_cast')),
      party: partyRaw.startsWith('D') ? 'D' : partyRaw.startsWith('R') ? 'R' : 'I',
    });
  }

  const docMeta = parseDocument(doc.documentElement);
  return {
    rollId: `S-${ref.congress}-${ref.session}-${ref.voteNumber}`,
    chamber: 'senate',
    congress: ref.congress,
    session: ref.session,
    rollNumber: ref.voteNumber,
    date: text(doc, 'vote_date') || ref.date,
    question: text(doc, 'vote_question_text') || ref.question,
    result: text(doc, 'vote_result_text') || text(doc, 'vote_result') || ref.result,
    legislationType: ref.legislationType ?? docMeta.type,
    legislationNumber: ref.legislationNumber ?? docMeta.number,
    positions,
  };
}

export interface SenateFetchResult {
  rollCalls: RollCall[];
  requested: number;
  failed: number;
}

export async function fetchSenateRollCalls(
  refs: SenateVoteRef[],
  lisToBioguide: Map<string, string>,
  signal?: AbortSignal,
): Promise<SenateFetchResult> {
  let failed = 0;
  const rollCalls = await runWithConcurrency(refs, 5, async (ref) => {
    try {
      return await fetchSenateVoteDetail(ref, lisToBioguide, signal);
    } catch {
      failed += 1;
      return null;
    }
  });
  return {
    rollCalls: rollCalls.filter((rc): rc is RollCall => rc !== null && rc.positions.length > 0),
    requested: refs.length,
    failed,
  };
}
