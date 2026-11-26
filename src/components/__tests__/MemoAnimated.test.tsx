import { act, configure, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { processColor } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import {
  AnimatedMemo,
  MEMO_ACCESSORIES,
  MEMO_REACTIONS,
  REACTION_DURATION_MS,
  type AnimatedMemoHandle,
  type MemoReaction,
} from '../Memo';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    useReducedMotion: jest.fn(() => false),
    withRepeat: jest.fn(actual.withRepeat),
  };
});

const mocked = Reanimated as jest.Mocked<typeof Reanimated>;

// Memo is decorative by default (hidden from screen readers), so part queries include hidden elements.
configure({ defaultIncludeHiddenElements: true });

// Advancing fake time runs every animation frame of the rig, which is slow on loaded machines.
jest.setTimeout(30000);

beforeEach(() => {
  jest.useFakeTimers();
  mocked.useReducedMotion.mockReturnValue(false);
  mocked.withRepeat.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Parts every reaction must draw, by testID. */
const PARTS: Record<MemoReaction, string[]> = {
  idle: ['memo-body', 'memo-eyes-open', 'memo-mouth-smile'],
  happy: ['memo-body', 'memo-eyes-happy', 'memo-mouth-open', 'memo-arm-left', 'memo-arm-right'],
  celebrate: ['memo-eyes-happy', 'memo-mouth-open', 'memo-arm-left', 'memo-arm-right', 'memo-sparkles'],
  clap: ['memo-eyes-happy', 'memo-mouth-open', 'memo-hands-clap', 'memo-clap-burst'],
  levelUp: ['memo-eyes-star', 'memo-mouth-open', 'memo-arm-left', 'memo-arm-right', 'memo-sparkles', 'memo-level-arrow'],
  sad: ['memo-eyes-sad', 'memo-brows-sad', 'memo-mouth-frown', 'memo-tears'],
  thinking: ['memo-eyes-look', 'memo-mouth-dot', 'memo-arm-right', 'memo-thought-dots'],
  challenge: ['memo-eyes-open', 'memo-brows-focus', 'memo-stopwatch', 'memo-hands-hold'],
  sleep: ['memo-eyes-closed', 'memo-mouth-o', 'memo-zzz'],
  wave: ['memo-eyes-open', 'memo-mouth-smile', 'memo-arm-right'],
};

describe('AnimatedMemo', () => {
  it('exposes the ten reactions and three accessories', () => {
    expect([...MEMO_REACTIONS].sort()).toEqual(Object.keys(PARTS).sort());
    expect([...MEMO_ACCESSORIES].sort()).toEqual(['cap', 'glasses', 'scarf']);
  });

  it.each(MEMO_REACTIONS)('draws the parts of the %s reaction as its mood', async (reaction) => {
    await render(<AnimatedMemo mood={reaction} />);
    expect(screen.getByTestId(`memo-reaction-${reaction}`)).toBeTruthy();
    for (const part of PARTS[reaction]) expect(screen.getByTestId(part)).toBeTruthy();
  });

  it('play() runs a one-shot reaction and then returns to idle', async () => {
    const ref = createRef<AnimatedMemoHandle>();
    const onReactionEnd = jest.fn();
    await render(<AnimatedMemo ref={ref} onReactionEnd={onReactionEnd} />);
    expect(screen.getByTestId('memo-reaction-idle')).toBeTruthy();

    await act(async () => ref.current!.play('celebrate'));
    expect(screen.getByTestId('memo-reaction-celebrate')).toBeTruthy();
    expect(screen.getByTestId('memo-sparkles')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(REACTION_DURATION_MS.celebrate + 50);
    });
    expect(screen.getByTestId('memo-reaction-idle')).toBeTruthy();
    expect(screen.queryByTestId('memo-sparkles')).toBeNull();
    expect(onReactionEnd).toHaveBeenCalledWith('celebrate');
  });

  it('play() returns to the given mood, not always idle', async () => {
    const ref = createRef<AnimatedMemoHandle>();
    await render(<AnimatedMemo ref={ref} mood="sleep" />);
    await act(async () => ref.current!.play('wave'));
    expect(screen.getByTestId('memo-reaction-wave')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(REACTION_DURATION_MS.wave + 50);
    });
    expect(screen.getByTestId('memo-reaction-sleep')).toBeTruthy();
  });

  it('animates idle with loops when motion is allowed', async () => {
    await render(<AnimatedMemo />);
    expect(screen.getByTestId('memo-stage-animated')).toBeTruthy();
    expect(mocked.withRepeat).toHaveBeenCalled();
  });

  it('with reduce motion shows the static pose and starts no loops', async () => {
    mocked.useReducedMotion.mockReturnValue(true);
    const ref = createRef<AnimatedMemoHandle>();
    await render(<AnimatedMemo ref={ref} mood="sleep" />);
    expect(screen.getByTestId('memo-stage-static')).toBeTruthy();
    expect(screen.getByTestId('memo-zzz')).toBeTruthy();

    await act(async () => ref.current!.play('sad'));
    expect(screen.getByTestId('memo-reaction-sad')).toBeTruthy();
    expect(screen.getByTestId('memo-tears')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(REACTION_DURATION_MS.sad + 50);
    });
    expect(screen.getByTestId('memo-reaction-sleep')).toBeTruthy();
    expect(mocked.withRepeat).not.toHaveBeenCalled();
  });

  it.each([
    ['cap', 'memo-accessory-cap'],
    ['glasses', 'memo-accessory-glasses'],
    ['scarf', 'memo-accessory-scarf'],
  ] as const)('wears the %s accessory', async (accessory, testID) => {
    await render(<AnimatedMemo accessory={accessory} />);
    expect(screen.getByTestId(testID)).toBeTruthy();
  });

  it('wears no accessory by default', async () => {
    await render(<AnimatedMemo />);
    expect(screen.queryByTestId(/^memo-accessory-/)).toBeNull();
  });

  it('uses a white body on amber surfaces and amber otherwise', async () => {
    await render(<AnimatedMemo tone="white" />);
    expect(screen.getByTestId('memo-body').props.fill).toEqual({ type: 0, payload: processColor('#FFFFFF') });
    await render(<AnimatedMemo />);
    expect(screen.getByTestId('memo-body').props.fill).toEqual({ type: 0, payload: processColor('#F2A93B') });
  });

  it('is decorative by default: hidden from screen readers', async () => {
    await render(<AnimatedMemo />);
    expect(screen.queryByRole('image')).toBeNull();
    const root = screen.getByTestId('animated-memo');
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('is an image with its label when one is given', async () => {
    await render(<AnimatedMemo accessibilityLabel="Memo celebrando" />);
    expect(screen.getByRole('image', { name: 'Memo celebrando' })).toBeTruthy();
  });
});
