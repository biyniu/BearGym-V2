
export const CLIENT_CONFIG = {
  name: "BEAR GYM",
  // PAMIĘTAJ: Wklej tutaj URL swojego wdrożenia z Google Apps Script!
  googleAppScriptUrl: "https://script.google.com/macros/s/AKfycbz2bM5DeepxbEAwMcMHAbJEJZ6O24OJpAuHFqp6PaEijn9N2BqdKUoUY-qJJk6E4u6i/exec",
  storageKey: 'bear_gym_cloud_v1',
  // Klucz API jest teraz wstrzykiwany przez vite.config.ts jako process.env.API_KEY
  geminiApiKey: process.env.API_KEY || "",
  // Tutaj definiujemy wersję modelu. Jeśli wyjdzie nowsza (np. gemini-3.0), zmień to tutaj.
  geminiModel: "gemini-2.5-flash"
};

export const DEFAULT_SETTINGS = {
  volume: 0.5,
  soundType: 'double_bell' as const,
  autoRestTimer: true,
  // Usunięto vibration: false
  userGoal: "",
  userDifficulties: "",
  targetWorkoutsPerWeek: 3,
  targetCardioPerWeek: 3,
  userInitialWeight: "",
  userCurrentWeight: "",
  userTargetWeight: ""
};

/**
 * DEFAULT_WORKOUTS jest puste w aplikacji bazowej. 
 * Plany są teraz ładowane dynamicznie z Google Sheets na podstawie kodu klienta.
 */
export const DEFAULT_WORKOUTS: Record<string, any> = {};