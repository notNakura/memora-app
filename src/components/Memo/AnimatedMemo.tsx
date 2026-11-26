// Animated Memo: the mascot as a rig of flat SVG layers moved by Reanimated on the UI thread.
// Each reaction follows anticipation -> main action -> settle, with squash & stretch on the body
// and staggered parts (arms, face, effects). With reduce motion on it shows the static key pose.
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  AccessoryPart,
  ARM_GEOMETRY,
  ArmPart,
  BodyPart,
  BrowsPart,
  CLAP_TRAVEL,
  ClapBurstPart,
  ClapHandsPart,
  EyesPart,
  LevelArrowPart,
  MOUTH_CENTER,
  MouthPart,
  SparklesPart,
  StopwatchHandPart,
  StopwatchPart,
  TearsPart,
  ThoughtDotPart,
  ZPart,
  type MemoTone,
} from './parts';
import {
  ARM_TUCKED,
  KEY_POSES,
  REACTION_DURATION_MS,
  REACTION_LOOKS,
  type MemoAccessory,
  type MemoReaction,
  type RigPose,
} from './reactions';

export type AnimatedMemoHandle = {
  /** Plays a one-shot reaction, then Memo returns to its `mood`. */
  play: (reaction: MemoReaction) => void;
};

type Props = {
  /** Resting reaction Memo shows (and loops) between one-shot reactions. */
  mood?: MemoReaction;
  /** amber on dark or light backgrounds; white on amber surfaces. */
  tone?: MemoTone;
  size?: number;
  accessory?: MemoAccessory;
  /** Omit for decorative use; screen readers then skip it. */
  accessibilityLabel?: string;
  /** Called when a reaction started with `play()` finishes. */
  onReactionEnd?: (reaction: MemoReaction) => void;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<AnimatedMemoHandle>;
};

type Channel = keyof RigPose | 'eyeX' | 'capRot' | 'tick';
type Rig = Record<Channel, SharedValue<number>>;
const CHANNELS: Channel[] = [
  'ty', 'rot', 'sx', 'sy', 'armL', 'armR', 'eye', 'mouth', 'faceX', 'faceY', 'fx', 'fx2', 'clap', 'eyeX', 'capRot', 'tick',
];

const E = {
  inOut: Easing.inOut(Easing.cubic),
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.quad),
  outQuad: Easing.out(Easing.quad),
  back: Easing.out(Easing.back(2.2)),
  sine: Easing.inOut(Easing.sin),
  linear: Easing.linear,
};

function tm(value: number, duration: number, easing = E.inOut) {
  'worklet';
  return withTiming(value, { duration, easing });
}

function settle(value: number) {
  'worklet';
  return withSpring(value, { damping: 10, stiffness: 170, mass: 0.7 });
}

/** Squash & stretch: given body heights over time, widths keep the volume roughly constant. */
function squash(rig: Rig, steps: [number, number, ((t: number) => number)?][]) {
  const width = (h: number) => 1 + (1 - h) * 0.8;
  const [first, ...rest] = steps;
  const last = steps[steps.length - 1][0];
  rig.sy.value = withSequence(tm(first[0], first[1], first[2]), ...rest.map(([h, d, e]) => tm(h, d, e)), settle(last));
  rig.sx.value = withSequence(tm(width(first[0]), first[1], first[2]), ...rest.map(([h, d, e]) => tm(width(h), d, e)), settle(width(last)));
}

function resetChannels(rig: Rig) {
  for (const channel of CHANNELS) cancelAnimation(rig[channel]);
  // Keep rotation within one turn so the next reaction never spins back.
  rig.rot.value = ((((rig.rot.value + 180) % 360) + 360) % 360) - 180;
}

function applyPose(rig: Rig, reaction: MemoReaction) {
  const pose = KEY_POSES[reaction];
  for (const channel of CHANNELS) cancelAnimation(rig[channel]);
  for (const key of Object.keys(pose) as (keyof RigPose)[]) rig[key].value = pose[key];
  rig.eyeX.value = 1;
  rig.capRot.value = 0;
  rig.tick.value = 0;
}

