
export const CLIENT_CONFIG = {
  name: "BEAR GYM",
  // PAMIĘTAJ: Wklej tutaj URL swojego wdrożenia z Google Apps Script!
  googleAppScriptUrl: "https://script.google.com/macros/s/AKfycbyCq11Ca7LyiHlJqNe_VG464s2Vh0r2Tyhcoxg4mq8CVE93Khx2OAB5zZbU6dkNlj12fw/exec",
  storageKey: 'bear_gym_cloud_v1'
};

export const DEFAULT_SETTINGS = {
  volume: 0.5,
  soundType: 'double_bell' as const,
  autoRestTimer: true
};

/**
 * DEFAULT_WORKOUTS jest puste w aplikacji bazowej. 
 * Plany są teraz ładowane dynamicznie z Google Sheets na podstawie kodu klienta.
 */
export const DEFAULT_WORKOUTS: Record<string, any> = {};
