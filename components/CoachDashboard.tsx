
import React, { useState, useMemo } from 'react';
import { remoteStorage, parseDateStr } from '../services/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Exercise, ExerciseType, WorkoutPlan } from '../types';

export default function CoachDashboard() {
  const [masterCode, setMasterCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'extras' | 'progress' | 'calendar' | 'json'>('plan');
  const [selectedProgressWorkout, setSelectedProgressWorkout] = useState<string>("");
  
  // Stan dodawania klienta
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({ code: '', name: '' });

  // Stan edycji planu
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Stan konwertera JSON
  const [excelInput, setExcelInput] = useState('');

  const convertedJsonOutput = useMemo(() => {
    if (!excelInput.trim()) return '';
    try {
      const rows = excelInput.trim().split('\n');
      if (rows.length < 1) return '[]';
      // Assuming first row is headers
      const headers = rows[0].split('\t').map(h => h.trim());
      const result = [];
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].split('\t');
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = cells[idx]?.trim() || '';
        });
        // Simple check to avoid empty rows
        if (Object.values(obj).some(v => v !== '')) {
            result.push(obj);
        }
      }
      return JSON.stringify(result, null, 2);
    } catch (e) {
      return "Błąd konwersji: " + e;
    }
  }, [excelInput]);

  const handleLogin = async () => {
    setLoading(true);
    const res = await remoteStorage.fetchCoachOverview(masterCode);
    if (res.success) {
      setClients(res.clients);
      setIsAuthorized(true);
    } else {
      alert("Błędny kod trenera. Sprawdź czy zaktualizowałeś skrypt GAS.");
    }
    setLoading(false);
  };

  const loadClientDetail = async (clientId: string) => {
    setLoading(true);
    const res = await remoteStorage.fetchCoachClientDetail(masterCode, clientId);
    if (res.success) {
      setSelectedClient(res);
      setEditedPlan(res.plan);
      if (res.plan) {
        setSelectedProgressWorkout(Object.keys(res.plan)[0] || "");
      }
      setIsEditingPlan(false);
    }
    setLoading(false);
  };

  const handleAddClient = async () => {
    if (!newClientData.code || !newClientData.name) {
        alert("Wypełnij ID i Nazwę");
        return;
    }
    setLoading(true);
    const success = await remoteStorage.addClient(masterCode, newClientData.code, newClientData.name);
    if (success) {
        alert("Wysłano żądanie. Odczekaj chwilę i odśwież listę.");
        setTimeout(async () => {
             const res = await remoteStorage.fetchCoachOverview(masterCode);
             if(res.success) setClients(res.clients);
             setShowAddClientModal(false);
             setNewClientData({ code: '', name: '' });
             setLoading(false);
        }, 2000);
    } else {
        alert("Błąd połączenia. Sprawdź GAS.");
        setLoading(false);
    }
  };

  const handleCreateNewPlan = () => {
    const emptyPlan = {
        'day_1': {
            title: 'TRENING A',
            warmup: [],
            exercises: []
        }
    };
    setEditedPlan(emptyPlan);
    setIsEditingPlan(true);
  };

  const handleSavePlanToCloud = async () => {
    if (!selectedClient || !editedPlan) return;
    if (!window.confirm("Zapisać plan w chmurze?")) return;

    setIsSaving(true);
    const success = await remoteStorage.saveToCloud(selectedClient.code, 'plan', editedPlan);
    if (success) {
      alert("Zapisano!");
      setIsEditingPlan(false);
      loadClientDetail(selectedClient.code);
    } else {
      alert("Błąd zapisu.");
    }
    setIsSaving(false);
  };

  const updateExerciseField = (workoutId: string, exIdx: number, field: keyof Exercise, value: any) => {
    const newPlan = { ...editedPlan };
    newPlan[workoutId].exercises[exIdx] = {
      ...newPlan[workoutId].exercises[exIdx],
      [field]: value
    };
    setEditedPlan(newPlan);
  };

  const removeExercise = (workoutId: string, exIdx: number) => {
    if (!window.confirm("Usunąć?")) return;
    const newPlan = { ...editedPlan };
    newPlan[workoutId].exercises.splice(exIdx, 1);
    setEditedPlan(newPlan);
  };

  const addExercise = (workoutId: string) => {
    const newPlan = { ...editedPlan };
    const newEx: Exercise = {
      id: `ex_${Date.now()}`,
      name: "Nowe ćwiczenie",
      pl: "Opis...",
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
    const title = window.prompt("Podaj nazwę (np. Trening D):");
    if (!title) return;
    const id = title.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newPlan = { ...editedPlan };
    newPlan[id] = {
      title,
      warmup: [],
      exercises: []
    };
    setEditedPlan(newPlan);
  };

  const removeWorkoutDay = (id: string) => {
    if (!window.confirm(`Usunąć plan "${editedPlan[id].title}"?`)) return;
    const newPlan = { ...editedPlan };
    delete newPlan[id];
    setEditedPlan(newPlan);
  };

  const getExerciseChartData = (workoutId: string, exerciseId: string) => {
    if (!selectedClient?.history) return [];
    const history = selectedClient.history[workoutId];
    if (!Array.isArray(history) || history.length < 2) return [];

    return history.slice()
      .sort((a: any, b: any) => parseDateStr(a.date) - parseDateStr(b.date))
      .map((entry: any) => {
        const resultStr = entry.results?.[exerciseId];
        if (!resultStr) return null;
        const matches = resultStr.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/gi);
        let maxWeight = 0;
        let found = false;
        for (const match of matches) {
          const weightVal = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(weightVal)) {
            if (weightVal > maxWeight) maxWeight = weightVal;
            found = true;
          }
        }
        if (!found) return null;
        
        const datePart = entry.date.split(/[ ,]/)[0];
        return {
          date: datePart.slice(0, 5),
          weight: maxWeight
        };
      }).filter(Boolean);
  };

  // --- RENDER ---
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#161616] p-10 rounded-3xl border border-gray-800 shadow-2xl text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/20">
            <i className="fas fa-user-shield text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 italic">ADMIN PANEL</h1>
          <p className="text-gray-500 text-sm mb-8">Wprowadź Master Kod (np. TRENER123)</p>
          <input 
            type="password" 
            placeholder="MASTER KOD"
            value={masterCode}
            onChange={(e) => setMasterCode(e.target.value.toUpperCase())}
            className="w-full bg-black border border-gray-700 text-white p-4 rounded-xl text-center mb-4 focus:border-blue-500 outline-none font-mono tracking-[0.5em]"
          />
          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "AUTORYZUJ"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex text-gray-300 font-sans">
      <aside className="w-80 bg-[#161616] border-r border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-black italic">B</div>
          <h2 className="text-xl font-black text-white italic tracking-tighter">BEAR GYM COACH</h2>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          <div className="px-2 mb-2 flex justify-between items-center">
             <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Podopieczni ({clients.length})</p>
             <button 
                onClick={() => setShowAddClientModal(true)}
                className="text-blue-500 hover:text-white text-[10px] font-bold uppercase transition border border-blue-900/30 hover:border-blue-500 rounded px-2 py-1"
             >
                + Dodaj
             </button>
          </div>
          {clients.map(c => (
            <button 
              key={c.code}
              onClick={() => loadClientDetail(c.code)}
              className={`w-full text-left p-4 rounded-xl transition flex items-center justify-between border ${selectedClient?.code === c.code ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-transparent border-transparent hover:bg-gray-800 text-gray-400'}`}
            >
              <div>
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-[10px] font-mono opacity-50">{c.code}</div>
              </div>
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-800 bg-black/20">
           <button onClick={() => window.location.reload()} className="w-full py-2 text-xs text-red-500 hover:text-red-400 font-bold uppercase"><i className="fas fa-sign-out-alt mr-2"></i>Wyloguj</button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto p-10 bg-gradient-to-br from-[#0f0f0f] to-[#050505] relative">
        {selectedClient ? (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">{selectedClient.name}</h1>
                <p className="text-gray-500 font-mono">ID KLIENTA: {selectedClient.code}</p>
              </div>
              <div className="flex bg-[#161616] p-1 rounded-xl border border-gray-800 overflow-x-auto">
                <TabBtn active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} label="PLAN" icon="fa-dumbbell" />
                <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="HISTORIA" icon="fa-history" />
                <TabBtn active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} label="PROGRES" icon="fa-chart-line" />
                <TabBtn active={activeTab === 'json'} onClick={() => setActiveTab('json')} label="JSON" icon="fa-code" isSubtle />
              </div>
            </div>

            {activeTab === 'plan' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex justify-between items-center bg-[#161616] p-4 rounded-2xl border border-gray-800">
                  <p className="text-sm font-bold text-gray-400">Edytor Planu</p>
                  <div className="flex space-x-2">
                    {!isEditingPlan ? (
                        editedPlan && Object.keys(editedPlan).length > 0 ? (
                             <button onClick={() => setIsEditingPlan(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-xs font-bold transition">EDYTUJ PLAN</button>
                        ) : (
                             <button onClick={handleCreateNewPlan} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-sm font-black transition shadow-lg shadow-green-900/30 animate-pulse">STWÓRZ PLAN</button>
                        )
                    ) : (
                      <>
                        <button onClick={addWorkoutDay} className="bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold">DODAJ DZIEŃ</button>
                        <button onClick={handleSavePlanToCloud} disabled={isSaving} className="bg-green-600 px-6 py-2 rounded-xl text-xs font-bold">{isSaving ? '...' : 'ZAPISZ'}</button>
                        <button onClick={() => { setEditedPlan(selectedClient.plan); setIsEditingPlan(false); }} className="bg-gray-700 px-6 py-2 rounded-xl text-xs font-bold">ANULUJ</button>
                      </>
                    )}
                  </div>
                </div>

                {editedPlan && Object.entries(editedPlan).map(([id, workout]: any) => (
                    <div key={id} className="bg-[#161616] rounded-3xl border border-gray-800 overflow-hidden shadow-xl mb-6">
                        <div className="bg-gradient-to-r from-blue-900/20 to-transparent p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-black text-white italic uppercase">{workout.title}</h3>
                            {isEditingPlan && (
                                <div className="space-x-2">
                                    <button onClick={() => addExercise(id)} className="text-blue-400 text-xs font-bold">+ Ćwiczenie</button>
                                    <button onClick={() => removeWorkoutDay(id)} className="text-red-500 text-xs font-bold">Usuń Dzień</button>
                                </div>
                            )}
                        </div>
                        <div className="p-6 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-gray-500 border-b border-gray-800 text-[10px] font-black tracking-widest uppercase">
                                        <th className="pb-2">Nazwa</th>
                                        <th className="pb-2">Serie</th>
                                        <th className="pb-2">Reps</th>
                                        <th className="pb-2">Tempo</th>
                                        <th className="pb-2">Rest</th>
                                        {isEditingPlan && <th className="pb-2 text-right">Opcje</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {workout.exercises?.map((ex: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="py-2">
                                                {isEditingPlan ? (
                                                    <input value={ex.name} onChange={e => updateExerciseField(id, idx, 'name', e.target.value)} className="bg-black text-white p-1 rounded w-full" />
                                                ) : ex.name}
                                            </td>
                                            <td className="py-2">
                                                {isEditingPlan ? <input value={ex.sets} onChange={e => updateExerciseField(id, idx, 'sets', e.target.value)} className="bg-black text-white p-1 rounded w-10" /> : ex.sets}
                                            </td>
                                            <td className="py-2">
                                                 {isEditingPlan ? <input value={ex.reps} onChange={e => updateExerciseField(id, idx, 'reps', e.target.value)} className="bg-black text-white p-1 rounded w-12" /> : ex.reps}
                                            </td>
                                            <td className="py-2">
                                                 {isEditingPlan ? <input value={ex.tempo} onChange={e => updateExerciseField(id, idx, 'tempo', e.target.value)} className="bg-black text-white p-1 rounded w-12" /> : ex.tempo}
                                            </td>
                                            <td className="py-2">
                                                 {isEditingPlan ? <input value={ex.rest} onChange={e => updateExerciseField(id, idx, 'rest', e.target.value)} className="bg-black text-white p-1 rounded w-12" /> : ex.rest}
                                            </td>
                                            {isEditingPlan && (
                                                <td className="py-2 text-right">
                                                    <button onClick={() => removeExercise(id, idx)} className="text-red-500"><i className="fas fa-trash"></i></button>
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
            
            {/* JSON Converter Section */}
            {activeTab === 'json' && (
                <div className="bg-[#161616] p-6 rounded-3xl border border-gray-800">
                    <h3 className="text-white font-bold mb-4">Konwerter Excel -> JSON</h3>
                    <textarea 
                        className="w-full bg-black border border-gray-800 text-gray-300 p-4 rounded-xl font-mono text-xs mb-4"
                        rows={6}
                        placeholder="Wklej dane z Excela..."
                        value={excelInput}
                        onChange={(e) => setExcelInput(e.target.value)}
                    />
                    <textarea 
                        className="w-full bg-[#0a0a0a] border border-gray-800 text-blue-400 p-4 rounded-xl font-mono text-xs"
                        rows={10}
                        readOnly
                        value={convertedJsonOutput}
                    />
                </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <i className="fas fa-users text-8xl mb-6"></i>
            <h2 className="text-2xl font-black italic">WYBIERZ PODOPIECZNEGO Z LISTY</h2>
          </div>
        )}

        {/* Modal dodawania klienta */}
        {showAddClientModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
                <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                    <h3 className="text-white font-bold text-lg mb-4">Dodaj nowego podopiecznego</h3>
                    <input 
                        type="text"
                        value={newClientData.code}
                        onChange={(e) => setNewClientData({...newClientData, code: e.target.value.toUpperCase()})} 
                        className="w-full bg-black border border-gray-700 text-white p-3 rounded-lg mb-2"
                        placeholder="ID (np. JAN_KOWALSKI)"
                    />
                    <input 
                        type="text"
                        value={newClientData.name}
                        onChange={(e) => setNewClientData({...newClientData, name: e.target.value})} 
                        className="w-full bg-black border border-gray-700 text-white p-3 rounded-lg mb-4"
                        placeholder="Imię i Nazwisko"
                    />
                    <div className="flex space-x-2">
                        <button onClick={handleAddClient} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">Dodaj</button>
                        <button onClick={() => setShowAddClientModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg">Anuluj</button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon, isSubtle }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-3 rounded-lg text-xs font-black transition flex items-center space-x-2 whitespace-nowrap ${active ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <i className={`fas ${icon}`}></i>
      <span className="uppercase tracking-tighter italic">{label}</span>
    </button>
  );
}
