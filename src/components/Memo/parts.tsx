// Memo's body parts as flat SVG layers. Each layer shares the 200x200 viewBox of design/mascota,
// so the rig can stack them and animate each one on its own (see AnimatedMemo.tsx).
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { base3D, colors } from '../../theme';
import type { ArmShape, EyeShape, MemoAccessory, MouthShape } from './reactions';

export type MemoTone = 'amber' | 'white';

export const FACE = colors.textOnLight; // #0E1430, eyes and mouth in every pose
export const BODY_PATH =
  'M100 44 C138 44 162 92 166 132 C169 162 142 170 100 170 C58 170 31 162 34 132 C38 92 62 44 100 44 Z';

export function bodyColor(tone: MemoTone) {
  return tone === 'white' ? colors.white : colors.amber;
}
/** Hands in front of the body use the solid 3D base shade so they read on the same colour. */
export function handColor(tone: MemoTone) {
  return tone === 'white' ? base3D.white : base3D.amber;
}
/** Tears contrast with the body: mint on amber, teal on white. */
export function tearColor(tone: MemoTone) {
  return tone === 'white' ? colors.teal : colors.mint;
}

type LayerProps = { children: React.ReactNode };
function Layer({ children }: LayerProps) {
  return (
    <Svg viewBox="0 0 200 200" width="100%" height="100%">
      {children}
    </Svg>
  );
}

export function BodyPart({ tone }: { tone: MemoTone }) {
  return (
    <Layer>
      <Path testID="memo-body" d={BODY_PATH} fill={bodyColor(tone)} />
    </Layer>
  );
}

/** Shoulder pivots, as percentages of the layer (for transformOrigin). */
export const ARM_GEOMETRY: Record<'left' | 'right', Record<ArmShape, { d: string; origin: string }>> = {
  left: {
    up: { d: 'M48 116 Q30 96 34 72', origin: '24% 58%' },
    wave: { d: 'M44 118 Q26 100 28 78', origin: '22% 59%' },
    chin: { d: 'M48 150 Q58 162 76 154', origin: '24% 75%' },
  },
  right: {
    up: { d: 'M152 116 Q170 96 166 72', origin: '76% 58%' },
    wave: { d: 'M156 118 Q174 100 172 78', origin: '78% 59%' },
    chin: { d: 'M152 150 Q142 162 124 154', origin: '76% 75%' },
  },
};

export function ArmPart({ side, shape, tone }: { side: 'left' | 'right'; shape: ArmShape; tone: MemoTone }) {
  const { d } = ARM_GEOMETRY[side][shape];
  // The chin arm rests in front of the body, so it uses the 3D base shade to stay visible.
  const stroke = shape === 'chin' ? handColor(tone) : bodyColor(tone);
  return (
    <Layer>
      <Path testID={`memo-arm-${side}`} d={d} stroke={stroke} strokeWidth={16} fill="none" strokeLinecap="round" />
    </Layer>
  );
}

