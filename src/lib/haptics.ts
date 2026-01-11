import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Types de patterns haptic disponibles
 */
export type HapticPattern = 'light' | 'medium' | 'success' | 'warning' | 'error';

/**
 * Patterns de vibration prédéfinis
 * Pour le fallback navigator.vibrate (valeurs en ms)
 */
export const hapticPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,                    // tap léger
  medium: 25,                   // confirmation
  success: [10, 50, 20],        // succès (pattern)
  warning: [30, 50, 30],        // avertissement
  error: [50, 100, 50, 100, 50] // erreur
};

/**
 * Détecte si l'app tourne dans un contexte Capacitor natif
 */
const isNativeApp = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNativePlatform?.();
};

/**
 * Déclenche une vibration haptique
 * Utilise Capacitor Haptics sur iOS/Android natif, sinon navigator.vibrate
 * @param pattern - type de pattern: 'light' | 'medium' | 'success' | 'warning' | 'error'
 */
export const triggerHaptic = async (pattern: HapticPattern = 'light'): Promise<void> => {
  try {
    if (isNativeApp()) {
      // Utiliser l'API native Capacitor
      switch (pattern) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
      }
    } else {
      // Fallback vers navigator.vibrate pour Android web
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        const duration = hapticPatterns[pattern];
        if (Array.isArray(duration)) {
          navigator.vibrate([...duration]);
        } else {
          navigator.vibrate(duration);
        }
      }
    }
  } catch (error) {
    // Échec silencieux - le haptic n'est pas critique
    if (import.meta.env.DEV) {
      console.log('[Haptics] Non disponible:', error);
    }
  }
};

/**
 * Vibration sélection (pour pickers, sliders, etc.)
 */
export const triggerSelectionHaptic = async (): Promise<void> => {
  try {
    if (isNativeApp()) {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } else if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(5);
    }
  } catch {
    // Échec silencieux
  }
};