/** Brings channels the reaction does not drive back to rest. */
function relax(rig: Rig, except: Channel[]) {
  const pose = KEY_POSES.idle;
  for (const key of Object.keys(pose) as (keyof RigPose)[]) {
    if (!except.includes(key) && key !== 'fx' && key !== 'fx2') rig[key].value = tm(pose[key], 280);
  }
  if (!except.includes('eyeX')) rig.eyeX.value = tm(1, 200);
  if (!except.includes('capRot')) rig.capRot.value = tm(0, 280);
}

function animate(rig: Rig, reaction: MemoReaction, oneShot: boolean) {
  resetChannels(rig);
  const times = (n: number) => (oneShot ? n : -1);
  switch (reaction) {
    case 'idle': {
      relax(rig, ['ty', 'sx', 'sy']);
      rig.sy.value = withSequence(tm(1, 300), withRepeat(withSequence(tm(1.03, 1500, E.sine), tm(1, 1500, E.sine)), -1));
      rig.sx.value = withSequence(tm(1, 300), withRepeat(withSequence(tm(0.985, 1500, E.sine), tm(1, 1500, E.sine)), -1));
      rig.ty.value = withSequence(tm(0, 300), withRepeat(withSequence(tm(-1.5, 1500, E.sine), tm(0, 1500, E.sine)), -1));
      break;
    }
    case 'happy': {
      relax(rig, ['ty', 'sx', 'sy', 'rot', 'armL', 'armR', 'mouth', 'eye']);
      // crouch | jump | fall | small hop | fall | settle
      rig.ty.value = withSequence(tm(4, 140, E.out), tm(-26, 230, E.outQuad), tm(0, 210, E.in), tm(-9, 150, E.outQuad), tm(0, 150, E.in), settle(0));
      squash(rig, [[0.86, 140, E.out], [1.12, 120, E.out], [1, 110], [1.04, 150, E.in], [0.88, 60, E.in], [1.05, 150, E.outQuad], [0.95, 150, E.in], [1, 1]]);
      rig.rot.value = withSequence(tm(0, 140), tm(-3, 230), tm(3, 210), tm(0, 300, E.sine));
      rig.armL.value = ARM_TUCKED.left;
      rig.armR.value = ARM_TUCKED.right;
      const tuckL = oneShot ? [withDelay(160, tm(ARM_TUCKED.left, 180, E.in))] : [];
      const tuckR = oneShot ? [withDelay(160, tm(ARM_TUCKED.right, 180, E.in))] : [];
      rig.armL.value = withSequence(withDelay(120, tm(-55, 260, E.back)), tm(-25, 180, E.sine), tm(-50, 180, E.sine), tm(-35, 200, E.sine), ...tuckL);
      rig.armR.value = withSequence(withDelay(150, tm(55, 260, E.back)), tm(25, 180, E.sine), tm(50, 180, E.sine), tm(35, 200, E.sine), ...tuckR);
      rig.mouth.value = withSequence(tm(0.5, 140), tm(1.15, 220, E.back), tm(1, 300));
      rig.eye.value = withSequence(tm(0.8, 140), tm(1.1, 200, E.back), tm(1, 300));
      break;
    }
    case 'celebrate': {
      relax(rig, ['ty', 'sx', 'sy', 'rot', 'armL', 'armR', 'mouth', 'eye', 'capRot']);
      // deep crouch | big jump | hang | fall | land | recover | bounce | settle
      rig.ty.value = withSequence(tm(8, 260), tm(-46, 300, E.out), tm(-46, 90), tm(0, 260, E.in), tm(3, 80, E.out), tm(0, 200, E.out), tm(-12, 180, E.outQuad), tm(0, 180, E.in), settle(0));
      squash(rig, [[0.8, 260], [1.18, 140, E.out], [1, 160], [1, 90], [1.06, 260, E.in], [0.84, 80, E.out], [1.04, 200, E.out], [1, 180], [0.94, 80, E.in], [1, 1]]);
      rig.rot.value = withSequence(tm(2, 260), tm(-8, 300, E.out), tm(6, 350, E.sine), tm(-6, 280, E.sine), tm(-4, 300, E.sine));
      rig.armL.value = ARM_TUCKED.left;
      rig.armR.value = ARM_TUCKED.right;
      const wiggle = (a: number, b: number) => withRepeat(withSequence(tm(a, 160, E.sine), tm(b, 160, E.sine)), times(3));
      rig.armL.value = withSequence(withDelay(260, tm(0, 280, E.back)), wiggle(-14, 8), tm(0, 200), ...(oneShot ? [tm(ARM_TUCKED.left, 180, E.in)] : []));
      rig.armR.value = withSequence(withDelay(290, tm(0, 280, E.back)), wiggle(14, -8), tm(0, 200), ...(oneShot ? [tm(ARM_TUCKED.right, 180, E.in)] : []));
      rig.mouth.value = withSequence(tm(0.6, 260), tm(1.2, 300, E.back), tm(1, 400));
      rig.eye.value = withSequence(tm(0.7, 260), tm(1.1, 200, E.back), tm(1, 300));
      // Follow-through: the cap lags behind the jump and wobbles into place.
      rig.capRot.value = withSequence(withDelay(560, tm(-10, 160, E.out)), tm(8, 220, E.sine), tm(-4, 200, E.sine), tm(0, 260, E.sine));
      rig.fx.value = 0;
      rig.fx.value = withDelay(520, withRepeat(withSequence(tm(1, 1500, E.linear), tm(0, 0)), times(1)));
      break;
    }
    case 'clap': {
      relax(rig, ['ty', 'sx', 'sy', 'rot', 'mouth', 'clap']);
      const n = times(5);
      // lean back (anticipation) | five claps with a body pulse on each impact | open hands
      rig.clap.value = withSequence(tm(0, 240), withRepeat(withSequence(tm(1, 110, E.in), tm(0.15, 160, E.outQuad)), n), tm(0, 200));
      rig.sy.value = withSequence(tm(1.05, 240, E.out), withRepeat(withSequence(tm(0.95, 110, E.in), tm(1.02, 160, E.outQuad)), n), settle(1));
      rig.sx.value = withSequence(tm(0.96, 240, E.out), withRepeat(withSequence(tm(1.04, 110, E.in), tm(0.99, 160, E.outQuad)), n), settle(1));
      rig.ty.value = withSequence(tm(-2, 240), withRepeat(withSequence(tm(1, 110, E.in), tm(-3, 160, E.outQuad)), n), tm(0, 200));
      rig.rot.value = withSequence(tm(-4, 240, E.out), withRepeat(withSequence(tm(1, 110), tm(-1, 160)), n), tm(0, 200));
      rig.mouth.value = withSequence(tm(1.15, 240, E.back), withRepeat(withSequence(tm(1, 110), tm(1.12, 160)), n), tm(1, 200));
      break;
    }
    case 'levelUp': {
      relax(rig, ['ty', 'sx', 'sy', 'rot', 'armL', 'armR', 'mouth', 'eye', 'eyeX', 'capRot']);
      // long crouch (charge) | launch with a full spin | land | settle
      rig.ty.value = withSequence(tm(10, 420), tm(-56, 380, E.out), tm(-58, 320), tm(0, 300, E.in), tm(4, 70, E.out), tm(0, 220, E.out), settle(0));
      squash(rig, [[0.78, 420], [1.22, 180, E.out], [1.05, 520], [1.08, 300, E.in], [0.82, 70, E.out], [1.04, 220, E.out], [1.02, 200]]);
      rig.rot.value = withSequence(tm(-3, 420), withDelay(100, tm(360, 600, E.inOut)));
      rig.armL.value = ARM_TUCKED.left;
      rig.armR.value = ARM_TUCKED.right;
      const pump = (a: number, b: number) => withRepeat(withSequence(tm(a, 180, E.sine), tm(b, 180, E.sine)), times(3));
      rig.armL.value = withSequence(withDelay(420, tm(0, 260, E.back)), pump(-12, 6), tm(0, 200), ...(oneShot ? [tm(ARM_TUCKED.left, 180, E.in)] : []));
      rig.armR.value = withSequence(withDelay(440, tm(0, 260, E.back)), pump(12, -6), tm(0, 200), ...(oneShot ? [tm(ARM_TUCKED.right, 180, E.in)] : []));
      const starPulse = () => withSequence(tm(0.6, 420), tm(1.35, 260, E.back), withRepeat(withSequence(tm(1, 260, E.sine), tm(1.2, 260, E.sine)), times(3)), tm(1, 200));
      rig.eye.value = starPulse();
      rig.eyeX.value = starPulse();
      rig.mouth.value = withSequence(tm(0.5, 420), tm(1.2, 260, E.back), tm(1, 400));
      rig.capRot.value = withSequence(withDelay(800, tm(-12, 200, E.out)), tm(6, 260, E.sine), tm(0, 300, E.sine));
      rig.fx.value = 0;
      rig.fx.value = withDelay(600, withRepeat(withSequence(tm(1, 1700, E.linear), tm(0, 0)), times(1)));
      rig.fx2.value = 0;
      rig.fx2.value = withDelay(500, withRepeat(withSequence(tm(1, 700, E.linear), tm(0, 0)), times(3)));
      break;
    }
    case 'sad': {
      relax(rig, ['ty', 'sx', 'sy', 'rot', 'mouth', 'eye', 'faceY']);
      // a small sigh up | slump down | quiet sobs with a slow sway
      rig.ty.value = withSequence(tm(-3, 350, E.out), tm(5, 700));
      rig.sy.value = withSequence(tm(1.05, 350, E.out), tm(0.93, 700), withRepeat(withSequence(tm(0.95, 180, E.out), tm(0.93, 220, E.in)), times(3)));
      rig.sx.value = withSequence(tm(0.97, 350, E.out), tm(1.04, 700), withRepeat(withSequence(tm(1.03, 180, E.out), tm(1.04, 220, E.in)), times(3)));
      rig.rot.value = withSequence(tm(1, 350), tm(-4, 700), withRepeat(withSequence(tm(-6, 700, E.sine), tm(-4, 700, E.sine)), times(1)));
      rig.faceY.value = withSequence(tm(-1, 350), tm(3, 700));
      rig.eye.value = withSequence(tm(1, 350), tm(0.85, 700));
      rig.mouth.value = withSequence(tm(1.1, 350), tm(0.9, 700), tm(1, 400));
      rig.fx.value = 0;
      rig.fx.value = withDelay(800, withRepeat(withSequence(tm(1, 900, E.in), tm(0, 0)), times(2)));
      break;
    }
    case 'thinking': {
      relax(rig, ['rot', 'faceX', 'faceY', 'armR', 'mouth']);
      // glance away | tilt into the thought | chin tap while the dots appear
      rig.rot.value = withSequence(tm(-2, 200, E.out), tm(6, 380, E.back), withRepeat(withSequence(tm(3, 900, E.sine), tm(6, 900, E.sine)), times(1)));
      rig.faceX.value = withSequence(tm(-1, 200), tm(4, 380, E.back));
      rig.faceY.value = withSequence(tm(1, 200), tm(-3, 380, E.back));
      rig.armR.value = 60;
      rig.armR.value = withSequence(withDelay(150, tm(0, 350, E.back)), withRepeat(withSequence(tm(-6, 250, E.sine), tm(0, 250, E.sine)), times(2)), ...(oneShot ? [withDelay(400, tm(60, 200, E.in))] : []));
      rig.mouth.value = withSequence(tm(0.7, 200), tm(1, 380, E.back));
      rig.fx.value = 0;
      rig.fx.value = withDelay(400, withRepeat(withSequence(tm(1, 1600, E.linear), tm(0, 0)), times(1)));
      break;
    }
    case 'challenge': {
      relax(rig, ['ty', 'sx', 'sy', 'faceY', 'eye', 'tick']);
      // lean back | determined squat | ready, focused breathing while the stopwatch runs
      rig.sy.value = withSequence(tm(1.04, 200, E.out), tm(0.94, 180, E.in), tm(1.02, 220, E.back), withRepeat(withSequence(tm(1.025, 700, E.sine), tm(1, 700, E.sine)), times(1)));
      rig.sx.value = withSequence(tm(0.97, 200, E.out), tm(1.05, 180, E.in), tm(0.99, 220, E.back), withRepeat(withSequence(tm(0.985, 700, E.sine), tm(1, 700, E.sine)), times(1)));
      rig.ty.value = withSequence(tm(-2, 200), tm(2, 180), tm(0, 220));
      rig.faceY.value = withSequence(tm(1, 200), tm(-1, 400));
      rig.eye.value = withSequence(tm(1, 200), tm(0.7, 180), tm(1, 220));
      rig.tick.value = 0;
      rig.tick.value = withRepeat(tm(360, 4000, E.linear), times(1));
      break;
    }
    case 'sleep': {
      relax(rig, ['ty', 'sx', 'sy', 'rot', 'mouth', 'eye']);
      // yawn and stretch | slump | slow sleep breathing with drifting Zzz
      rig.mouth.value = withSequence(tm(1.8, 500, E.out), tm(1.8, 300), tm(1, 400));
      rig.sy.value = withSequence(tm(1.07, 500, E.out), tm(1.07, 300), tm(0.97, 600), withRepeat(withSequence(tm(1, 1400, E.sine), tm(0.97, 1400, E.sine)), times(1)));
      rig.sx.value = withSequence(tm(0.95, 500, E.out), tm(0.95, 300), tm(1.02, 600), withRepeat(withSequence(tm(1, 1400, E.sine), tm(1.02, 1400, E.sine)), times(1)));
      rig.rot.value = withSequence(tm(2, 500), tm(2, 300), tm(-6, 700));
      rig.ty.value = withSequence(tm(-2, 500), tm(-2, 300), tm(0, 600));
      rig.eye.value = withSequence(tm(0.8, 500), tm(1, 300));
      rig.fx.value = 0;
      rig.fx.value = withDelay(900, withRepeat(tm(1, 2400, E.linear), -1));
      break;
    }
    case 'wave': {
      relax(rig, ['ty', 'sx', 'sy', 'rot', 'armR', 'mouth', 'eye']);
      // dip | pop up with the arm | three waves | lower the arm
      rig.armR.value = ARM_TUCKED.right;
      rig.armR.value = withSequence(withDelay(160, tm(0, 280, E.back)), withRepeat(withSequence(tm(-22, 220, E.sine), tm(14, 220, E.sine)), times(3)), tm(0, 200), ...(oneShot ? [tm(ARM_TUCKED.right, 200, E.in)] : []));
      rig.rot.value = withSequence(tm(2, 160), tm(-4, 280, E.back), withRepeat(withSequence(tm(-2, 220, E.sine), tm(-4, 220, E.sine)), times(3)), tm(0, 300));
      rig.ty.value = withSequence(tm(2, 160), tm(-6, 200, E.outQuad), tm(0, 250, E.in), settle(0));
      squash(rig, [[0.92, 160, E.out], [1.08, 200, E.outQuad], [0.97, 250, E.in], [1, 1]]);
      rig.mouth.value = withSequence(tm(0.8, 160), tm(1.15, 320, E.back), tm(1, 400));
      rig.eye.value = withSequence(tm(1, 500), tm(0.1, 70, E.in), tm(1, 120, E.out));
      break;
    }
  }
}

