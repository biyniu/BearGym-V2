
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { storage } from '../services/storage';
import { CLIENT_CONFIG } from '../constants';
import { Exercise, WorkoutPlan, CardioSession, WorkoutHistoryEntry } from '../types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

declare var html2pdf: any;

export default function SettingsView() {
  const { settings, updateSettings, playAlarm, workouts, updateWorkouts, logo } = useContext(AppContext);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
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
    if (!window.confirm("Usunąć trwale?")) return;
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
        if(key && (key.startsWith(CLIENT_CONFIG.storageKey) || key === 'app_settings')) {
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
    if(!window.confirm("To nadpisze obecne dane treningowe. Kontynuować?")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
            alert("Dane zaimportowane pomyślnie!");
            window.location.reload();
        } catch(err) { alert("Błąd importu pliku."); }
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
            <button onClick={() => fileInputRef.current?.click()} className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded flex flex-col items-center justify-center transition">
                <i className="fas fa-file-upload text-2xl mb-2"></i>
                <span className="text-sm font-bold">Importuj</span>
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
               <ExerciseForm exercise={workouts[selectedWorkoutId].exercises[editingExerciseIdx]} onSave={handleEditSave} onCancel={() => setEditingExerciseIdx(null)} onDelete={() => handleDeleteExercise(editingExerciseIdx)} />
             ) : (
               <>
                 <ul className="space-y-2">
                   {workouts[selectedWorkoutId].exercises.map((ex, idx) => (
                     <li key={idx} className="bg-gray-800 p-3 rounded flex justify-between items-center border border-gray-700">
                       <div className="flex-1 cursor-pointer" onClick={() => setEditingExerciseIdx(idx)}><div className="font-bold text-sm text-white">{idx+1}. {ex.name}</div></div>
                       <div className="flex space-x-2 ml-2">
                         {idx > 0 && <button onClick={() => handleMove(idx, -1)} className="text-gray-400 p-2 hover:text-white"><i className="fas fa-arrow-up"></i></button>}
                         {idx < workouts[selectedWorkoutId].exercises.length - 1 && <button onClick={() => handleMove(idx, 1)} className="text-gray-400 p-2 hover:text-white"><i className="fas fa-arrow-down"></i></button>}
                       </div>
                     </li>
                   ))}
                 </ul>
                 <button onClick={handleAddExercise} className="mt-4 w-full bg-green-700 hover:bg-green-600 text-white py-3 rounded font-bold transition">DODAJ ĆWICZENIE</button>
                 <p className="text-[10px] text-gray-500 mt-4 text-center italic">Zmiany w edytorze są synchronizowane z Twoim kontem w chmurze.</p>
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
    <div className="bg-gray-800 p-4 rounded border border-gray-600 animate-fade-in">
      <h4 className="font-bold text-white mb-3 text-lg">Edycja: {formData.name}</h4>
      <div className="space-y-3 text-sm">
        <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" placeholder="Nazwa" />
        <input type="text" value={formData.pl} onChange={e => handleChange('pl', e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" placeholder="Opis" />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" value={formData.sets} onChange={e => handleChange('sets', parseInt(e.target.value))} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" placeholder="Serie" />
          <input type="number" value={formData.rest} onChange={e => handleChange('rest', parseInt(e.target.value))} className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700" placeholder="Przerwa" />
        </div>
      </div>
      <div className="flex space-x-2 mt-4">
        <button onClick={() => onSave(formData)} className="flex-1 bg-green-600 text-white py-3 rounded font-bold">ZAPISZ</button>
        <button onClick={onCancel} className="flex-1 bg-gray-600 text-white py-3 rounded">ANULUJ</button>
      </div>
      <button onClick={onDelete} className="w-full mt-2 bg-red-900 text-red-200 py-2 rounded text-xs">Usuń ćwiczenie</button>
    </div>
  );
};
