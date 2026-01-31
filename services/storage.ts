
import { CLIENT_CONFIG } from '../constants';

export const remoteStorage = {
  fetchUserData: async (code: string) => {
    try {
      const cleanCode = code.trim().toUpperCase();
      const url = `${CLIENT_CONFIG.googleAppScriptUrl}?code=${encodeURIComponent(cleanCode)}`;
      const response = await fetch(url, { cache: 'no-cache' });
      return await response.json();
    } catch (e) {
      return { success: false, error: "Błąd połączenia." };
    }
  },

  // NOWE: Metody dla Panelu Trenera
  fetchCoachOverview: async (masterCode: string) => {
    try {
      const url = `${CLIENT_CONFIG.googleAppScriptUrl}?code=${encodeURIComponent(masterCode)}&type=coach_overview`;
      const response = await fetch(url, { cache: 'no-cache' });
      return await response.json();
    } catch (e) { return { success: false }; }
  },

  fetchCoachClientDetail: async (masterCode: string, clientId: string) => {
    try {
      const url = `${CLIENT_CONFIG.googleAppScriptUrl}?code=${encodeURIComponent(masterCode)}&type=coach_client_detail&client_id=${encodeURIComponent(clientId)}`;
      const response = await fetch(url, { cache: 'no-cache' });
      return await response.json();
    } catch (e) { return { success: false }; }
  },

  saveToCloud: async (code: string, type: string, data: any) => {
    try {
      await fetch(CLIENT_CONFIG.googleAppScriptUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase(), type, data })
      });
      return true;
    } catch (e) { return false; }
  },

  createClient: async (masterCode: string, newClientCode: string, name: string) => {
    try {
      const response = await fetch(CLIENT_CONFIG.googleAppScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: masterCode.toUpperCase(), 
          type: 'create_client', 
          data: { newCode: newClientCode.toUpperCase(), name } 
        })
      });
      return true;
    } catch (e) { return false; }
  }
};

export const storage = {
  getLastBackupReminder: () => Number(localStorage.getItem(`${CLIENT_CONFIG.storageKey}_last_backup`)) || 0,
  setLastBackupReminder: (val: number) => localStorage.setItem(`${CLIENT_CONFIG.storageKey}_last_backup`, val.toString()),
  getHistory: (id: string) => JSON.parse(localStorage.getItem(`${CLIENT_CONFIG.storageKey}_history_${id}`) || '[]'),
  saveHistory: (id: string, h: any[]) => localStorage.setItem(`${CLIENT_CONFIG.storageKey}_history_${id}`, JSON.stringify(h)),
  getCardioSessions: () => JSON.parse(localStorage.getItem(`${CLIENT_CONFIG.storageKey}_cardio`) || '[]'),
  saveCardioSessions: (s: any[]) => localStorage.setItem(`${CLIENT_CONFIG.storageKey}_cardio`, JSON.stringify(s)),
  getMeasurements: () => JSON.parse(localStorage.getItem(`${CLIENT_CONFIG.storageKey}_measurements`) || '[]'),
  saveMeasurements: (m: any[]) => localStorage.setItem(`${CLIENT_CONFIG.storageKey}_measurements`, JSON.stringify(m)),
  getTempInput: (id: string) => localStorage.getItem(`${CLIENT_CONFIG.storageKey}_temp_${id}`) || '',
  saveTempInput: (id: string, v: string) => localStorage.setItem(`${CLIENT_CONFIG.storageKey}_temp_${id}`, v),
  clearTempInputs: (workoutId: string, exercises: any[]) => {
    exercises.forEach(ex => {
      localStorage.removeItem(`${CLIENT_CONFIG.storageKey}_temp_note_${workoutId}_${ex.id}`);
      for(let i=1; i<=ex.sets; i++) {
        localStorage.removeItem(`${CLIENT_CONFIG.storageKey}_temp_input_${workoutId}_${ex.id}_s${i}_kg`);
        localStorage.removeItem(`${CLIENT_CONFIG.storageKey}_temp_input_${workoutId}_${ex.id}_s${i}_reps`);
        localStorage.removeItem(`${CLIENT_CONFIG.storageKey}_temp_input_${workoutId}_${ex.id}_s${i}_time`);
      }
    });
  },
  getLastResult: (wId: string, exId: string) => localStorage.getItem(`history_${wId}_${exId}`) || '',
  saveWorkouts: (w: any) => localStorage.setItem(`${CLIENT_CONFIG.storageKey}_workouts`, JSON.stringify(w))
};

export const localStorageCache = {
  save: (k: string, d: any) => localStorage.setItem(k, JSON.stringify(d)),
  get: (k: string) => {
    const d = localStorage.getItem(k);
    return d ? JSON.parse(d) : null;
  }
};
