
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { remoteStorage } from '../services/storage';
import { Exercise, ExerciseType, WorkoutPlan } from '../types';

export default function CoachDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.toLowerCase();
  
  // Dokładne rozpoznanie ścieżki
  const isMasterAdmin = path === '/admin';
  const isCoachAdmin = path === '/coach-admin';
  
  const expectedPassword = isMasterAdmin ? 'ADMIN123' : 'TRENER123';
  const panelTitle = isMasterAdmin ? 'Master Admin' : 'Coach Admin';
  const accentColor = isMasterAdmin ? 'bg-red-600' : 'bg-blue-600';
  const accentBorder = isMasterAdmin ? 'border-red-600' : 'border-blue-600';
  const accentText = isMasterAdmin ? 'text-red-500' : 'text-blue-500';

  const [masterCode, setMasterCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    const authKey = isMasterAdmin ? 'bear_gym_admin_auth' : 'bear_gym_coach_auth';
    return sessionStorage.getItem(authKey) === 'true';
  });
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'add_client'>('plan');
  
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newClient, setNewClient] = useState({ code: '', name: '' });

  useEffect(() => {
    if (isAuthorized) {
      const codeKey = isMasterAdmin ? 'bear_gym_admin_code' : 'bear_gym_coach_code';
      const storedMaster = sessionStorage.getItem(codeKey);
      if (storedMaster) {
        setMasterCode(storedMaster);
        handleLogin(storedMaster);
      }
    }
  }, [isMasterAdmin, isCoachAdmin]);

  const handleLogin = async (codeToUse?: string) => {
    const code = codeToUse || masterCode;
    if (!code) return;

    // Walidacja lokalna hasła
    if (!codeToUse && code !== expectedPassword) {
        alert(`Błędne hasło dla panelu ${panelTitle}.`);
        return;
    }

    setLoading(true);
    const res = await remoteStorage.fetchCoachOverview(code);
    if (res.success) {
      setClients(res.clients);
      setIsAuthorized(true);
      
      const authKey = isMasterAdmin ? 'bear_gym_admin_auth' : 'bear_gym_coach_auth';
      const codeKey = isMasterAdmin ? 'bear_gym_admin_code' : 'bear_gym_coach_code';
      
      sessionStorage.setItem(authKey, 'true');
      sessionStorage.setItem(codeKey, code);
    } else {
      if (!codeToUse) alert("Błąd API: Nieprawidłowy kod w Google Sheets lub błąd połączenia.");
      setIsAuthorized(false);
      sessionStorage.removeItem(isMasterAdmin ? 'bear_gym_admin_auth' : 'bear_gym_coach_auth');
    }
    setLoading(false);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.code || !newClient.name) return alert("Wypełnij wszystkie pola");
    
    setLoading(true);
    const success = await remoteStorage.createClient(masterCode, newClient.code, newClient.name);
    if (success) {
      alert("Dodano podopiecznego! Dane zostaną odświeżone.");
      setNewClient({ code: '', name: '' });
      const res = await remoteStorage.fetchCoachOverview(masterCode);
      if (res.success) setClients(res.clients);
      setActiveTab('plan');
    } else {
      alert("Błąd podczas tworzenia klienta.");
    }
    setLoading(false);
  };

  const loadClientDetail = async (clientId: string) => {
    setLoading(true);
    const res = await remoteStorage.fetchCoachClientDetail(masterCode, clientId);
    if (res.success) {
      setSelectedClient(res);
      setEditedPlan(res.plan || {});
      setIsEditingPlan(false);
      setActiveTab('plan');
    }
    setLoading(false);
  };

  const handleSavePlanToCloud = async () => {
    if (!selectedClient || !editedPlan) return;
    setIsSaving(true);
    const success = await remoteStorage.saveToCloud(selectedClient.code, 'plan', editedPlan);
    if (success) {
      alert("Plan został zapisany!");
      setIsEditingPlan(false);
      loadClientDetail(selectedClient.code);
    } else {
      alert("Błąd zapisu planu.");
    }
    setIsSaving(false);
  };

  const updateExerciseField = (workoutId: string, exIdx: number, field: keyof Exercise, value: any) => {
    const newPlan = { ...editedPlan };
    newPlan[workoutId].exercises[exIdx] = { ...newPlan[workoutId].exercises[exIdx], [field]: value };
    setEditedPlan(newPlan);
  };

  const addExercise = (workoutId: string) => {
    const newPlan = { ...editedPlan };
    const newEx: Exercise = {
      id: `ex_${Date.now()}`,
      name: "Nowe ćwiczenie",
      pl: "Parametry...",
      sets: 3,
      reps: "10-12",
      tempo: "2011",
      rir: "1-2",
      rest: 90,
      link: "",
      type: "standard"
    };
    newPlan[workoutId].exercises.push(newEx);
    setEditedPlan(newPlan);
  };

  const addWorkoutDay = () => {
    const title = window.prompt("Nazwa dnia (np. PUSH A):");
    if (!title) return;
    const id = title.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newPlan = { ...editedPlan };
    newPlan[id] = { title, warmup: [], exercises: [] };
    setEditedPlan(newPlan);
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem(isMasterAdmin ? 'bear_gym_admin_auth' : 'bear_gym_coach_auth');
    sessionStorage.removeItem(isMasterAdmin ? 'bear_gym_admin_code' : 'bear_gym_coach_code');
    window.location.reload();
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-6 font-sans z-[2000]">
        <div className="max-w-md w-full bg-[#161616] p-10 rounded-3xl border border-gray-800 shadow-2xl text-center">
          <div className={`w-20 h-20 ${accentColor} rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl`}>
            <i className={`fas ${isMasterAdmin ? 'fa-user-shield' : 'fa-user-tie'} text-3xl text-white`}></i>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter leading-none">Bear Gym <br/> {panelTitle}</h1>
          <p className="text-gray-500 text-[10px] mb-8 uppercase tracking-widest font-bold">Wprowadź hasło panelu</p>
          <input 
            type="password" 
            placeholder="HASŁO"
            value={masterCode}
            onChange={(e) => setMasterCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className={`w-full bg-black border border-gray-700 text-white p-4 rounded-xl text-center mb-4 focus:${accentBorder} outline-none font-mono tracking-[0.5em] placeholder:tracking-normal placeholder:font-sans`}
          />
          <button 
            onClick={() => handleLogin()}
            className={`w-full ${accentColor} hover:opacity-90 text-white font-black py-4 rounded-xl transition shadow-lg flex items-center justify-center italic tracking-tighter`}
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : `ZALOGUJ JAKO ${isMasterAdmin ? 'ADMIN' : 'TRENER'}`}
          </button>
          <button onClick={() => navigate('/')} className="mt-6 text-[10px] text-gray-700 uppercase font-bold hover:text-gray-400 transition underline">Powrót do aplikacji klienta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0f0f0f] flex text-gray-300 font-sans z-[2000] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-[#161616] border-r border-gray-800 flex flex-col h-full shrink-0 shadow-2xl">
        <div className={`p-6 border-b border-gray-800 flex items-center space-x-3 ${isMasterAdmin ? 'bg-red-600/5' : 'bg-blue-600/5'}`}>
          <div className={`w-10 h-10 ${accentColor} rounded flex items-center justify-center text-white font-black italic shadow-lg shrink-0`}>B</div>
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none truncate">BEAR GYM <br/><span className={`text-[10px] ${accentText} tracking-widest font-bold`}>{panelTitle.toUpperCase()}</span></h2>
        </div>
        
        <div className="p-4">
           <button 
             onClick={() => { setSelectedClient(null); setActiveTab('add_client'); }}
             className={`w-full ${isMasterAdmin ? 'bg-green-600' : 'bg-blue-600'} text-white font-black py-3 rounded-xl transition mb-4 flex items-center justify-center text-xs italic uppercase tracking-tighter shadow-lg`}
           >
             <i className="fas fa-plus-circle mr-2"></i> Nowy Podopieczny
           </button>
        </div>

        <div className="flex-grow overflow-y-auto px-4 pb-4 space-y-1">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-2 mb-2 italic">Podopieczni ({clients.length})</p>
          {clients.map(c => (
            <button 
              key={c.code}
              onClick={() => loadClientDetail(c.code)}
              className={`w-full text-left p-4 rounded-2xl transition flex items-center justify-between border ${selectedClient?.code === c.code ? `${isMasterAdmin ? 'bg-red-600/10 border-red-600' : 'bg-blue-600/10 border-blue-600'} text-white` : 'bg-transparent border-transparent hover:bg-gray-800 text-gray-400'}`}
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
           <button onClick={logoutAdmin} className="w-full py-2 text-[10px] text-gray-600 hover:text-red-500 font-black uppercase tracking-widest transition"><i className="fas fa-power-off mr-2"></i>Wyloguj Panel</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto p-10 bg-gradient-to-br from-[#0f0f0f] to-[#050505]">
        {activeTab === 'add_client' ? (
          <div className="max-w-xl mx-auto animate-fade-in pt-10">
             <div className="bg-[#161616] p-10 rounded-3xl border border-gray-800 shadow-2xl">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8 border-b border-gray-800 pb-4 flex items-center">
                    <i className={`fas fa-user-plus ${accentText} mr-4`}></i> Rejestracja Podopiecznego
                </h3>
                <form onSubmit={handleCreateClient} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block italic">Imię i Nazwisko</label>
                        <input type="text" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value.toUpperCase()})} className={`w-full bg-black border border-gray-700 text-white p-4 rounded-xl focus:${accentBorder} outline-none font-black uppercase italic`} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block italic">KOD DO LOGOWANIA</label>
                        <input type="text" value={newClient.code} onChange={(e) => setNewClient({...newClient, code: e.target.value.toUpperCase()})} className={`w-full bg-black border border-gray-700 text-white p-4 rounded-xl focus:${accentBorder} outline-none font-mono uppercase`} />
                    </div>
                    <button type="submit" className={`w-full ${accentColor} text-white font-black py-4 rounded-xl transition shadow-xl uppercase italic tracking-tighter text-lg`}>
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : "DODAJ DO BAZY"}
                    </button>
                </form>
             </div>
          </div>
        ) : selectedClient ? (
          <div className="max-w-6xl mx-auto animate-fade-in">
            {/* Client Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6 border-b border-gray-800 pb-8">
              <div>
                <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">{selectedClient.name}</h1>
                <p className={`${accentText} font-mono text-sm tracking-widest uppercase font-bold`}>ID: {selectedClient.code}</p>
              </div>
              <div className="flex bg-[#161616] p-1.5 rounded-2xl border border-gray-800 shadow-lg shrink-0">
                <TabBtn active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} label="PLAN" icon="fa-dumbbell" color={accentColor} />
                <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="HISTORIA" icon="fa-history" color={accentColor} />
              </div>
            </div>

            {/* TAB: Plan Editor */}
            {activeTab === 'plan' && (
              <div className="space-y-8 animate-fade-in pb-20">
                <div className="flex justify-between items-center bg-[#161616] p-5 rounded-2xl border border-gray-800 shadow-xl">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest italic">Edytor Treningowy</p>
                  <div className="flex space-x-3">
                    {!isEditingPlan ? (
                      <button onClick={() => setIsEditingPlan(true)} className={`${accentColor} text-white px-8 py-3 rounded-xl text-xs font-black italic uppercase transition flex items-center shadow-lg`}><i className="fas fa-edit mr-2"></i> EDYTUJ TRENING</button>
                    ) : (
                      <>
                        <button onClick={addWorkoutDay} className="bg-gray-800 text-white px-5 py-3 rounded-xl text-xs font-black italic uppercase transition flex items-center"><i className={`fas fa-calendar-plus mr-2 ${accentText}`}></i> NOWY DZIEŃ</button>
                        <button onClick={handleSavePlanToCloud} disabled={isSaving} className="bg-green-600 text-white px-8 py-3 rounded-xl text-xs font-black italic uppercase transition flex items-center shadow-xl">{isSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-cloud-upload-alt mr-2"></i>} ZAPISZ ZMIANY</button>
                        <button onClick={() => { setEditedPlan(selectedClient.plan); setIsEditingPlan(false); }} className="bg-gray-700 text-gray-400 px-5 py-3 rounded-xl text-xs font-black italic uppercase transition">ANULUJ</button>
                      </>
                    )}
                  </div>
                </div>

                {(!editedPlan || Object.keys(editedPlan).length === 0) && !isEditingPlan ? (
                    <div className="text-center py-20 bg-[#161616] rounded-3xl border border-gray-800 opacity-30 italic">
                        <i className="fas fa-clipboard-list text-6xl mb-4"></i>
                        <p className="text-sm font-black uppercase italic tracking-widest">Brak planu dla tego podopiecznego.</p>
                    </div>
                ) : (
                    Object.entries(editedPlan || {}).map(([id, workout]: any) => (
                    <div key={id} className={`bg-[#161616] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl mb-8 border-l-8 ${isMasterAdmin ? 'border-l-red-600' : 'border-l-blue-600'} transition`}>
                        <div className={`bg-gradient-to-r ${isMasterAdmin ? 'from-red-600/10' : 'from-blue-600/10'} to-transparent p-8 flex justify-between items-center`}>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter truncate pr-4">{workout.title}</h3>
                        {isEditingPlan && (
                            <button onClick={() => addExercise(id)} className={`bg-white/5 ${accentText} px-5 py-2 rounded-xl text-[10px] font-black italic uppercase transition`}><i className="fas fa-plus mr-1.5"></i> DODAJ ĆWICZENIE</button>
                        )}
                        </div>
                        <div className="p-8 pt-2 overflow-x-auto">
                            <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-gray-600 uppercase text-[9px] font-black tracking-widest italic">
                                        <th className="pb-3 pl-2">#</th>
                                        <th className="pb-3 min-w-[200px]">Ćwiczenie</th>
                                        <th className="pb-3 text-center">Serie</th>
                                        <th className="pb-3 text-center">Reps</th>
                                        <th className="pb-3 text-center">Tempo</th>
                                        <th className="pb-3 text-center">RIR</th>
                                        <th className="pb-3 text-center">Rest</th>
                                        {isEditingPlan && <th className="pb-3 text-right pr-2">Opcje</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {workout.exercises?.map((ex: any, idx: number) => (
                                    <tr key={ex.id} className="bg-white/[0.02] border border-gray-800 rounded-lg">
                                        <td className={`py-4 pl-3 rounded-l-lg font-black ${accentText} italic text-xs w-8`}>{idx + 1}</td>
                                        <td className="py-4">
                                            {isEditingPlan ? (
                                                <div className="space-y-1 pr-4">
                                                    <input value={ex.name} onChange={(e) => updateExerciseField(id, idx, 'name', e.target.value)} className="bg-black border border-gray-800 text-white p-2 rounded-lg text-xs w-full uppercase italic" />
                                                    <input value={ex.pl} onChange={(e) => updateExerciseField(id, idx, 'pl', e.target.value)} className="bg-black border border-gray-800 text-gray-600 p-2 rounded-lg text-[9px] w-full italic" />
                                                </div>
                                            ) : (
                                                <div className="pr-4">
                                                    <div className="font-black text-white italic uppercase tracking-tighter text-sm truncate">{ex.name}</div>
                                                    <div className="text-[10px] text-gray-600 italic uppercase font-bold tracking-tight truncate">{ex.pl}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 text-center">
                                            {isEditingPlan ? <input type="number" value={ex.sets} onChange={(e) => updateExerciseField(id, idx, 'sets', parseInt(e.target.value))} className="bg-black border border-gray-800 text-white p-2 rounded-lg text-xs w-12 text-center" /> : <span className="font-black text-white italic">{ex.sets}</span>}
                                        </td>
                                        <td className="py-4 text-center">
                                            {isEditingPlan ? <input value={ex.reps} onChange={(e) => updateExerciseField(id, idx, 'reps', e.target.value)} className="bg-black border border-gray-800 text-green-500 p-2 rounded-lg text-xs w-16 text-center" /> : <span className="font-mono text-green-500 font-bold">{ex.reps}</span>}
                                        </td>
                                        <td className="py-4 text-center">
                                            {isEditingPlan ? <input value={ex.tempo} onChange={(e) => updateExerciseField(id, idx, 'tempo', e.target.value)} className="bg-black border border-gray-800 text-red-500 p-2 rounded-lg text-xs w-16 text-center" /> : <span className="font-mono text-red-500 font-bold">{ex.tempo}</span>}
                                        </td>
                                        <td className="py-4 text-center">
                                            {isEditingPlan ? <input value={ex.rir} onChange={(e) => updateExerciseField(id, idx, 'rir', e.target.value)} className="bg-black border border-gray-800 text-yellow-500 p-2 rounded-lg text-xs w-12 text-center" /> : <span className="font-mono text-yellow-500 font-bold">{ex.rir}</span>}
                                        </td>
                                        <td className="py-4 text-center">
                                            {isEditingPlan ? <input type="number" value={ex.rest} onChange={(e) => updateExerciseField(id, idx, 'rest', parseInt(e.target.value))} className="bg-black border border-gray-800 text-gray-400 p-2 rounded-lg text-xs w-16 text-center" /> : <span className="font-mono text-gray-500">{ex.rest}s</span>}
                                        </td>
                                        {isEditingPlan && (
                                            <td className="py-4 text-right pr-3 rounded-r-lg">
                                                <button onClick={() => { const newPlan = { ...editedPlan }; newPlan[id].exercises.splice(idx, 1); setEditedPlan(newPlan); }} className="text-red-900 hover:text-red-500"><i className="fas fa-times"></i></button>
                                            </td>
                                        )}
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
                    <p className="font-black uppercase tracking-widest text-gray-600 italic">Podgląd historii w arkuszu Google</p>
                    <p className="text-[10px] text-gray-700 mt-4 uppercase">Aktualnie historia dostępna jest bezpośrednio w Google Sheets u Trenera.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10 animate-fade-in">
            <i className={`fas ${isMasterAdmin ? 'fa-user-shield' : 'fa-user-tie'} text-9xl mb-10 ${accentText}`}></i>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">Witaj w {panelTitle}</h2>
            <p className="text-sm font-bold mt-4 uppercase tracking-widest italic">Zarządzaj swoją siłownią Bear Gym</p>
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
