import { useState } from 'react';
import type { Member } from '../types';
import { avatarColors } from '../lib/photos';
import { seatRingColor } from '../lib/party';

interface MemberAvatarProps {
  member: Member;
  size: number;
  /** Use the large photo (panel) vs the thumbnail (chips). */
  large?: boolean;
  ring?: boolean;
}

// HTML/CSS avatar (for the grid + panel) with initials fallback on 404.
export function MemberAvatar({ member, size, large, ring = true }: MemberAvatarProps) {
  const [failed, setFailed] = useState(false);
  const colors = avatarColors(member.party);
  const ringColor = seatRingColor(member);
  const src = large ? member.photoUrl : member.photoThumb;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.bg,
        boxShadow: ring ? `0 0 0 ${Math.max(1.5, size * 0.05)}px ${ringColor}` : undefined,
      }}
    >
      {failed ? (
        <span style={{ color: colors.fg, fontSize: size * 0.4, fontWeight: 600 }}>{member.initials}</span>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
