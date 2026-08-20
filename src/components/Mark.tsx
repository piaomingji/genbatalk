import React from 'react';
import {
  MARK_FRONT_FILL,
  MARK_FRONT_PATH,
  MARK_REAR_FILL,
  MARK_REAR_PATH,
} from '@/lib/mark';

/**
 * The Talkie mark, for use inside the interface.
 *
 * The header used to show a generic sparkle in a purple gradient tile -- a stock "this is AI" badge
 * that said nothing about what the app does, and matched neither the home-screen icon nor the
 * browser tab. Drawing the real mark here means someone who added Talkie to their home screen sees
 * the same thing when they open it.
 *
 * No background: the bubbles carry their own colour and sit directly on the dark interface, which
 * keeps the two-colour meaning that a single-colour tile would flatten.
 */
export default function Mark({ className = '' }: { className?: string }) {
  return (
    // Cropped to the mark's own bounding box rather than the icon's 512 square. The icons keep
    // that square because a launcher needs the padding; here it would only make the mark sit low
    // and small in whatever box the layout gives it.
    <svg viewBox="74 118 364 374" className={className} role="img" aria-label="Talkie">
      <path d={MARK_REAR_PATH} fill={MARK_REAR_FILL} />
      <path d={MARK_FRONT_PATH} fill={MARK_FRONT_FILL} />
    </svg>
  );
}
