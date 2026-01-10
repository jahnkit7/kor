/**
 * Déclenche une vibration haptique légère si supportée
 * @param duration - durée en ms (défaut: 10ms pour un tap léger)
 */
export const triggerHaptic = (duration: number = 10) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(duration);
  }
};

/**
 * Patterns de vibration prédéfinis
 */
export const hapticPatterns = {
  light: 10,       // tap léger
  medium: 25,      // confirmation
  success: [10, 50, 20], // succès (pattern)
} as const;
