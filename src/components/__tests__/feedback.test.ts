
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

type ReduceMotionListener = (enabled: boolean) => void;

function loadFeedback(reduceMotion: boolean) {
  let listener: ReduceMotionListener = () => undefined;
  let mod!: typeof import('../feedback');
  let haptics!: typeof import('expo-haptics');
  jest.isolateModules(() => {
    const { AccessibilityInfo } = require('react-native') as typeof import('react-native');
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, cb: ReduceMotionListener) => {
      listener = cb;
      return { remove: jest.fn() };
    }) as never);
    mod = require('../feedback');
    haptics = require('expo-haptics');
  });
  return {
    tapFeedback: mod.tapFeedback,
    setVibrationEnabled: mod.setVibrationEnabled,
    haptics,
    changeReduceMotion: (v: boolean) => listener(v),
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('tapFeedback (docs/00_sistema_de_diseno.md, Sonido y vibración)', () => {
  it('uses selectionAsync for a tap, not impactAsync', async () => {
    const { tapFeedback, haptics } = loadFeedback(false);
    await flush();
    tapFeedback();
    expect(haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('does not vibrate while reduce motion is on, and follows changes of the setting', async () => {
    const { tapFeedback, haptics, changeReduceMotion } = loadFeedback(true);
    await flush();
    tapFeedback();
    expect(haptics.selectionAsync).not.toHaveBeenCalled();

    changeReduceMotion(false);
    tapFeedback();
    expect(haptics.selectionAsync).toHaveBeenCalledTimes(1);

    changeReduceMotion(true);
    tapFeedback();
    expect(haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('does not vibrate while the Vibración setting is off (app_user.vibration_enabled, screen 23)', async () => {
    const { tapFeedback, setVibrationEnabled, haptics } = loadFeedback(false);
    await flush();
    setVibrationEnabled(false);
    tapFeedback();
    expect(haptics.selectionAsync).not.toHaveBeenCalled();

    setVibrationEnabled(true);
    tapFeedback();
    expect(haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  // The web no-op is not testable here: babel-preset-expo inlines Platform.OS for the jest platform.
});
