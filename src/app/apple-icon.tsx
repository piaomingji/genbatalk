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
 * Drawn larger than the maskable icon: iOS only rounds the corners, it does not crop into the
 * middle, so the safe area Android needs would leave this one looking small.
 */
export default function AppleIcon() {
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
        <svg width="180" height="180" viewBox="0 0 512 512">
          <g transform={`translate(256 256) scale(${MARK_SCALE.ios}) translate(-256 -256)`}>
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
