
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { remoteStorage } from '../services/storage';
import { Exercise } from '../types';

export default function CoachDashboard() {
  const navigate = useNavigate();
  
  const expectedPassword = 'TRENER123';
  const accentColor = 'bg-blue-600';
  const accentBorder = 'border-blue-600';
  const accentText = 'text-blue-500';
  const authKey = 'bear_gym_coach_auth';
  const codeKey = 'bear_gym_coach_code';

  const [masterCode, setMasterCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return sessionStorage.getItem(authKey) === 'true';
  });
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'history'>('plan');
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newClient, setNewClient] = useState({ code: '', name: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchClients = async (code: string) => {
    setLoading(true);
    const res = await remoteStorage.fetchCoachOverview(code);
    if (res.success) {
      setClients(res.clients || []);
      setApiError(null);
    } else {
      setApiError(res.error || "Błąd pobierania listy klientów.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const storedMaster = sessionStorage.getItem(codeKey);
    if (isAuthorized && storedMaster) {
      setMasterCode(storedMaster);
      fetchClients(storedMaster);
    }
  }, [isAuthorized]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setApiError(null);
    
    const code = masterCode.trim().toUpperCase();
    if (!code) return;

    if (code !== expectedPassword) {
        setApiError(`Wpisane hasło (${code}) nie zgadza się z hasłem w aplikacji (${expectedPassword}).`);
        return;
    }

    setLoading(true);
    try {
      const res = await remoteStorage.fetchCoachOverview(code);
      if (res.success) {
        setClients(res.clients || []);
        setIsAuthorized(true);
        sessionStorage.setItem(authKey, 'true');
        sessionStorage.setItem(codeKey, code);
      } else {
        // Skrypt odpowiedział {success: false} - wyświetlamy dokładny powód błędu
        setApiError(`Skrypt Google odrzucił hasło: ${res.error}`);
      }
    } catch (err: any) {
      setApiError("Błąd połączenia: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.code || !newClient.name) return alert("Wypełnij oba pola");
    
    setLoading(true);
    const success = await remoteStorage.createClient(masterCode, newClient.code, newClient.name);
    if (success) {
      alert("Dodano podopiecznego!");
      setNewClient({ code: '', name: '' });
      setShowAddForm(false);
      fetchClients(masterCode);
    } else {
      alert("Błąd zapisu w Google Sheets.");
    }
    setLoading(false);
  };

  const loadClientDetail = async (clientId: string) => {
    setLoading(true);
    setApiError(null);
    const res = await remoteStorage.fetchCoachClientDetail(masterCode, clientId);
    if (res.success) {
      setSelectedClient(res);
      setEditedPlan(res.plan || {});
      setIsEditingPlan(false);
      setActiveTab('plan');
    } else {
      setApiError(res.error || "Błąd pobierania danych klienta.");
    }
    setLoading(false);
  };

  const handleSavePlanToCloud = async () => {
    if (!selectedClient || !editedPlan) return;
    setIsSaving(true);
    const success = await remoteStorage.saveToCloud(selectedClient.code, 'plan', editedPlan);
    if (success) {
      alert("Plan zapisany!");
      setIsEditingPlan(false);
      loadClientDetail(selectedClient.code);
    } else {
      alert("Błąd zapisu.");
    }
    setIsSaving(false);
  };

  const logoutAdmin = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-6 z-[2000] font-sans">
        <div className="max-w-md w-full bg-[#161616] p-10 rounded-3xl border border-gray-800 shadow-2xl text-center">
          <div className={`w-20 h-20 ${accentColor} rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl`}>
            <i className="fas fa-user-tie text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter leading-none">Bear Gym <br/> Panel Trenera</h1>
          
          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <input 
              type="password" 
              placeholder="WPISZ: TRENER123"
              value={masterCode}
              onChange={(e) => setMasterCode(e.target.value.toUpperCase())}
              className={`w-full bg-black border border-gray-700 text-white p-4 rounded-xl text-center focus:${accentBorder} outline-none font-mono tracking-[0.2em]`}
              autoFocus
            />
            {apiError && (
                <div className="bg-red-900/20 border border-red-900/50 text-red-500 p-3 rounded-lg text-[10px] font-bold">
                    <i className="fas fa-exclamation-triangle mr-2"></i> {apiError}
                </div>
            )}
            <button 
              type="submit"
              disabled={loading}
              className={`w-full ${accentColor} hover:opacity-90 text-white font-black py-4 rounded-xl transition shadow-lg flex items-center justify-center italic`}
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : "ZALOGUJ TRENERA"}
            </button>
          </form>
          <button onClick={() => navigate('/')} className="mt-8 text-[10px] text-gray-700 uppercase font-bold underline">Wróć do aplikacji</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0f0f0f] flex text-gray-300 font-sans z-[2000] overflow-hidden animate-fade-in">
      <aside className="w-80 bg-[#161616] border-r border-gray-800 flex flex-col h-full shrink-0 shadow-2xl">
        <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
          <div className={`w-10 h-10 ${accentColor} rounded flex items-center justify-center text-white font-black italic shadow-lg shrink-0`}>B</div>
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none truncate">BEAR GYM <br/><span className={`text-[10px] ${accentText} tracking-widest font-bold`}>PANEL TRENERA</span></h2>
        </div>
        
        <div className="p-4 border-b border-gray-800">
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl transition flex items-center justify-center text-xs italic uppercase shadow-lg"
            >
              <i className="fas fa-plus-circle mr-2"></i> DODAJ KLIENTA
            </button>
          ) : (
            <form onSubmit={handleCreateClient} className="space-y-3 bg-black/40 p-4 rounded-2xl border border-gray-800 animate-fade-in">
              <input 
                type="text" 
                placeholder="IMIĘ I NAZWISKO" 
                value={newClient.name} 
                onChange={e => setNewClient({...newClient, name: e.target.value.toUpperCase()})}
                className="w-full bg-black border border-gray-700 text-white p-2 rounded-lg text-[10px] font-black italic outline-none focus:border-green-600"
              />
              <input 
                type="text" 
                placeholder="UNIKALNY KOD" 
                value={newClient.code} 
                onChange={e => setNewClient({...newClient, code: e.target.value.toUpperCase()})}
                className="w-full bg-black border border-gray-700 text-white p-2 rounded-lg text-[10px] font-mono outline-none focus:border-green-600"
              />
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg text-[9px] font-black uppercase italic">DODAJ</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 bg-gray-800 text-gray-400 rounded-lg text-[9px]">X</button>
              </div>
            </form>
          )}
        </div>

        <div className="flex-grow overflow-y-auto px-4 py-4 space-y-1">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-2 mb-2 italic">Podopieczni ({clients.length})</p>
          {loading && <div className="text-center p-4"><i className="fas fa-spinner fa-spin text-blue-500"></i></div>}
          {clients.map(c => (
            <button 
              key={c.code}
              onClick={() => loadClientDetail(c.code)}
              className={`w-full text-left p-4 rounded-2xl transition flex items-center justify-between border ${selectedClient?.code === c.code ? `${accentColor}/10 ${accentBorder} text-white` : 'bg-transparent border-transparent hover:bg-gray-800 text-gray-400'}`}
            >
              <div className="overflow-hidden">
                <div className="font-black text-xs uppercase italic tracking-tighter truncate">{c.name}</div>
                <div className="text-[9px] font-mono text-gray-500">{c.code}</div>
              </div>
              <i className="fas fa-chevron-right text-[10px] opacity-30 shrink-0"></i>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-black/20">
           <button onClick={logoutAdmin} className="w-full py-2 text-[10px] text-gray-600 hover:text-red-500 font-black uppercase tracking-widest transition"><i className="fas fa-power-off mr-2"></i>Wyloguj Trenera</button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto p-10 bg-gradient-to-br from-[#0f0f0f] to-[#050505]">
        {selectedClient ? (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6 border-b border-gray-800 pb-8">
              <div>
                <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">{selectedClient.name}</h1>
                <p className={`${accentText} font-mono text-sm tracking-widest uppercase font-bold`}>KOD: {selectedClient.code}</p>
              </div>
              <div className="flex bg-[#161616] p-1.5 rounded-2xl border border-gray-800 shadow-lg shrink-0">
                <TabBtn active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} label="PLAN" icon="fa-dumbbell" color={accentColor} />
                <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="HISTORIA" icon="fa-history" color={accentColor} />
              </div>
            </div>

            {apiError && (
                <div className="bg-red-900/20 border border-red-900/50 text-red-500 p-4 rounded-2xl mb-8 flex items-center justify-between">
                    <span className="text-xs font-bold"><i className="fas fa-exclamation-circle mr-2"></i> {apiError}</span>
                </div>
            )}

            {activeTab === 'plan' && (
              <div className="space-y-8 animate-fade-in pb-20">
                <div className="flex justify-between items-center bg-[#161616] p-5 rounded-2xl border border-gray-800 shadow-xl">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest italic">Edytor Planu</p>
                  <div className="flex space-x-3">
                    {!isEditingPlan ? (
                      <button onClick={() => setIsEditingPlan(true)} className={`${accentColor} text-white px-8 py-3 rounded-xl text-xs font-black italic uppercase transition flex items-center shadow-lg hover:opacity-90`}><i className="fas fa-edit mr-2"></i> EDYTUJ TRENING</button>
                    ) : (
                      <div className="flex space-x-2">
                        <button onClick={handleSavePlanToCloud} disabled={isSaving} className="bg-green-600 text-white px-8 py-3 rounded-xl text-xs font-black italic uppercase transition flex items-center shadow-xl hover:bg-green-700">
                          {isSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-cloud-upload-alt mr-2"></i>} ZAPISZ ZMIANY
                        </button>
                        <button onClick={() => { setEditedPlan(selectedClient.plan); setIsEditingPlan(false); }} className="bg-gray-700 text-gray-400 px-5 py-3 rounded-xl text-xs font-black italic uppercase transition">ANULUJ</button>
                      </div>
                    )}
                  </div>
                </div>

                {(!editedPlan || Object.keys(editedPlan).length === 0) ? (
                    <div className="text-center py-20 bg-[#161616] rounded-3xl border border-gray-800 opacity-20 italic">
                        <i className="fas fa-clipboard-list text-6xl mb-4"></i>
                        <p className="text-sm font-black uppercase italic tracking-widest">Brak zapisanego planu.</p>
                    </div>
                ) : (
                    Object.entries(editedPlan || {}).map(([id, workout]: any) => (
                    <div key={id} className={`bg-[#161616] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl mb-8 border-l-8 ${accentBorder} transition`}>
                        <div className={`bg-gradient-to-r ${accentColor}/10 to-transparent p-8 flex justify-between items-center`}>
                           <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter truncate">{workout.title}</h3>
                        </div>
                        <div className="p-8 pt-2 overflow-x-auto">
                           <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                               <thead>
                                   <tr className="text-gray-600 uppercase text-[9px] font-black tracking-widest italic">
                                       <th className="pb-3 pl-2">#</th>
                                       <th className="pb-3 min-w-[200px]">Ćwiczenie</th>
                                       <th className="pb-3 text-center">Serie</th>
                                       <th className="pb-3 text-center">Zakres</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {workout.exercises?.map((ex: any, idx: number) => (
                                   <tr key={ex.id} className="bg-white/[0.02] border border-gray-800 rounded-lg">
                                       <td className={`py-4 pl-3 rounded-l-lg font-black ${accentText} italic text-xs`}>{idx + 1}</td>
                                       <td className="py-4">
                                           <div className="font-black text-white italic uppercase tracking-tighter text-sm">{ex.name}</div>
                                           <div className="text-[10px] text-gray-600 italic uppercase font-bold">{ex.pl}</div>
                                       </td>
                                       <td className="py-4 text-center font-black text-white italic">{ex.sets}</td>
                                       <td className="py-4 text-center font-mono text-green-500 font-bold">{ex.reps}</td>
                                   </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                    </div>
                    ))
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="pt-20 text-center animate-fade-in">
                <div className="bg-[#161616] rounded-3xl p-20 border border-gray-800 shadow-2xl inline-block max-w-lg w-full">
                    <i className={`fas fa-history text-6xl mb-6 ${accentText} opacity-20`}></i>
                    <p className="font-black uppercase tracking-widest text-gray-600 italic">Historia w Google Sheets</p>
                    <p className="text-[10px] text-gray-700 mt-4 uppercase italic">Logi treningowe są zapisywane w Kolumnie D arkusza 'Klienci'.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10 animate-fade-in">
            <i className="fas fa-user-tie text-9xl mb-10 text-blue-500"></i>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">Panel Trenera</h2>
            <p className="text-sm font-bold mt-4 uppercase tracking-widest italic">Wybierz klienta z listy po lewej</p>
          </div>
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon, color }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-[10px] font-black transition flex items-center space-x-2 whitespace-nowrap ${active ? `${color} text-white shadow-xl` : 'text-gray-500 hover:text-gray-300'}`}
    >
      <i className={`fas ${icon}`}></i>
      <span className="uppercase tracking-tighter italic">{label}</span>
    </button>
  );
}
