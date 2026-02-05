
export const CLIENT_CONFIG = {
  name: "BEAR GYM",
  // PAMIĘTAJ: Wklej tutaj URL swojego wdrożenia z Google Apps Script!
  googleAppScriptUrl: "https://script.google.com/macros/s/AKfycbz2bM5DeepxbEAwMcMHAbJEJZ6O24OJpAuHFqp6PaEijn9N2BqdKUoUY-qJJk6E4u6i/exec",
  storageKey: 'bear_gym_cloud_v1'
};

export const DEFAULT_SETTINGS = {
  volume: 0.5,
  soundType: 'double_bell' as const,
  autoRestTimer: true,
  vibration: false
};

/**
 * DEFAULT_WORKOUTS jest puste w aplikacji bazowej. 
 * Plany są teraz ładowane dynamicznie z Google Sheets na podstawie kodu klienta.
 */
export const DEFAULT_WORKOUTS: Record<string, any> = {};
