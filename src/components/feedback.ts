// Light vibration on tap (docs/00_sistema_de_diseno.md, Sonido y vibración): selectionAsync() when
// touching a main button or an option, never while the user has reduce motion turned on (RNF-15) or turned
// "Vibración" off in Ajustes y cuenta (screen 23, app_user.vibration_enabled, RF-37).
// Both settings are cached and kept up to date so a tap never waits for them.
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Platform } from 'react-native';

let reduceMotion = false;
let vibrationEnabled = true;

/** Follows app_user.vibration_enabled; profile screens call it when the user or the setting changes. */
export function setVibrationEnabled(enabled: boolean) {
  vibrationEnabled = enabled;
}

if (Platform.OS !== 'web') {
  AccessibilityInfo.isReduceMotionEnabled()
    .then((enabled) => {
      reduceMotion = enabled;
    })
    .catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    reduceMotion = enabled;
  });
}

export function tapFeedback() {
  if (Platform.OS === 'web' || reduceMotion || !vibrationEnabled) return;
  Haptics.selectionAsync().catch(() => {
    // Devices without a vibration motor reject; the visual press state is enough.
  });
}
