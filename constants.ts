
export const CLIENT_CONFIG = {
  name: "BEAR GYM",
  // PAMIĘTAJ: Wklej tutaj URL swojego wdrożenia z Google Apps Script!
  googleAppScriptUrl: "https://script.google.com/macros/s/AKfycbxdsj6QztZZ1AIN9N2JbYJRZGn-yTNJ2LwtGi3O1_QD3tXXgbnfPdEqGNkO_lmZ-Oed8Q/exec",
  storageKey: 'bear_gym_cloud_v1'
};

export const DEFAULT_SETTINGS = {
  volume: 0.5,
  soundType: 'beep2' as const,
};

/**
 * DEFAULT_WORKOUTS jest puste w aplikacji bazowej. 
 * Plany są teraz ładowane dynamicznie z Google Sheets na podstawie kodu klienta.
 */
export const DEFAULT_WORKOUTS: Record<string, any> = {};
