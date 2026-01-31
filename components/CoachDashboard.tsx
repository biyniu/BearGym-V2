
import React, { useState, useMemo, useEffect } from 'react';
import { remoteStorage } from '../services/storage';
import { Exercise, ExerciseType, WorkoutPlan } from '../types';

export default function CoachDashboard() {
  const [masterCode, setMasterCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'add_client'>('plan');
  
  // Stan edycji planu
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stan dodawania klienta
  const [newClient, setNewClient] = useState({ code: '', name: '' });

  const handleLogin = async () => {
    setLoading(true);
    const res = await remoteStorage.fetchCoachOverview(masterCode);
    if (res.success) {
      setClients(res.clients);
      setIsAuthorized(true);
    } else {
      alert("Błędny kod trenera.");
    }
    setLoading(false);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.code || !newClient.name) return alert("Wypełnij wszystkie pola");
    
    setLoading(true);
    const success = await remoteStorage.createClient(masterCode, newClient.code, newClient.name);
    if (success) {
      alert("Dodano podopiecznego! Lista odświeży się za moment.");
      setNewClient({ code: '', name: '' });
      // Odśwież listę
      const res = await remoteStorage.fetchCoachOverview(masterCode);
      if (res.success) setClients(res.clients);
      setActiveTab('plan');
    } else {
      alert("Błąd podczas tworzenia klienta. Sprawdź czy kod nie jest już zajęty.");
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
      alert("Plan zapisany pomyślnie!");
      setIsEditingPlan(false);
      loadClientDetail(selectedClient.code);
    } else {
      alert("Błąd zapisu.");
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
      pl: "Skos / Maszyna / Hantle",
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#161616] p-10 rounded-3xl border border-gray-800 shadow-2xl text-center">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-900/40">
            <i className="fas fa-user-shield text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 italic uppercase">Bear Gym Admin</h1>
          <p className="text-gray-500 text-xs mb-8 uppercase tracking-widest font-bold">Wprowadź Master Kod</p>
          <input 
            type="password" 
            placeholder="MASTER KOD"
            value={masterCode}
            onChange={(e) => setMasterCode(e.target.value.toUpperCase())}
            className="w-full bg-black border border-gray-700 text-white p-4 rounded-xl text-center mb-4 focus:border-red-600 outline-none font-mono tracking-[0.5em]"
          />
          <button 
            onClick={handleLogin}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl transition shadow-lg flex items-center justify-center italic tracking-tighter"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "ZALOGUJ TRENERA"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex text-gray-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-[#161616] border-r border-gray-800 flex flex-col h-screen">
        <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center text-white font-black italic shadow-lg">B</div>
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">BEAR GYM <br/><span className="text-[10px] text-red-500 tracking-widest font-bold">PANEL TRENERA</span></h2>
        </div>
        
        <div className="p-4">
           <button 
             onClick={() => { setSelectedClient(null); setActiveTab('add_client'); }}
             className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl transition mb-4 flex items-center justify-center text-xs italic uppercase tracking-tighter shadow-lg shadow-green-900/20"
           >
             <i className="fas fa-plus-circle mr-2"></i> Nowy Podopieczny
           </button>
        </div>

        <div className="flex-grow overflow-y-auto px-4 pb-4 space-y-1">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-2 mb-2 italic">Twoi Podopieczni ({clients.length})</p>
          {clients.map(c => (
            <button 
              key={c.code}
              onClick={() => loadClientDetail(c.code)}
              className={`w-full text-left p-4 rounded-2xl transition flex items-center justify-between border ${selectedClient?.code === c.code ? 'bg-red-600/10 border-red-600 text-white' : 'bg-transparent border-transparent hover:bg-gray-800 text-gray-400'}`}
            >
              <div>
                <div className="font-black text-xs uppercase italic tracking-tighter">{c.name}</div>
                <div className="text-[9px] font-mono text-gray-500">{c.code}</div>
              </div>
              <i className="fas fa-chevron-right text-[10px] opacity-30"></i>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-black/20">
           <button onClick={() => window.location.reload()} className="w-full py-2 text-[10px] text-gray-600 hover:text-red-500 font-black uppercase tracking-widest transition"><i className="fas fa-power-off mr-2"></i>Wyloguj</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto p-10 bg-gradient-to-br from-[#0f0f0f] to-[#050505]">
        {activeTab === 'add_client' ? (
          <div className="max-w-xl mx-auto animate-fade-in">
             <div className="bg-[#161616] p-10 rounded-3xl border border-gray-800 shadow-2xl">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8 border-b border-gray-800 pb-4 flex items-center">
                    <i className="fas fa-user-plus text-red-500 mr-4"></i> Rejestracja Podopiecznego
                </h3>
                <form onSubmit={handleCreateClient} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block italic">Imię i Nazwisko</label>
                        <input 
                            type="text" 
                            placeholder="NP. ADRIAN NOWAK"
                            value={newClient.name}
                            onChange={(e) => setNewClient({...newClient, name: e.target.value.toUpperCase()})}
                            className="w-full bg-black border border-gray-700 text-white p-4 rounded-xl focus:border-red-600 outline-none font-black uppercase italic"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block italic">ID (Kod Logowania)</label>
                        <input 
                            type="text" 
                            placeholder="NP. ADRIAN99"
                            value={newClient.code}
                            onChange={(e) => setNewClient({...newClient, code: e.target.value.toUpperCase()})}
                            className="w-full bg-black border border-gray-700 text-white p-4 rounded-xl focus:border-red-600 outline-none font-mono tracking-widest uppercase"
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl transition shadow-xl uppercase italic tracking-tighter text-lg flex items-center justify-center"
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : "STWÓRZ PROFIL W ARKUSZU"}
                    </button>
                </form>
             </div>
          </div>
        ) : selectedClient ? (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6 border-b border-gray-800 pb-8">
              <div>
                <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">{selectedClient.name}</h1>
                <p className="text-red-600 font-mono text-sm tracking-widest uppercase font-bold">Baza Danych: {selectedClient.code}</p>
              </div>
              <div className="flex bg-[#161616] p-1.5 rounded-2xl border border-gray-800 shadow-lg">
                <TabBtn active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} label="PLAN" icon="fa-dumbbell" />
                <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="HISTORIA" icon="fa-history" />
              </div>
            </div>

            {activeTab === 'plan' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-[#161616] p-5 rounded-2xl border border-gray-800 shadow-xl">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest italic">Edytor Planu Podopiecznego</p>
                  <div className="flex space-x-3">
                    {!isEditingPlan ? (
                      <button 
                        onClick={() => setIsEditingPlan(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl text-xs font-black italic uppercase tracking-tighter transition flex items-center shadow-lg"
                      >
                        <i className="fas fa-edit mr-2"></i> EDYTUJ / KOMPONUJ TRENING
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={addWorkoutDay}
                          className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-3 rounded-xl text-xs font-black italic uppercase tracking-tighter transition flex items-center"
                        >
                          <i className="fas fa-calendar-plus mr-2 text-red-600"></i> NOWY DZIEŃ
                        </button>
                        <button 
                          onClick={handleSavePlanToCloud}
                          disabled={isSaving}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl text-xs font-black italic uppercase tracking-tighter transition flex items-center shadow-xl shadow-green-900/20"
                        >
                          {isSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-cloud-upload-alt mr-2"></i>}
                          ZAPISZ ZMIANY W CHMURZE
                        </button>
                        <button 
                          onClick={() => { setEditedPlan(selectedClient.plan); setIsEditingPlan(false); }}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-3 rounded-xl text-xs font-black italic uppercase tracking-tighter transition"
                        >
                          ANULUJ
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {Object.entries(editedPlan || {}).map(([id, workout]: any) => (
                  <div key={id} className="bg-[#161616] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl mb-8 border-l-8 border-l-red-600">
                    <div className="bg-gradient-to-r from-red-600/10 to-transparent p-8 flex justify-between items-center">
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{workout.title}</h3>
                      {isEditingPlan && (
                        <button onClick={() => addExercise(id)} className="bg-red-600 text-white px-5 py-2 rounded-xl text-[10px] font-black italic uppercase tracking-tighter shadow-lg">
                          + DODAJ ĆWICZENIE
                        </button>
                      )}
                    </div>
                    <div className="p-8">
                       <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-gray-600 border-b border-gray-800 uppercase text-[9px] font-black tracking-widest italic">
                              <th className="pb-4">NAZWA</th>
                              <th className="pb-4 text-center">SERIE</th>
                              <th className="pb-4 text-center">REPS</th>
                              <th className="pb-4 text-center">TEMPO</th>
                              <th className="pb-4 text-center">RIR</th>
                              {isEditingPlan && <th className="pb-4 text-right">AKCJE</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {workout.exercises.map((ex: any, idx: number) => (
                              <tr key={ex.id} className="border-b border-gray-800/50 hover:bg-white/[0.01]">
                                <td className="py-4">
                                  {isEditingPlan ? (
                                    <input value={ex.name} onChange={e => updateExerciseField(id, idx, 'name', e.target.value)} className="bg-black border border-gray-800 p-2 rounded text-xs w-full text-white font-black italic uppercase" />
                                  ) : (
                                    <div className="font-black text-white italic uppercase">{ex.name}</div>
                                  )}
                                </td>
                                <td className="py-4 text-center">
                                  {isEditingPlan ? (
                                    <input type="number" value={ex.sets} onChange={e => updateExerciseField(id, idx, 'sets', parseInt(e.target.value))} className="bg-black border border-gray-800 p-2 rounded text-xs w-10 text-center text-white" />
                                  ) : ex.sets}
                                </td>
                                <td className="py-4 text-center">
                                  {isEditingPlan ? (
                                    <input value={ex.reps} onChange={e => updateExerciseField(id, idx, 'reps', e.target.value)} className="bg-black border border-gray-800 p-2 rounded text-xs w-16 text-center text-green-500 font-mono" />
                                  ) : <span className="text-green-500 font-mono font-bold">{ex.reps}</span>}
                                </td>
                                <td className="py-4 text-center font-mono">
                                  {isEditingPlan ? (
                                    <input value={ex.tempo} onChange={e => updateExerciseField(id, idx, 'tempo', e.target.value)} className="bg-black border border-gray-800 p-2 rounded text-xs w-16 text-center text-blue-500" />
                                  ) : <span className="text-blue-500">{ex.tempo}</span>}
                                </td>
                                <td className="py-4 text-center font-mono">
                                  {isEditingPlan ? (
                                    <input value={ex.rir} onChange={e => updateExerciseField(id, idx, 'rir', e.target.value)} className="bg-black border border-gray-800 p-2 rounded text-xs w-10 text-center text-red-500" />
                                  ) : <span className="text-red-500">{ex.rir}</span>}
                                </td>
                                {isEditingPlan && (
                                  <td className="py-4 text-right">
                                    <button onClick={() => {
                                      const newPlan = { ...editedPlan };
                                      newPlan[id].exercises.splice(idx, 1);
                                      setEditedPlan(newPlan);
                                    }} className="text-red-900 hover:text-red-500"><i className="fas fa-trash"></i></button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                       </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'history' && (
              <div className="bg-[#161616] rounded-3xl p-20 text-center border border-gray-800 opacity-20 italic font-black uppercase">
                 Podgląd historii treningów klienta
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <i className="fas fa-dumbbell text-9xl mb-10 text-red-600"></i>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">Zarządzaj swoją siłownią</h2>
          </div>
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-3 rounded-xl text-[10px] font-black transition flex items-center space-x-2 whitespace-nowrap ${active ? 'bg-red-600 text-white shadow-xl shadow-red-900/40' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <i className={`fas ${icon}`}></i>
      <span className="uppercase tracking-tighter italic">{label}</span>
    </button>
  );
}
