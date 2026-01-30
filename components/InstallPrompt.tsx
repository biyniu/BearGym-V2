import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { logo } = useContext(AppContext);

  useEffect(() => {
    // 1. Sprawdź czy aplikacja już jest zainstalowana (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // 2. Wykryj iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Jeśli to iOS, pokaż instrukcję po chwili (jeśli nie w trybie standalone)
    if (isIosDevice) {
        // Pokaż tylko jeśli nie zamknięto wcześniej w tej sesji
        if (!sessionStorage.getItem('installPromptDismissed')) {
            setTimeout(() => setShowPrompt(true), 2000);
        }
    }

    // 4. Obsługa Android/Desktop (beforeinstallprompt)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('installPromptDismissed')) {
          setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-fade-in">
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl p-4 max-w-md mx-auto relative">
        <button 
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-gray-500 hover:text-white p-2"
        >
            <i className="fas fa-times"></i>
        </button>

        <div className="flex items-start space-x-4 pr-6">
            <div className="w-12 h-12 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
                <h3 className="font-bold text-white text-sm mb-1">Zainstaluj aplikację</h3>
                
                {isIOS ? (
                    <div className="text-gray-400 text-xs leading-relaxed">
                        Aby zainstalować <strong>Bear Gym</strong> na iPhone:<br/>
                        1. Kliknij przycisk <span className="text-blue-400 font-bold">Udostępnij</span> <i className="fas fa-share-from-square mx-1"></i><br/>
                        2. Wybierz <span className="text-white font-bold">Do ekranu początkowego</span> <i className="fas fa-plus-square mx-1"></i>
                    </div>
                ) : (
                    <div className="text-gray-400 text-xs mb-3">
                        Dodaj aplikację do ekranu głównego, aby mieć szybszy dostęp i tryb pełnoekranowy.
                    </div>
                )}

                {!isIOS && (
                    <button 
                        onClick={handleInstallClick}
                        className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-bold transition w-full"
                    >
                        ZAINSTALUJ
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}