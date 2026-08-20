import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

/**
 * The icon iOS uses when the app is added to a home screen.
 *
 * Without this file iOS has no icon to take: it looks for an apple-touch-icon, finds none, and falls
 * back to a shrunken screenshot of the page -- which is why the home screen kept showing something
 * that had nothing to do with the mark. Android reads the manifest and was already fine.
 *
 * The same two bubbles as `icon.tsx`, drawn a little larger. iOS only rounds the corners; it does
 * not crop into the middle the way an Android launcher mask can, so the generous safe area the
 * maskable icon needs would only make this one look small.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0b1020',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 512 512">
          <g transform="translate(256 256) scale(0.86) translate(-256 -256)">
            {/* Rear bubble: the first speaker. */}
            <path
              d="M128 118 h196 a54 54 0 0 1 54 54 v112 a54 54 0 0 1 -54 54 h-102 l-68 60 v-60 h-26 a54 54 0 0 1 -54 -54 v-112 a54 54 0 0 1 54 -54 z"
              fill="#6366f1"
            />
            {/* Front bubble: the reply, overlapping so the two read as one conversation. */}
            <path
              d="M188 212 h196 a54 54 0 0 1 54 54 v112 a54 54 0 0 1 -54 54 h-26 v60 l-68 -60 h-102 a54 54 0 0 1 -54 -54 v-112 a54 54 0 0 1 54 -54 z"
              fill="#10b981"
            />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
