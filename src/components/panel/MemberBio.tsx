import type { Member } from '../../types';
import type { CongressMemberDetail } from '../../lib/congressApi';
import { MemberAvatar } from '../MemberAvatar';
import { PARTY_LABEL, roleLine, yearsInOfficeLabel } from '../../lib/format';
import { PARTY_COLOR } from '../../lib/party';

interface MemberBioProps {
  member: Member;
  detail?: CongressMemberDetail;
}

// Builds a short bio/history from the roster's term data, enriched with the
// Congress.gov member endpoint when available.
export function MemberBio({ member, detail }: MemberBioProps) {
  const chambersServed = summarizeService(member);

  return (
    <div>
      <div className="flex items-start gap-4">
        <MemberAvatar member={member} size={72} large />
        <div className="min-w-0 pt-1">
          <h2 className="text-[19px] font-semibold leading-tight tracking-tight text-[var(--color-ink)]">
            {member.fullName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${PARTY_COLOR[member.party]}1a`, color: PARTY_COLOR[member.party] }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PARTY_COLOR[member.party] }} />
              {PARTY_LABEL[member.party]}
              {member.isIndependent && ` · caucuses with ${member.bloc === 'D' ? 'Democrats' : 'Republicans'}`}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink-soft)]">{roleLine(member)}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Fact label="Tenure" value={yearsInOfficeLabel(member.yearsInOffice)} />
        <Fact label="In office since" value={new Date(member.firstTermStart).getFullYear().toString()} />
        {member.leadershipTitle && <Fact label="Leadership" value={member.leadershipTitle} wide />}
        {detail?.sponsoredLegislation?.count != null && (
          <Fact label="Bills sponsored" value={detail.sponsoredLegislation.count.toLocaleString()} />
        )}
        {detail?.cosponsoredLegislation?.count != null && (
          <Fact label="Bills cosponsored" value={detail.cosponsoredLegislation.count.toLocaleString()} />
        )}
      </dl>

      {chambersServed && (
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">{chambersServed}</p>
      )}

      {detail?.officialUrl && (
        <a
          href={detail.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-accent)] hover:underline"
        >
          Official website
          <ExternalIcon />
        </a>
      )}
    </div>
  );
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

/** Plain-language service history from the term list. */
function summarizeService(member: Member): string | null {
  if (member.terms.length === 0) return null;
  const house = member.terms.filter((t) => t.chamber === 'house');
  const senate = member.terms.filter((t) => t.chamber === 'senate');
  const parts: string[] = [];
  const firstYear = (terms: typeof member.terms) =>
    new Date(terms.reduce((m, t) => (t.start < m ? t.start : m), terms[0].start)).getFullYear();
  if (house.length) parts.push(`has served in the House since ${firstYear(house)}`);
  if (senate.length) parts.push(`in the Senate since ${firstYear(senate)}`);
  if (parts.length === 0) return null;
  return `${member.lastName} ${parts.join(', and ')}.`;
}

function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M4.5 2.5H9.5V7.5M9.5 2.5L4 8M8 9.5H3a.5.5 0 0 1-.5-.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
