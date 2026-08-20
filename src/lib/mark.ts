/**
 * The Talkie mark, as raw geometry.
 *
 * Two overlapping speech bubbles. The mark carries no letters on purpose: this app is used by people
 * who may not read the alphabet the name is written in, and a symbol needs no translation. Two
 * bubbles in two colours say what the app is for -- two languages meeting.
 *
 * Kept here rather than in any one component because four places draw it: the browser favicon, the
 * Android/manifest icon, the iOS home-screen icon, and the app's own header. Copies of path data
 * drift; the header had already fallen behind and was still showing a generic sparkle long after
 * the mark was redrawn.
 *
 * Both paths are written for a 512x512 viewBox.
 */

/** The first speaker. Its tail sits behind the front bubble and is not visible in the pair. */
export const MARK_REAR_PATH =
  'M128 118 h196 a54 54 0 0 1 54 54 v112 a54 54 0 0 1 -54 54 h-102 l-68 60 v-60 h-26 a54 54 0 0 1 -54 -54 v-112 a54 54 0 0 1 54 -54 z';

/** The reply, overlapping so the two read as one conversation. */
export const MARK_FRONT_PATH =
  'M188 212 h196 a54 54 0 0 1 54 54 v112 a54 54 0 0 1 -54 54 h-26 v60 l-68 -60 h-102 a54 54 0 0 1 -54 -54 v-112 a54 54 0 0 1 54 -54 z';

export const MARK_REAR_FILL = '#6366f1';
export const MARK_FRONT_FILL = '#10b981';

/** The backdrop the icons are drawn on. Matches the app's own background. */
export const MARK_BACKGROUND = '#0b1020';

/**
 * How far the mark is scaled in from the edges of the square, per use.
 *
 * A launcher on Android may crop a maskable icon to a circle or a squircle, so anything near the
 * edge is lost -- hence the generous inset there. A favicon and an iOS icon are never cropped into,
 * so the same inset would only make the mark look small.
 */
export const MARK_SCALE = {
  maskable: 0.75,
  ios: 0.86,
  bare: 1,
} as const;