function star(cx: number, cy: number, r: number) {
  return `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
}

export function EyesPart({ shape, y, shiftX }: { shape: EyeShape; y: number; shiftX: number }) {
  const lx = 77 + shiftX;
  const rx = 123 + shiftX;
  let eyes: React.ReactNode;
  switch (shape) {
    case 'happy':
      eyes = (
        <Path
          d={`M${lx - 6} ${y + 2} Q${lx} ${y - 5} ${lx + 6} ${y + 2} M${rx - 6} ${y + 2} Q${rx} ${y - 5} ${rx + 6} ${y + 2}`}
          stroke={FACE}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
      );
      break;
    case 'closed':
      eyes = (
        <Path
          d={`M${lx - 6} ${y} Q${lx} ${y + 5} ${lx + 6} ${y} M${rx - 6} ${y} Q${rx} ${y + 5} ${rx + 6} ${y}`}
          stroke={FACE}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
      );
      break;
    case 'star':
      eyes = <Path d={`${star(lx, y, 8)} ${star(rx, y, 8)}`} fill={FACE} />;
      break;
    case 'sad':
      eyes = (
        <G>
          <Ellipse cx={lx} cy={y} rx={4.5} ry={5.5} fill={FACE} />
          <Ellipse cx={rx} cy={y} rx={4.5} ry={5.5} fill={FACE} />
        </G>
      );
      break;
    default:
      eyes = (
        <G>
          <Ellipse cx={lx} cy={y} rx={4.5} ry={6.5} fill={FACE} />
          <Ellipse cx={rx} cy={y} rx={4.5} ry={6.5} fill={FACE} />
        </G>
      );
  }
  return (
    <Layer>
      <G testID={`memo-eyes-${shape}`}>{eyes}</G>
    </Layer>
  );
}

export function BrowsPart({ kind }: { kind: 'sad' | 'focus' }) {
  // focus copies the "reto" pose; sad mirrors it (inner ends raised).
  const d = kind === 'focus' ? 'M70 106 L84 110 M130 106 L116 110' : 'M70 115 L84 109 M130 115 L116 109';
  return (
    <Layer>
      <Path testID={`memo-brows-${kind}`} d={d} stroke={FACE} strokeWidth={4} strokeLinecap="round" />
    </Layer>
  );
}

/** Mouth centre per shape, used as the pivot when the mouth opens or yawns. */
export const MOUTH_CENTER: Record<MouthShape, number> = { smile: 143, open: 143, frown: 143, dot: 142, o: 146 };

export function MouthPart({ shape }: { shape: MouthShape }) {
  let mouth: React.ReactNode;
  switch (shape) {
    case 'open':
      mouth = <Path d="M90 137 Q100 152 110 137 Z" fill={FACE} />;
      break;
    case 'frown':
      mouth = <Path d="M92 147 Q100 140 108 147" stroke={FACE} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
      break;
    case 'dot':
      mouth = <Circle cx={108} cy={142} r={3.5} fill={FACE} />;
      break;
    case 'o':
      mouth = <Ellipse cx={100} cy={146} rx={3.5} ry={4} fill={FACE} />;
      break;
    default:
      mouth = <Path d="M92 140 Q100 147 108 140" stroke={FACE} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
  }
  return (
    <Layer>
      <G testID={`memo-mouth-${shape}`}>{mouth}</G>
    </Layer>
  );
}

function tear(x: number, y: number) {
  return `M${x} ${y - 6} Q${x + 5} ${y + 1} ${x} ${y + 5} Q${x - 5} ${y + 1} ${x} ${y - 6} Z`;
}

export function TearsPart({ tone, eyeY }: { tone: MemoTone; eyeY: number }) {
  return (
    <Layer>
      <Path testID="memo-tears" d={`${tear(74, eyeY + 12)} ${tear(126, eyeY + 12)}`} fill={tearColor(tone)} />
    </Layer>
  );
}

const SPARKLES = [
  [30, 52, 10],
  [172, 42, 12],
  [18, 112, 7],
  [184, 100, 8],
  [62, 22, 7],
  [142, 16, 8],
] as const;

export function SparklesPart({ tone }: { tone: MemoTone }) {
  return (
    <Layer>
      <Path testID="memo-sparkles" d={SPARKLES.map(([x, y, r]) => star(x, y, r)).join(' ')} fill={bodyColor(tone)} />
    </Layer>
  );
}

export function LevelArrowPart() {
  return (
    <Layer>
      <Path
        testID="memo-level-arrow"
        d="M84 30 L100 16 L116 30 M88 42 L100 31 L112 42"
        stroke={colors.teal}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Layer>
  );
}

/** One "Z" of the sleep reaction; index 0 is the smallest and closest to Memo. */
export const ZZZ = [
  [138, 62, 11],
  [154, 40, 15],
  [172, 14, 19],
] as const;

export function ZPart({ index, tone }: { index: number; tone: MemoTone }) {
  const [x, y, s] = ZZZ[index];
  return (
    <Layer>
      <Path
        d={`M${x} ${y} H${x + s} L${x} ${y + s} H${x + s}`}
        stroke={bodyColor(tone)}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Layer>
  );
}

export const THOUGHT_DOTS = [
  [140, 74, 4],
  [152, 56, 6],
  [168, 34, 8],
] as const;

export function ThoughtDotPart({ index, tone }: { index: number; tone: MemoTone }) {
  const [x, y, r] = THOUGHT_DOTS[index];
  return (
    <Layer>
      <Circle cx={x} cy={y} r={r} fill={bodyColor(tone)} />
    </Layer>
  );
}

/** Hands rest apart at x 82/118 and meet at the centre when `clap` reaches 1 (9 units each). */
export const CLAP_TRAVEL = 9;

export function ClapHandsPart({ side, tone }: { side: 'left' | 'right'; tone: MemoTone }) {
  return (
    <Layer>
      <Circle cx={side === 'left' ? 82 : 118} cy={160} r={9} fill={handColor(tone)} />
    </Layer>
  );
}

export function ClapBurstPart() {
  return (
    <Layer>
      <Path
        testID="memo-clap-burst"
        d="M84 146 L78 140 M116 146 L122 140 M78 160 H70 M122 160 H130"
        stroke={FACE}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </Layer>
  );
}

/** The "reto" pose: stopwatch held with both hands. */
export function StopwatchPart({ tone }: { tone: MemoTone }) {
  return (
    <Layer>
      <G testID="memo-stopwatch">
        <Circle cx={100} cy={154} r={21} fill={FACE} />
        <Rect x={94} y={128} width={12} height={6} rx={2} fill={FACE} />
      </G>
      <Path d="M100 154 V142" stroke={colors.white} strokeWidth={3.5} strokeLinecap="round" />
      <G testID="memo-hands-hold">
        <Circle cx={82} cy={160} r={8} fill={bodyColor(tone)} />
        <Circle cx={118} cy={160} r={8} fill={bodyColor(tone)} />
      </G>
    </Layer>
  );
}

/** Stopwatch minute hand, its own layer so it can tick around the dial centre (100,154). */
export function StopwatchHandPart() {
  return (
    <Layer>
      <Path d="M100 154 L108 159" stroke={colors.white} strokeWidth={3.5} strokeLinecap="round" />
    </Layer>
  );
}

export function AccessoryPart({ accessory, eyeY, eyeShiftX }: { accessory: MemoAccessory; eyeY: number; eyeShiftX: number }) {
  if (accessory === 'cap') {
    return (
      <Layer>
        <G testID="memo-accessory-cap">
          <Path d="M76 44 V58 Q100 68 124 58 V44 Z" fill={FACE} />
          <Path d="M56 42 L100 24 L144 42 L100 58 Z" fill={FACE} />
          <Path d="M100 41 L134 47 V64" stroke={colors.teal} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          <Circle cx={134} cy={67} r={4} fill={colors.teal} />
        </G>
      </Layer>
    );
  }
  if (accessory === 'glasses') {
    const lx = 77 + eyeShiftX;
    const rx = 123 + eyeShiftX;
    return (
      <Layer>
        <G testID="memo-accessory-glasses">
          <Circle cx={lx} cy={eyeY} r={13} stroke={FACE} strokeWidth={3.5} fill="none" />
          <Circle cx={rx} cy={eyeY} r={13} stroke={FACE} strokeWidth={3.5} fill="none" />
          <Path d={`M${lx + 13} ${eyeY - 2} Q100 ${eyeY - 8} ${rx - 13} ${eyeY - 2}`} stroke={FACE} strokeWidth={3.5} fill="none" />
        </G>
      </Layer>
    );
  }
  return (
    <Layer>
      <G testID="memo-accessory-scarf">
        <Path d="M128 160 L136 186 L150 182 L142 158 Z" fill={colors.teal} />
        <Path d="M37 150 Q100 170 163 150 L165 162 Q100 182 35 162 Z" fill={colors.teal} />
      </G>
    </Layer>
  );
}