function useBlink(rig: Rig, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        const blink = withSequence(tm(0.1, 70, E.in), tm(1, 120, E.out));
        // Now and then a double blink, which reads as more alive than a metronome.
        rig.eye.value = Math.random() < 0.25 ? withSequence(blink, withDelay(90, withSequence(tm(0.1, 70, E.in), tm(1, 120, E.out)))) : blink;
        schedule();
      }, 2200 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [rig, enabled]);
}

const fill = StyleSheet.absoluteFill;

export function AnimatedMemo({
  mood = 'idle',
  tone = 'amber',
  size = 76,
  accessory,
  accessibilityLabel,
  onReactionEnd,
  style,
  ref,
}: Props) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<{ reaction: MemoReaction; id: number; oneShot: boolean }>({
    reaction: mood,
    id: 0,
    oneShot: false,
  });
  const moodRef = useRef(mood);
  const onEndRef = useRef(onReactionEnd);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  moodRef.current = mood;
  onEndRef.current = onReactionEnd;

  const created: Rig = {
    ty: useSharedValue(0),
    rot: useSharedValue(0),
    sx: useSharedValue(1),
    sy: useSharedValue(1),
    armL: useSharedValue(0),
    armR: useSharedValue(0),
    eye: useSharedValue(1),
    mouth: useSharedValue(1),
    faceX: useSharedValue(0),
    faceY: useSharedValue(0),
    fx: useSharedValue(0.5),
    fx2: useSharedValue(0.5),
    clap: useSharedValue(0),
    eyeX: useSharedValue(1),
    capRot: useSharedValue(0),
    tick: useSharedValue(0),
  };
  const rigRef = useRef(created);
  const rig = rigRef.current;
  const opacity = useSharedValue(1);

  // Mood changes apply when no one-shot reaction is playing.
  useEffect(() => {
    if (timer.current === null) setState((s) => (s.reaction === mood ? s : { reaction: mood, id: s.id + 1, oneShot: false }));
  }, [mood]);

  const play = useCallback((reaction: MemoReaction) => {
    if (timer.current !== null) clearTimeout(timer.current);
    setState((s) => ({ reaction, id: s.id + 1, oneShot: true }));
    timer.current = setTimeout(() => {
      timer.current = null;
      setState((s) => ({ reaction: moodRef.current, id: s.id + 1, oneShot: false }));
      onEndRef.current?.(reaction);
    }, REACTION_DURATION_MS[reaction]);
  }, []);

  useImperativeHandle(ref, () => ({ play }), [play]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const { reaction, id, oneShot } = state;
  useEffect(() => {
    const r = rig;
    if (reduced) {
      // Static pose; a short cross-fade is the only motion (reduce motion is on).
      applyPose(r, reaction);
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: 200, reduceMotion: ReduceMotion.Never });
      return;
    }
    opacity.value = 1;
    animate(r, reaction, oneShot);
  }, [reaction, id, oneShot, reduced, opacity, rig]);

  const look = REACTION_LOOKS[reaction];
  useBlink(rig, !reduced && !!look.blinks);

  const k = size / 200;
  const stageStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      // Squash pivots at the body centre; this keeps the bottom on the ground.
      { translateY: (rig.ty.value + (1 - rig.sy.value) * 60) * k },
      { rotate: `${rig.rot.value}deg` },
      { scaleX: rig.sx.value },
      { scaleY: rig.sy.value },
    ],
  }));
  const armLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rig.armL.value}deg` }] }));
  const armRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rig.armR.value}deg` }] }));
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rig.faceX.value * k }, { translateY: rig.faceY.value * k }],
  }));
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: rig.eyeX.value }, { scaleY: rig.eye.value }] }));
  const mouthStyle = useAnimatedStyle(() => ({ transform: [{ scale: rig.mouth.value }] }));
  const tearStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rig.fx.value, [0, 0.1, 0.7, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: rig.fx.value * 22 * k }],
  }));
  const lift = reaction === 'levelUp' ? 34 : 10;
  const sparkleStyle = useAnimatedStyle(() => {
    const p = rig.fx.value;
    return {
      opacity: interpolate(p, [0, 0.12, 0.75, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: (0.5 - p) * lift * k },
        { scale: interpolate(p, [0, 0.2, 0.32], [0.3, 1.15, 1], Extrapolation.CLAMP) },
        { rotate: `${(p - 0.5) * 40}deg` },
      ],
    };
  });
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rig.fx2.value, [0, 0.2, 0.75, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: (0.5 - rig.fx2.value) * 28 * k }],
  }));
  const handLStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rig.clap.value * CLAP_TRAVEL * k }] }));
  const handRStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -rig.clap.value * CLAP_TRAVEL * k }] }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rig.clap.value, [0.75, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(rig.clap.value, [0.75, 1], [0.7, 1.1], Extrapolation.CLAMP) }],
  }));
  const capStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rig.capRot.value}deg` }] }));
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rig.tick.value}deg` }] }));

  const decorative = !accessibilityLabel;
  const eyeOrigin = `${(100 + look.eyeShiftX) / 2}% ${look.eyeY / 2}%`;
  const accessoryPart = (wanted: MemoAccessory) =>
    accessory === wanted ? (
      <View style={fill}>
        <AccessoryPart accessory={wanted} eyeY={look.eyeY} eyeShiftX={look.eyeShiftX} />
      </View>
    ) : null;
  const arm = (side: 'left' | 'right') => {
    const shape = side === 'left' ? look.armLeft : look.armRight;
    if (!shape) return null;
    return (
      <Animated.View
        style={[fill, side === 'left' ? armLStyle : armRStyle, { transformOrigin: ARM_GEOMETRY[side][shape].origin }]}
      >
        <ArmPart side={side} shape={shape} tone={tone} />
      </Animated.View>
    );
  };
  const armInFront = (side: 'left' | 'right') => (side === 'left' ? look.armLeft : look.armRight) === 'chin';

  return (
    <View
      testID="animated-memo"
      style={[{ width: size, height: size }, style]}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <Animated.View testID={reduced ? 'memo-stage-static' : 'memo-stage-animated'} style={[fill, stageStyle]}>
        <View testID={`memo-reaction-${reaction}`} style={fill} pointerEvents="none">
          {look.levelArrow && (
            <Animated.View style={[fill, arrowStyle]}>
              <LevelArrowPart />
            </Animated.View>
          )}
          <Animated.View style={[fill, bodyStyle, { transformOrigin: '50% 55%' }]}>
            {!armInFront('left') && arm('left')}
            {!armInFront('right') && arm('right')}
            <View style={fill}>
              <BodyPart tone={tone} />
            </View>
            <Animated.View style={[fill, faceStyle]}>
              <Animated.View style={[fill, eyeStyle, { transformOrigin: eyeOrigin }]}>
                <EyesPart shape={look.eyes} y={look.eyeY} shiftX={look.eyeShiftX} />
              </Animated.View>
              {look.brows && (
                <View style={fill}>
                  <BrowsPart kind={look.brows} />
                </View>
              )}
              {look.mouth && (
                <Animated.View style={[fill, mouthStyle, { transformOrigin: `50% ${MOUTH_CENTER[look.mouth] / 2}%` }]}>
                  <MouthPart shape={look.mouth} />
                </Animated.View>
              )}
              {accessoryPart('glasses')}
            </Animated.View>
            {look.tears && (
              <Animated.View style={[fill, tearStyle]}>
                <TearsPart tone={tone} eyeY={look.eyeY} />
              </Animated.View>
            )}
            {accessoryPart('scarf')}
            {look.stopwatch && (
              <>
                <View style={fill}>
                  <StopwatchPart tone={tone} />
                </View>
                <Animated.View style={[fill, tickStyle, { transformOrigin: '50% 77%' }]}>
                  <StopwatchHandPart />
                </Animated.View>
              </>
            )}
            {look.clapHands && (
              <View testID="memo-hands-clap" style={fill}>
                <Animated.View style={[fill, burstStyle, { transformOrigin: '50% 78%' }]}>
                  <ClapBurstPart />
                </Animated.View>
                <Animated.View style={[fill, handLStyle]}>
                  <ClapHandsPart side="left" tone={tone} />
                </Animated.View>
                <Animated.View style={[fill, handRStyle]}>
                  <ClapHandsPart side="right" tone={tone} />
                </Animated.View>
              </View>
            )}
            {armInFront('left') && arm('left')}
            {armInFront('right') && arm('right')}
            {accessory === 'cap' && (
              <Animated.View style={[fill, capStyle, { transformOrigin: '50% 22%' }]}>
                <AccessoryPart accessory="cap" eyeY={look.eyeY} eyeShiftX={look.eyeShiftX} />
              </Animated.View>
            )}
          </Animated.View>
          {look.sparkles && (
            <Animated.View style={[fill, sparkleStyle]}>
              <SparklesPart tone={tone} />
            </Animated.View>
          )}
          {look.zzz && (
            <View testID="memo-zzz" style={fill}>
              {[0, 1, 2].map((i) => (
                <PhaseLayer key={i} progress={rig.fx} index={i} kind="zzz" scale={k}>
                  <ZPart index={i} tone={tone} />
                </PhaseLayer>
              ))}
            </View>
          )}
          {look.thoughtDots && (
            <View testID="memo-thought-dots" style={fill}>
              {[0, 1, 2].map((i) => (
                <PhaseLayer key={i} progress={rig.fx} index={i} kind="dots" scale={k}>
                  <ThoughtDotPart index={i} tone={tone} />
                </PhaseLayer>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

/** One of three staggered effect pieces (Zzz drift up one after another; thought dots pop in turn). */
function PhaseLayer({
  progress,
  index,
  kind,
  scale,
  children,
}: {
  progress: SharedValue<number>;
  index: number;
  kind: 'zzz' | 'dots';
  scale: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    if (kind === 'zzz') {
      const p = (progress.value + index / 3) % 1;
      return {
        opacity: interpolate(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
        transform: [{ translateX: p * 6 * scale }, { translateY: (0.5 - p) * 14 * scale }],
      };
    }
    const start = index * 0.22;
    return {
      opacity: interpolate(progress.value, [start, start + 0.12, 0.85, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(progress.value, [start, start + 0.12], [0.4, 1], Extrapolation.CLAMP) }],
    };
  });
  return <Animated.View style={[fill, style]}>{children}</Animated.View>;
}
