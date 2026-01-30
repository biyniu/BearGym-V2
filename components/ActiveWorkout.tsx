
import React, { useContext, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { storage } from '../services/storage';
import { Exercise } from '../types';

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const RestTimerButton = ({ duration, playAlarm }: { duration: number, playAlarm: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const startTimer = () => {
    if (timeLeft !== null) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeLeft(null);
      return;
    }
    setTimeLeft(duration);
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          playAlarm();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const isActive = timeLeft !== null;

  return (
    <button 
      onClick={startTimer}
      className={`rounded border border-gray-600 font-bold flex flex-col justify-center items-center transition active:scale-90 w-full h-full p-1
        ${isActive ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-gray-800 text-white hover:bg-gray-700'}
      `}
    >
      <span className="font-mono text-xs">{isActive ? `${timeLeft}` : `${duration}s`}</span>
      {!isActive && <i className="fas fa-clock text-[8px] mt-1"></i>}
    </button>
  );
};

const Stopwatch = ({ id, onChange, initialValue }: { id: string, onChange: (val: string) => void, initialValue: string }) => {
  const [time, setTime] = useState<number>(parseInt(initialValue) || 0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTime(t => {
          const newVal = t + 1;
          onChangeRef.current(newVal.toString());
          return newVal;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const toggle = () => {
    if (isRunning) {
      setIsRunning(false);
      storage.saveTempInput(id, time.toString());
    } else {
      setIsRunning(true);
    }
  };

  return (
    <div className="flex space-x-2 w-full">
      <input 
        type="number" 
        value={time === 0 ? '' : time}
        onChange={(e) => {
          const val = parseInt(e.target.value) || 0;
          setTime(val);
          onChange(val.toString());
        }}
        placeholder="sek" 
        className="bg-[#2d2d2d] border border-[#404040] text-white text-center w-full p-3 rounded text-lg font-bold focus:outline-none focus:border-red-500" 
      />
      <button 
        onClick={toggle}
        className={`w-12 flex-shrink-0 rounded flex items-center justify-center text-white transition-colors ${isRunning ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600 text-red-500'}`}
      >
        <i className={`fas ${isRunning ? 'fa-stop' : 'fa-stopwatch'} fa-lg`}></i>
      </button>
    </div>
  );
};

const SuccessModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 animate-fade-in p-4">
            <div className="bg-[#1e1e1e] border border-green-600 rounded-xl shadow-2xl p-6 max-w-sm w-full text-center relative">
                <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500">
                    <i className="fas fa-check text-2xl text-white"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sukces!</h3>
                <p className="text-gray-300 mb-6">Gratulacje, twój trening został zapisany w chmurze.</p>
                <button 
                    onClick={onClose}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition transform active:scale-95"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default function ActiveWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workouts, playAlarm, syncData } = useContext(AppContext);
  const workoutData = id ? workouts[id] : null;
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  if (!workoutData || !id) return <div className="text-center p-10 text-red-500">Nie znaleziono treningu.</div>;

  const handleFinish = async () => {
    const dateStr = new Date().toLocaleDateString('pl-PL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    let sessionResults: { [key: string]: string } = {};
    let hasData = false;

    workoutData.exercises.forEach(ex => {
      let summaryParts: string[] = [];
      const rawType = ex.type || 'standard';
      // Fix: Removed 'rips_only' comparison which appeared to be a typo and caused a TypeScript type mismatch.
      const normalizedType = (rawType === 'reps' || rawType === 'reps_only') ? 'reps_only' : rawType;
      
      for(let i=1; i<=ex.sets; i++) {
        const uid = `input_${id}_${ex.id}_s${i}`;
        const kg = storage.getTempInput(`${uid}_kg`);
        const reps = storage.getTempInput(`${uid}_reps`);
        const time = storage.getTempInput(`${uid}_time`);

        if (normalizedType === 'standard') {
            if (kg && reps) summaryParts.push(`${kg}kg x ${reps}`);
            else if (reps) summaryParts.push(`${reps}p`);
        } else if (normalizedType === 'reps_only') {
            if (reps) summaryParts.push(`${reps}p`);
        } else if (normalizedType === 'time') {
            if (time && time !== '0') summaryParts.push(`${time}s`);
        }
      }
      const note = storage.getTempInput(`note_${id}_${ex.id}`);
      if(summaryParts.length > 0) {
        let resStr = summaryParts.join(' | ');
        if(note) resStr += ` [Note: ${note}]`;
        sessionResults[ex.id] = resStr;
        hasData = true;
        localStorage.setItem(`history_${id}_${ex.id}`, resStr);
      }
    });

    if(!hasData && !window.confirm("Zakończyć pusty trening?")) return;

    const timeStr = formatTime(elapsedTime);
    const finalDateStr = `${dateStr} (${timeStr})`;
    const history = storage.getHistory(id);
    
    const newEntry = {
      date: finalDateStr,
      timestamp: Date.now(),
      results: sessionResults
    };

    history.unshift(newEntry);
    storage.saveHistory(id, history);
    
    await syncData('history', history);
    storage.clearTempInputs(id, workoutData.exercises);
    setShowSuccessModal(true);
  };

  return (
    <div className="animate-fade-in pb-10 relative">
      {showSuccessModal && <SuccessModal onClose={() => navigate('/')} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white truncate max-w-[60%]">{workoutData.title}</h2>
        <div className="bg-gray-800 px-3 py-1 rounded border border-gray-600 flex items-center space-x-2">
            <i className="fas fa-stopwatch text-red-500"></i>
            <span className="font-mono text-lg font-bold text-white">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md p-4 mb-8 border-l-4 border-yellow-500">
        <h3 className="font-bold text-yellow-500 mb-2 uppercase text-sm">Rozgrzewka / Aktywacja</h3>
        <ul className="space-y-2">
          {workoutData.warmup.map((item, idx) => (
            <li key={idx} className="flex justify-between text-sm items-center border-b border-gray-700 py-1 last:border-0">
              <span><span className="text-gray-500 mr-1">{idx+1}.</span> {item.pl}</span>
              <div className="flex items-center space-x-3">
                <span className="text-gray-400 text-xs">{item.reps}</span>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" className="text-red-500 hover:text-red-400">
                    <i className="fab fa-youtube"></i>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-6">
        {workoutData.exercises.map((ex, idx) => (
          <ExerciseCard 
            key={ex.id} 
            exercise={ex} 
            workoutId={id} 
            index={idx+1} 
            playAlarm={playAlarm} 
          />
        ))}
      </div>

      <div className="mt-12 mb-8 px-4">
        <button 
          onClick={handleFinish} 
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center"
        >
          <i className="fas fa-check-circle mr-2"></i> ZAKOŃCZ I ZAPISZ TRENING
        </button>
      </div>
    </div>
  );
}

const ExerciseCard = React.memo(({ exercise, workoutId, index, playAlarm }: { exercise: Exercise, workoutId: string, index: number, playAlarm: () => void }) => {
  const lastResult = storage.getLastResult(workoutId, exercise.id);
  const noteId = `note_${workoutId}_${exercise.id}`;
  const [note, setNote] = useState(storage.getTempInput(noteId));
  const [fillVersion, setFillVersion] = useState(0);

  // Inteligentne mapowanie typów (naprawia problem z aliasami typu 'reps')
  const getEffectiveType = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'time') return 'time';
    // Fix: Removed 'rips_only' comparison to maintain consistency and avoid potential type errors.
    if (t === 'reps' || t === 'reps_only') return 'reps_only';
    return 'standard';
  };

  const effectiveType = getEffectiveType(exercise.type);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    storage.saveTempInput(noteId, e.target.value);
  };

  const handleFillWeights = () => {
    if (!lastResult) return;
    const matches = Array.from(lastResult.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/gi));
    if (matches.length === 0) return;
    for(let i=1; i<=exercise.sets; i++) {
        const matchIndex = Math.min(i-1, matches.length - 1);
        const weight = matches[matchIndex][1];
        const uid = `input_${workoutId}_${exercise.id}_s${i}`;
        storage.saveTempInput(`${uid}_kg`, weight);
    }
    setFillVersion(v => v + 1);
  };

  return (
    <div className="bg-[#1e1e1e] rounded-xl shadow-md p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <span className="text-red-500 font-bold text-xs uppercase">Ćwiczenie {index}</span>
          <h3 className="font-bold text-lg text-white">{exercise.name}</h3>
          <p className="text-gray-400 text-sm italic mb-2">{exercise.pl}</p>
        </div>
        {exercise.link && (
          <a href={exercise.link} target="_blank" rel="noreferrer" className="text-red-600 hover:text-red-500 p-2">
            <i className="fab fa-youtube fa-2x"></i>
          </a>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 text-[10px] text-center mb-4 bg-black bg-opacity-20 p-2 rounded">
        <div><div className="text-gray-500">TEMPO</div><div className="text-blue-400 font-mono">{exercise.tempo}</div></div>
        <div><div className="text-gray-500">RIR</div><div className="text-blue-400 font-mono">{exercise.rir}</div></div>
        <div><div className="text-gray-500">ZAKRES</div><div className="text-green-400 font-mono">{exercise.reps}</div></div>
        <div className="h-full">
           <RestTimerButton duration={exercise.rest} playAlarm={playAlarm} />
        </div>
      </div>

      <div className="bg-gray-900 bg-opacity-50 p-2 rounded text-[10px] mb-3 border border-gray-800 flex justify-between items-center">
        <div className="truncate">
            <span className="text-red-400 font-bold">OSTATNIO:</span> <span className="text-gray-400">{lastResult || 'Brak danych'}</span>
        </div>
        {lastResult && effectiveType === 'standard' && (
            <button 
                onClick={handleFillWeights}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded border border-gray-600 flex items-center ml-2"
            >
                <i className="fas fa-copy mr-1"></i> Ciężar
            </button>
        )}
      </div>

      <div className="space-y-1">
        {Array.from({ length: exercise.sets }).map((_, sIdx) => {
          const setNum = sIdx + 1;
          const uId = `input_${workoutId}_${exercise.id}_s${setNum}`;
          return (
            <div key={setNum} className="flex items-center py-2 space-x-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-500 text-xs w-6 font-bold pt-1">S{setNum}</span>
              <div className={`flex-grow grid ${effectiveType === 'standard' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                {effectiveType === 'standard' && (
                  <>
                     <SavedInput key={`${uId}_kg_${fillVersion}`} id={`${uId}_kg`} placeholder="kg" />
                     <SavedInput key={`${uId}_reps_${fillVersion}`} id={`${uId}_reps`} placeholder="powt" />
                  </>
                )}
                {effectiveType === 'reps_only' && (
                   <SavedInput key={`${uId}_reps_${fillVersion}`} id={`${uId}_reps`} placeholder="powtórzenia" />
                )}
                {effectiveType === 'time' && (
                  <Stopwatch 
                    id={`${uId}_time`} 
                    initialValue={storage.getTempInput(`${uId}_time`)} 
                    onChange={(val) => storage.saveTempInput(`${uId}_time`, val)} 
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <textarea 
        value={note}
        onChange={handleNoteChange}
        className="w-full mt-3 bg-[#2d2d2d] text-gray-300 text-xs p-2 rounded border border-gray-700 focus:border-red-500 focus:outline-none" 
        placeholder="Notatki do ćwiczenia..." 
        rows={1} 
      />
    </div>
  );
});

const SavedInput: React.FC<{ id: string, placeholder: string }> = ({ id, placeholder }) => {
  const [val, setVal] = useState(storage.getTempInput(id));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
    storage.saveTempInput(id, e.target.value);
  };
  return (
    <input 
      type="number" 
      value={val} 
      onChange={handleChange}
      placeholder={placeholder} 
      className="bg-[#2d2d2d] border border-[#404040] text-white text-center w-full p-3 rounded text-lg font-bold focus:outline-none focus:border-red-500" 
    />
  );
};
