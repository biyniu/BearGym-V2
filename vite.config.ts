import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 1. Ładujemy zmienne z plików .env (dla środowiska lokalnego)
  const env = loadEnv(mode, process.cwd(), '');
  
  // 2. Łączymy ze zmiennymi procesu (dla Vercel/CI)
  // To kluczowe, bo Vercel trzyma sekrety w process.env podczas buildu
  const processEnv = { ...process.env, ...env };

  return {
    plugins: [react()],
    define: {
      // Definiujemy globalną zmienną process.env.API_KEY
      // Jeśli VITE_GEMINI_API_KEY nie istnieje, wstawiamy pusty string, żeby nie było błędu "undefined"
      'process.env.API_KEY': JSON.stringify(processEnv.VITE_GEMINI_API_KEY || "")
    }
  };
});