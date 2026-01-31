
export const CLIENT_CONFIG = {
  name: "BEAR GYM",
  // PAMIĘTAJ: Wklej tutaj URL swojego wdrożenia z Google Apps Script!
  googleAppScriptUrl: "https://script.google.com/macros/s/AKfycbwyPCjDAsPBeKLXNSkULF5G1Z4php3wx-XaQSz-uIOJWFLhtSIR5kHk76FgS0zcywKoKg/exec",
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
