import { ImageResponse } from 'next/og';
import {
  MARK_BACKGROUND,
  MARK_FRONT_FILL,
  MARK_FRONT_PATH,
  MARK_REAR_FILL,
  MARK_REAR_PATH,
  MARK_SCALE,
} from '@/lib/mark';

export const runtime = 'nodejs';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

/**
 * The icon the manifest hands to Android, and the one a browser uses where no favicon applies.
 *
 * The manifest offers it as "maskable", which lets a launcher crop it to whatever shape it likes --
 * a circle, a squircle -- so the mark is scaled well inside the square and the tails survive.
 *
 * It replaces a microphone with "GT" on it, which named a product that no longer exists and read as
 * a recording app.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: MARK_BACKGROUND,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="512" height="512" viewBox="0 0 512 512">
          <g transform={`translate(256 256) scale(${MARK_SCALE.maskable}) translate(-256 -256)`}>
            <path d={MARK_REAR_PATH} fill={MARK_REAR_FILL} />
            <path d={MARK_FRONT_PATH} fill={MARK_FRONT_FILL} />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
