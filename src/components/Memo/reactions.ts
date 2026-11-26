// What each Memo reaction looks like: face parts, arms, props and its resting ("key") pose.
// Geometry follows design/mascota/*.svg (viewBox 0 0 200 200).

export const MEMO_REACTIONS = [
  'idle',
  'happy',
  'celebrate',
  'clap',
  'levelUp',
  'sad',
  'thinking',
  'challenge',
  'sleep',
  'wave',
] as const;
export type MemoReaction = (typeof MEMO_REACTIONS)[number];

export const MEMO_ACCESSORIES = ['cap', 'glasses', 'scarf'] as const;
export type MemoAccessory = (typeof MEMO_ACCESSORIES)[number];

/** How long a one-shot `play(reaction)` lasts before Memo goes back to its mood. */
export const REACTION_DURATION_MS: Record<MemoReaction, number> = {
  idle: 1200,
  happy: 1300,
  celebrate: 2300,
  clap: 1900,
  levelUp: 2700,
  sad: 2800,
  thinking: 2200,
  challenge: 1800,
  sleep: 3400,
  wave: 1700,
};

export type EyeShape = 'open' | 'happy' | 'star' | 'sad' | 'look' | 'closed';
export type MouthShape = 'smile' | 'open' | 'frown' | 'dot' | 'o';
export type ArmShape = 'up' | 'wave' | 'chin';

export type ReactionLook = {
  eyes: EyeShape;
  /** Vertical centre of the eyes (blink and glasses pivot). */
  eyeY: number;
  /** Horizontal shift of the eyes, as in the "pensando" pose. */
  eyeShiftX: number;
  mouth: MouthShape | null;
  brows?: 'sad' | 'focus';
  armLeft?: ArmShape;
  armRight?: ArmShape;
  sparkles?: boolean;
  tears?: boolean;
  zzz?: boolean;
  thoughtDots?: boolean;
  clapHands?: boolean;
  stopwatch?: boolean;
  levelArrow?: boolean;
  /** Eyes may blink while this reaction lasts. */
  blinks?: boolean;
};

export const REACTION_LOOKS: Record<MemoReaction, ReactionLook> = {
  idle: { eyes: 'open', eyeY: 126, eyeShiftX: 0, mouth: 'smile', blinks: true },
  happy: { eyes: 'happy', eyeY: 124, eyeShiftX: 0, mouth: 'open', armLeft: 'up', armRight: 'up' },
  celebrate: {
    eyes: 'happy',
    eyeY: 124,
    eyeShiftX: 0,
    mouth: 'open',
    armLeft: 'up',
    armRight: 'up',
    sparkles: true,
  },
  clap: { eyes: 'happy', eyeY: 124, eyeShiftX: 0, mouth: 'open', clapHands: true },
  levelUp: {
    eyes: 'star',
    eyeY: 122,
    eyeShiftX: 0,
    mouth: 'open',
    armLeft: 'up',
    armRight: 'up',
    sparkles: true,
    levelArrow: true,
  },
  sad: { eyes: 'sad', eyeY: 126, eyeShiftX: 0, mouth: 'frown', brows: 'sad', tears: true },
  thinking: {
    eyes: 'look',
    eyeY: 120,
    eyeShiftX: 6,
    mouth: 'dot',
    armRight: 'chin',
    thoughtDots: true,
    blinks: true,
  },
  challenge: { eyes: 'open', eyeY: 118, eyeShiftX: 0, mouth: null, brows: 'focus', stopwatch: true, blinks: true },
  sleep: { eyes: 'closed', eyeY: 130, eyeShiftX: 0, mouth: 'o', zzz: true },
  wave: { eyes: 'open', eyeY: 126, eyeShiftX: 0, mouth: 'smile', armRight: 'wave', blinks: true },
};

/**
 * Values every animated channel holds when a reaction rests. Animations end here, and with
 * reduce motion Memo jumps straight to it (the static pose).
 * Units: ty/faceX/faceY in viewBox units, rotations in degrees, scales unitless, fx/fx2/clap 0..1.
 */
export type RigPose = {
  ty: number;
  rot: number;
  sx: number;
  sy: number;
  armL: number;
  armR: number;
  eye: number;
  mouth: number;
  faceX: number;
  faceY: number;
  fx: number;
  fx2: number;
  clap: number;
};

export const NEUTRAL_POSE: RigPose = {
  ty: 0,
  rot: 0,
  sx: 1,
  sy: 1,
  armL: 0,
  armR: 0,
  eye: 1,
  mouth: 1,
  faceX: 0,
  faceY: 0,
  fx: 0.5,
  fx2: 0.5,
  clap: 0,
};

export const KEY_POSES: Record<MemoReaction, RigPose> = {
  idle: NEUTRAL_POSE,
  happy: { ...NEUTRAL_POSE, armL: -35, armR: 35 },
  celebrate: { ...NEUTRAL_POSE, rot: -4 },
  clap: { ...NEUTRAL_POSE, clap: 1 },
  levelUp: { ...NEUTRAL_POSE, sy: 1.02, sx: 0.99 },
  sad: { ...NEUTRAL_POSE, ty: 5, rot: -4, sy: 0.93, sx: 1.04, faceY: 3, eye: 0.85, fx: 0.35 },
  thinking: { ...NEUTRAL_POSE, rot: 3, faceX: 4, faceY: -3, fx: 0.7 },
  challenge: { ...NEUTRAL_POSE, faceY: -1 },
  sleep: { ...NEUTRAL_POSE, rot: -6, sy: 0.97, sx: 1.02 },
  wave: NEUTRAL_POSE,
};

/** Arm rotation that hides an arm behind the body (arms grow out of it). */
export const ARM_TUCKED = { left: 150, right: -150 } as const;
