
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { storage, remoteStorage } from '../services/storage';
import { CLIENT_CONFIG } from '../constants';
import { Exercise, WorkoutPlan, CardioSession, WorkoutHistoryEntry, ExerciseType } from '../types';

declare var html2pdf: any;

export default function SettingsView() {
  const { settings, updateSettings, playAlarm, workouts, updateWorkouts, clientCode, syncData, logo } = useContext(AppContext);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [cardioStartDate, setCardioStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [cardioEndDate, setCardioEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const updatePlanExercises = (workoutId: string, newExercises: Exercise[]) => {
    const newWorkouts = { ...workouts };
    newWorkouts[workoutId] = {
        ...newWorkouts[workoutId],
        exercises: newExercises
    };
    updateWorkouts(newWorkouts);
  };

  const handleEditSave = (updatedEx: Exercise) => {
    if (!selectedWorkoutId || editingExerciseIdx === null) return;
    const currentExercises = [...workouts[selectedWorkoutId].exercises];
    currentExercises[editingExerciseIdx] = updatedEx;
    updatePlanExercises(selectedWorkoutId, currentExercises);
    setEditingExerciseIdx(null);
  };

  const handleDeleteExercise = (idx: number) => {
    if (!window.confirm("Czy na pewno chcesz trwale usunąć to ćwiczenie z planu?")) return;
    const currentExercises = [...workouts[selectedWorkoutId].exercises];
    currentExercises.splice(idx, 1);
    updatePlanExercises(selectedWorkoutId, currentExercises);
    setEditingExerciseIdx(null);
  };

  const handleAddExercise = () => {
    if (!selectedWorkoutId) return;
    const newEx: Exercise = { 
      id: `custom_${Date.now()}`, 
      name: "Nowe ćwiczenie", 
      pl: "Opis...", 
      sets: 3, 
      reps: "10", 
      tempo: "2011", 
      rir: "1", 
      rest: 90, 
      link: "", 
      type: "standard" 
    };
    const currentExercises = [...workouts[selectedWorkoutId].exercises];
    currentExercises.push(newEx);
    updatePlanExercises(selectedWorkoutId, currentExercises);
    setEditingExerciseIdx(currentExercises.length - 1);
  };

  const handleMove = (idx: number, dir: number) => {
    if (!selectedWorkoutId) return;
    const exercises = [...workouts[selectedWorkoutId].exercises];
    const newIdx = idx + dir;
    if (newIdx >= 0 && newIdx < exercises.length) {
        [exercises[idx], exercises[newIdx]] = [exercises[newIdx], exercises[idx]];
        updatePlanExercises(selectedWorkoutId, exercises);
    }
  };

  const handleExport = () => {
    const data: any = {};
    for(let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if(key && (key.startsWith(CLIENT_CONFIG.storageKey) || key === 'app_settings' || key === 'bear_gym_client_code' || key === 'bear_gym_client_name' || key === 'app_logo')) {
            data[key] = localStorage.getItem(key);
        }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${CLIENT_CONFIG.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    if(!window.confirm("To nadpisze obecne dane i zsynchronizuje je z chmurą. Kontynuować?")) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            
            // Zachowujemy obecne logo, jeśli w kopii go nie ma
            const currentLogo = localStorage.getItem('app_logo') || logo;
            
            // 1. Czyścimy starą historię lokalną przed importem nowej
            const prefix = `${CLIENT_CONFIG.storageKey}_history_`;
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) localStorage.removeItem(key);
            }

            // 2. Zapisz nowe dane do localStorage
            Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
            
            // Jeśli import nie miał logo, przywracamy stare
            if (!data['app_logo']) localStorage.setItem('app_logo', currentLogo);

            // 3. Pobierz kod klienta do synchronizacji
            const codeToSync = data['bear_gym_client_code'] || clientCode;
            
            if (codeToSync) {
              localStorage.setItem('is_syncing', 'true');

              // Budujemy mapę całej historii do wysłania
              const historyToSync: Record<string, any[]> = {};
              let planToSync: any = null;

              Object.keys(data).forEach(key => {
                if (key.startsWith(prefix)) {
                  const wId = key.replace(prefix, '');
                  try { historyToSync[wId] = JSON.parse(data[key]); } catch(e) {}
                }
                if (key === `${CLIENT_CONFIG.storageKey}_workouts`) {
                  try { planToSync = JSON.parse(data[key]); } catch(e) {}
                }
              });

              // Pomiary i cardio
              const cardioToSync = JSON.parse(data[`${CLIENT_CONFIG.storageKey}_cardio`] || '[]');
              const measurementsToSync = JSON.parse(data[`${CLIENT_CONFIG.storageKey}_measurements`] || '[]');

              // Wysyłka seryjna do chmury
              if (planToSync) await remoteStorage.saveToCloud(codeToSync, 'plan', planToSync);
              await remoteStorage.saveToCloud(codeToSync, 'history', historyToSync);
              await remoteStorage.saveToCloud(codeToSync, 'extras', {
                measurements: measurementsToSync,
                cardio: cardioToSync
              });

              localStorage.removeItem('is_syncing');
              alert("Import zakończony! Dane zsynchronizowane z arkuszem Google.");
            } else {
              alert("Import zakończony lokalnie.");
            }

            window.location.reload();
        } catch(err) { 
            console.error(err);
            alert("Błąd importu pliku."); 
            setIsImporting(false);
        }
    };
    reader.readAsText(file);
  };

  const getExerciseChartData = (workoutId: string, exerciseId: string) => {
    const history = storage.getHistory(workoutId);
    if (!history || history.length < 2) return [];
    return history.slice().reverse().map(entry => {
      const resultStr = entry.results[exerciseId];
      if (!resultStr) return null;
      const matches = resultStr.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/gi);
      let maxWeight = 0;
      let found = false;
      for (const match of matches) {
        const weightVal = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(weightVal)) { if (weightVal > maxWeight) maxWeight = weightVal; found = true; }
      }
      if (!found) return null;
      return { date: entry.date.split(',')[0].slice(0,5), weight: maxWeight };
    }).filter(Boolean);
  };

  const getFilteredCardio = () => {
    let sessions = storage.getCardioSessions();
    if (cardioStartDate) sessions = sessions.filter(s => s.date >= cardioStartDate);
    if (cardioEndDate) sessions = sessions.filter(s => s.date <= cardioEndDate);
    return sessions;
  };

  const getCardioSummary = () => {
    const s = getFilteredCardio();
    return { count: s.length, range: s.length > 0 ? `${cardioStartDate || "Start"} - ${cardioEndDate || "Dziś"}` : "Brak danych" };
  };

  const handleGenerateReport = () => {
    if (!reportRef.current) return;
    setIsGeneratingReport(true);
    const element = reportRef.current;
    const opt = {
      margin: 0,
      filename: `Raport_${CLIENT_CONFIG.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(() => setIsGeneratingReport(false));
    }, 1000);
  };

  return (
    <div className="animate-fade-in pb-10 relative">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Ustawienia</h2>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md p-5 mb-6 border-l-4 border-blue-600">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <i className="fas fa-save text-blue-500 mr-2"></i>Kopia zapasowa
        </h3>
        <div className="grid grid-cols-2 gap-4">
            <button onClick={handleExport} className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded flex flex-col items-center justify-center transition">
                <i className="fas fa-file-download text-2xl mb-2"></i>
                <span className="text-sm font-bold">Eksportuj</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isImporting}
              className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded flex flex-col items-center justify-center transition disabled:opacity-50"
            >
                {isImporting ? (
                  <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                ) : (
                  <i className="fas fa-file-upload text-2xl mb-2"></i>
                )}
                <span className="text-sm font-bold">{isImporting ? 'Importowanie...' : 'Importuj'}</span>
            </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
      </div>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md p-5 mb-6 border-l-4 border-green-600">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <i className="fas fa-file-pdf text-green-500 mr-2"></i>Raporty
        </h3>
        <div className="bg-black/30 p-3 rounded-lg mb-4 border border-gray-700 grid grid-cols-2 gap-3">
            <div><label className="text-[10px] text-gray-500 block">Od:</label><input type="date" value={cardioStartDate} onChange={e => setCardioStartDate(e.target.value)} className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-600" /></div>
            <div><label className="text-[10px] text-gray-500 block">Do:</label><input type="date" value={cardioEndDate} onChange={e => setCardioEndDate(e.target.value)} className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-600" /></div>
        </div>
        <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="w-full bg-green-700 hover:bg-green-600 text-white p-4 rounded-lg font-bold shadow-lg transition">
            {isGeneratingReport ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-file-contract mr-2"></i>}
            POBIERZ RAPORT ANALITYCZNY
        </button>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md p-5 mb-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center"><i className="fas fa-volume-up text-red-500 mr-2"></i>Dźwięk</h3>
        <input type="range" min="0" max="1" step="0.1" value={settings.volume} onChange={e => updateSettings({ ...settings, volume: parseFloat(e.target.value) })} className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600 mb-4" />
        <select value={settings.soundType} onChange={e => updateSettings({ ...settings, soundType: e.target.value as any })} className="w-full bg-gray-800 text-white p-3 rounded border border-gray-600 mb-4">
            <option value="beep1">Krótki Beep</option><option value="beep2">Długi Beeeep</option><option value="beep3">Podwójny Beep</option>
        </select>
        <button onClick={playAlarm} className="bg-gray-700 text-white px-4 py-3 rounded text-sm hover:bg-gray-600 w-full font-bold transition">Testuj dźwięk</button>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md p-5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center"><i className="fas fa-dumbbell text-red-500 mr-2"></i>Edytor Treningu</h3>
        <select className="w-full bg-gray-800 text-white p-3 rounded border border-gray-600 text-lg mb-4" value={selectedWorkoutId} onChange={e => { setSelectedWorkoutId(e.target.value); setEditingExerciseIdx(null); }}>
          <option value="">-- Wybierz Plan --</option>
          {(Object.entries(workouts) as [string, WorkoutPlan][]).map(([id, data]) => (<option key={id} value={id}>{data.title}</option>))}
        </select>

        {selectedWorkoutId && (
          <div className="border-t border-gray-700 pt-4">
             {editingExerciseIdx !== null ? (
               <ExerciseForm 
                 exercise={workouts[selectedWorkoutId].exercises[editingExerciseIdx]} 
                 onSave={handleEditSave} 
                 onCancel={() => setEditingExerciseIdx(null)} 
                 onDelete={() => handleDeleteExercise(editingExerciseIdx)} 
               />
             ) : (
               <>
                 <ul className="space-y-2">
                   {workouts[selectedWorkoutId].exercises.map((ex, idx) => (
                     <li key={idx} className="bg-gray-800 p-3 rounded flex justify-between items-center border border-gray-700 group">
                       <div className="flex-1 cursor-pointer" onClick={() => setEditingExerciseIdx(idx)}>
                          <div className="font-bold text-sm text-white">{idx+1}. {ex.name}</div>
                          <div className="text-[10px] text-gray-500">{ex.type === 'standard' ? 'Ciężar + Powt' : ex.type === 'time' ? 'Na czas' : 'Tylko powt'}</div>
                       </div>
                       <div className="flex space-x-1 ml-2">
                         {idx > 0 && <button onClick={() => handleMove(idx, -1)} className="text-gray-400 p-2 hover:text-white transition"><i className="fas fa-arrow-up"></i></button>}
                         {idx < workouts[selectedWorkoutId].exercises.length - 1 && <button onClick={() => handleMove(idx, 1)} className="text-gray-400 p-2 hover:text-white transition"><i className="fas fa-arrow-down"></i></button>}
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteExercise(idx); }} 
                            className="text-red-900 hover:text-red-500 p-2 transition ml-1"
                            title="Usuń ćwiczenie"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                       </div>
                     </li>
                   ))}
                 </ul>
                 <button onClick={handleAddExercise} className="mt-4 w-full bg-green-700 hover:bg-green-600 text-white py-3 rounded font-bold transition shadow-lg">DODAJ NOWE ĆWICZENIE</button>
                 <p className="text-[10px] text-gray-500 mt-4 text-center italic">Wszystkie zmiany są zapisywane automatycznie w chmurze.</p>
               </>
             )}
          </div>
        )}
      </div>

      {/* RAPORT PDF TEMPLATE (OFF-SCREEN) */}
      <div className="absolute top-0 left-[-9999px]">
        <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-[#121212] text-white p-8">
            <h1 className="text-3xl font-bold border-b-4 border-red-600 pb-4 mb-8">BEAR GYM - RAPORT</h1>
            <section className="mb-10">
                <h2 className="text-xl font-bold text-blue-500 mb-4 uppercase">Podsumowanie Cardio</h2>
                <p className="text-sm text-gray-400 mb-2">Okres: {getCardioSummary().range}</p>
                <p className="text-sm text-gray-400">Łączna liczba sesji: {getCardioSummary().count}</p>
            </section>
            <section>
                <h2 className="text-xl font-bold text-red-500 mb-6 uppercase">Analiza Siłowa</h2>
                {Object.keys(workouts).map(wId => (
                    <div key={wId} className="mb-6">
                        <h3 className="font-bold border-l-2 border-red-500 pl-2 mb-3">{workouts[wId].title}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {workouts[wId].exercises.map(ex => {
                                const cData = getExerciseChartData(wId, ex.id);
                                if(cData.length < 2) return null;
                                return <div key={ex.id} className="bg-gray-900 p-2 text-[10px] border border-gray-800 rounded">{ex.name}: Max {Math.max(...cData.map(d=>d.weight))}kg</div>
                            })}
                        </div>
                    </div>
                ))}
            </section>
        </div>
      </div>
    </div>
  );
}

const ExerciseForm = ({ exercise, onSave, onCancel, onDelete }: { exercise: Exercise, onSave: (e: Exercise) => void, onCancel: () => void, onDelete: () => void }) => {
  const [formData, setFormData] = useState<Exercise>({ ...exercise });
  const handleChange = (field: keyof Exercise, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  
  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-600 animate-fade-in shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-black text-white text-lg uppercase italic tracking-tighter">Edycja Ćwiczenia</h4>
        <button onClick={onDelete} className="bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center">
            <i className="fas fa-trash-alt mr-2"></i> USUŃ
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">Nazwa (EN / PL)</label>
          <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 mb-2 focus:border-red-500 outline-none" placeholder="Nazwa oryginalna" />
          <input type="text" value={formData.pl} onChange={e => handleChange('pl', e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-red-500 outline-none" placeholder="Polski opis" />
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">Logowanie wyników</label>
          <select 
            value={formData.type} 
            onChange={e => handleChange('type', e.target.value as ExerciseType)}
            className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-red-500 outline-none"
          >
            <option value="standard">Standard (Ciężar + Powtórzenia)</option>
            <option value="reps_only">Tylko Powtórzenia</option>
            <option value="reps">Tylko Powtórzenia (Alias)</option>
            <option value="time">Na czas (Stoper)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">Serie</label>
            <input type="number" value={formData.sets} onChange={e => handleChange('sets', parseInt(e.target.value))} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-red-500 outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">Przerwa (s)</label>
            <input type="number" value={formData.rest} onChange={e => handleChange('rest', parseInt(e.target.value))} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-red-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">Zakres</label>
            <input type="text" value={formData.reps} onChange={e => handleChange('reps', e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-red-500 outline-none" placeholder="8-10" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">Tempo</label>
            <input type="text" value={formData.tempo} onChange={e => handleChange('tempo', e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-red-500 outline-none" placeholder="2011" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">RIR</label>
            <input type="text" value={formData.rir} onChange={e => handleChange('rir', e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-red-500 outline-none" placeholder="1-2" />
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2 mt-6">
        <button onClick={() => onSave(formData)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-lg font-bold shadow-lg transition transform active:scale-95">ZAPISZ ZMIANY</button>
        <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3.5 rounded-lg font-bold transition">ANULUJ</button>
      </div>
    </div>
  );
};
