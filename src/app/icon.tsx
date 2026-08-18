import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

/**
 * Two speech bubbles, overlapping.
 *
 * The mark carries no letters on purpose: this app is used by people who may not read the alphabet
 * the name is written in, and a symbol needs no translation. Two bubbles in two colours say what the
 * app is for -- two languages meeting -- and the shape stays legible at the size a home screen
 * actually shows it.
 *
 * It replaces a microphone with "GT" on it, which named a product that no longer exists and read as
 * a recording app.
 */
export default function Icon() {
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
        <svg width="512" height="512" viewBox="0 0 512 512">
          {/* Held inside the safe area. The manifest offers this icon as "maskable", which lets
              Android crop it to whatever shape the launcher uses -- a circle, a squircle -- and
              anything near the edge is lost in the process. Everything is scaled in so the tails
              survive the crop. */}
          <g transform="translate(256 256) scale(0.75) translate(-256 -256)">
          {/* Rear bubble: the first speaker. Tail on the left, pointing away from the pair. */}
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
