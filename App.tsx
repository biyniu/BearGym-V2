
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ActiveWorkout from './components/ActiveWorkout';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import ProgressView from './components/ProgressView';
import MeasurementsView from './components/MeasurementsView';
import CardioView from './components/CardioView';
import AuthView from './components/AuthView';
import CoachDashboard from './components/CoachDashboard';
import InstallPrompt from './components/InstallPrompt';
import { localStorageCache, remoteStorage, storage } from './services/storage';
import { WorkoutsMap, AppSettings } from './types';

interface AppContextType {
  clientCode: string | null;
  clientName: string;
  workouts: WorkoutsMap;
  settings: AppSettings;
  updateSettings: (s: AppSettings) => void;
  updateWorkouts: (w: WorkoutsMap) => void;
  logo: string;
  updateLogo: (s: string) => void;
  playAlarm: () => void;
  syncData: (type: 'history' | 'extras' | 'plan', data: any) => void;
}

export const AppContext = React.createContext<AppContextType>({} as AppContextType);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { logo, clientCode } = useContext(AppContext);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative bg-[#121212] text-[#e0e0e0] font-sans">
      <header className="p-4 flex justify-between items-center border-b border-gray-700 bg-neutral-900 sticky top-0 z-40 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-red-600 bg-gray-800 shrink-0 shadow-lg">
             <img 
               src={logo || 'https://lh3.googleusercontent.com/u/0/d/1GZ-QR4EyK6Ho9czlpTocORhwiHW4FGnP'} 
               alt="Logo" 
               className="w-full h-full object-cover"
               onError={(e) => { (e.target as HTMLImageElement).src='https://lh3.googleusercontent.com/u/0/d/1GZ-QR4EyK6Ho9czlpTocORhwiHW4FGnP'; }} 
             />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-lg font-black text-white tracking-tight leading-none truncate uppercase">BEAR GYM</h1>
            <span className="text-[10px] text-red-500 font-bold tracking-widest uppercase block truncate">ID: {clientCode}</span>
          </div>
        </div>
        {!isHome && (
          <button 
            onClick={() => navigate('/')} 
            className="text-gray-300 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-600 flex items-center text-xs font-bold"
          >
            <i className="fas fa-arrow-left mr-1"></i> WRÓĆ
          </button>
        )}
      </header>

      <div className="p-3 space-y-4 flex-grow pb-24">
        {children}
      </div>
      
      <InstallPrompt />

      {isHome && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-slow">
           <button 
            onClick={() => navigate('/settings')} 
            className="bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl transition transform hover:scale-110 active:scale-90"
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Komponent zarządzający dostępem (Route Guard).
 * Decyduje czy wyświetlić AuthView czy główny interfejs klienta.
 */
const ClientRouteGuard: React.FC<{ 
  children: React.ReactNode, 
  clientCode: string | null, 
  syncError: string | null, 
  isReady: boolean, 
  handleLogin: (code: string, userData: any) => void 
}> = ({ children, clientCode, syncError, isReady, handleLogin }) => {
  const location = useLocation();
  const isCoachRoute = location.pathname === '/coach-admin';

  // Panel trenera jest zawsze dostępny bezpośrednio
  if (isCoachRoute) return <>{children}</>;

  // Dla tras klienta sprawdzamy auth
  if (!clientCode) return <AuthView onLogin={handleLogin} />;
  if (syncError) return <div className="p-10 text-center text-red-500">{syncError}</div>;
  if (!isReady) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center">
      <i className="fas fa-spinner fa-spin text-red-600 text-4xl"></i>
    </div>
  );

  return <Layout>{children}</Layout>;
};

export default function App() {
  const [clientCode, setClientCode] = useState<string | null>(localStorage.getItem('bear_gym_client_code'));
  const [clientName, setClientName] = useState<string>(localStorage.getItem('bear_gym_client_name') || '');
  const [workouts, setWorkouts] = useState<WorkoutsMap>({});
  const [settings, setSettings] = useState<AppSettings>(localStorageCache.get('app_settings') || { volume: 0.5, soundType: 'beep2' });
  const [logo, setLogo] = useState<string>(localStorage.getItem('app_logo') || 'https://lh3.googleusercontent.com/u/0/d/1GZ-QR4EyK6Ho9czlpTocORhwiHW4FGnP');
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const initData = useCallback(async (code: string) => {
    setSyncError(null);
    try {
      const result = await remoteStorage.fetchUserData(code);
      if (result.success) {
        setWorkouts(result.plan || {});
        if (result.name) {
          setClientName(result.name);
          localStorage.setItem('bear_gym_client_name', result.name);
        }
        if (result.history) {
          Object.entries(result.history).forEach(([id, h]) => {
            storage.saveHistory(id, h as any[]);
          });
        }
        if (result.extras) {
          storage.saveMeasurements(result.extras.measurements || []);
          storage.saveCardioSessions(result.extras.cardio || []);
        }
        setIsReady(true);
      } else {
        if (result.error?.includes("Nie znaleziono") || result.error?.includes("Nieprawidłowy")) {
            setClientCode(null);
            localStorage.removeItem('bear_gym_client_code');
        } else {
            setSyncError(result.error);
        }
      }
    } catch (e) {
      setSyncError("Błąd ładowania danych.");
    }
  }, []);

  useEffect(() => {
    if (clientCode) initData(clientCode);
  }, [clientCode, initData]);

  const handleLogin = (code: string, userData: any) => {
    localStorage.setItem('bear_gym_client_code', code);
    setClientCode(code);
    if (userData.name) {
      setClientName(userData.name);
      localStorage.setItem('bear_gym_client_name', userData.name);
    }
    setWorkouts(userData.plan || {});
    setIsReady(true);
  };

  const syncData = async (type: 'history' | 'extras' | 'plan', data: any) => {
    if (clientCode) {
      let payload = data;
      if (type === 'history') {
        const allHistory: Record<string, any[]> = {};
        Object.keys(workouts).forEach(wId => {
          allHistory[wId] = storage.getHistory(wId);
        });
        payload = allHistory;
      }
      await remoteStorage.saveToCloud(clientCode, type, payload);
    }
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorageCache.save('app_settings', newSettings);
  };

  const updateWorkouts = (newWorkouts: WorkoutsMap) => {
    setWorkouts(newWorkouts);
    syncData('plan', newWorkouts);
  };

  const updateLogo = (newLogo: string) => {
    setLogo(newLogo);
    localStorage.setItem('app_logo', newLogo);
  };

  const playAlarm = useCallback(() => {
    const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!CtxClass) return;
    let ctx = audioCtx || new CtxClass();
    if (!audioCtx) setAudioCtx(ctx);
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.start();
    osc.stop(now + 0.5);
    gain.gain.setValueAtTime(settings.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
  }, [audioCtx, settings]);

  return (
    <AppContext.Provider value={{ clientCode, clientName, workouts, settings, updateSettings, updateWorkouts, logo, updateLogo, playAlarm, syncData }}>
      <HashRouter>
        <ClientRouteGuard 
          clientCode={clientCode} 
          syncError={syncError} 
          isReady={isReady} 
          handleLogin={handleLogin}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout/:id" element={<ActiveWorkout />} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/progress" element={<ProgressView />} />
            <Route path="/measurements" element={<MeasurementsView />} />
            <Route path="/cardio" element={<CardioView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/coach-admin" element={<CoachDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClientRouteGuard>
      </HashRouter>
    </AppContext.Provider>
  );
}
