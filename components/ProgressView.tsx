import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../App';
import { storage } from '../services/storage';
import { CLIENT_CONFIG } from '../constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WorkoutPlan } from '../types';

// Deklaracja dla globalnej biblioteki załadowanej w index.html
declare var html2pdf: any;

export default function ProgressView() {
  const { workouts, logo } = useContext(AppContext);
  const workoutIds = Object.keys(workouts);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>(workoutIds[0] || "");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Ref dla ukrytego szablonu PDF
  const reportRef = useRef<HTMLDivElement>(null);

  // Funkcja pomocnicza do pobierania danych dla konkretnego ćwiczenia
  const getExerciseData = (workoutId: string, exerciseId: string) => {
    const history = storage.getHistory(workoutId);
    if (!history || history.length === 0) return [];

    // Odwracamy historię (najstarsze pierwsze) dla wykresu
    return history.slice().reverse().map(entry => {
      const resultStr = entry.results[exerciseId];
      if (!resultStr) return null;

      // Regex: akceptuje opcjonalną spację przed "kg" (np. "100 kg" i "100kg")
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

      return {
        date: entry.date.split(',')[0].slice(0, 5), // Krótka data DD.MM
        weight: maxWeight,
        fullDate: entry.date
      };
    }).filter(Boolean);
  };

  const handleExportPDF = () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);

    const element = reportRef.current;
    const opt = {
      margin:       0, // Marginesy ustawiamy w CSS szablonu
      filename:     `Raport_Postepow_${CLIENT_CONFIG.name.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Małe opóźnienie dla pewności, że Recharts zdąży przeliczyć wymiary w ukrytym divie
    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(() => {
            setIsGeneratingPdf(false);
        });
    }, 1000);
  };

  // Komponent do rysowania etykiet nad punktami
  const CustomLabel = (props: any) => {
    const { x, y, value } = props;
    return (
      <text 
        x={x} 
        y={y - 8} 
        fill="#fff" 
        textAnchor="middle" 
        fontSize={8} 
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  const currentWorkout = workouts[selectedWorkoutId];

  return (
    <div className="animate-fade-in pb-20 relative">
      
      {/* --- UI APLIKACJI (Panel sterowania) --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white text-center md:text-left">Wykresy Postępu</h2>
        
        <div className="flex gap-2 w-full md:w-auto">
            <select 
                value={selectedWorkoutId} 
                onChange={(e) => setSelectedWorkoutId(e.target.value)}
                className="flex-grow bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:border-red-500 outline-none"
            >
                {(Object.entries(workouts) as [string, WorkoutPlan][]).map(([id, data]) => (
                <option key={id} value={id}>{data.title}</option>
                ))}
            </select>
            
            <button 
                onClick={handleExportPDF}
                disabled={isGeneratingPdf}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold shadow transition flex items-center justify-center whitespace-nowrap"
            >
                {isGeneratingPdf ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-file-pdf mr-2"></i>}
                POBIERZ PEŁNY RAPORT
            </button>
        </div>
      </div>

      {/* --- WIDOK INTERAKTYWNY (Tylko wybrany trening) --- */}
      <div className="grid grid-cols-1 gap-3">
          {currentWorkout?.exercises.map((ex) => {
              const data = getExerciseData(selectedWorkoutId, ex.id);
              const hasData = data && data.length >= 2;
              
              if (!hasData) return null; 

              const weights = data.map((d: any) => d.weight);
              const maxVal = Math.max(...weights);
              const domainMax = Math.ceil(maxVal * 1.2); 

              return (
                  <div key={ex.id} className="bg-[#1e1e1e] p-3 rounded-lg shadow-sm border border-gray-800">
                      <div className="flex justify-between items-center mb-1 border-b border-gray-700 pb-1">
                          <h3 className="font-bold text-white text-sm truncate max-w-[70%]">{ex.name}</h3>
                          <span className="text-xs font-bold text-blue-400">Max: {maxVal} kg</span>
                      </div>
                      <div className="h-40 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={data as any} margin={{ top: 20, right: 10, bottom: 0, left: 0 }}>
                              <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                              <XAxis 
                                  dataKey="date" 
                                  stroke="#666" 
                                  tick={{fill: '#888', fontSize: 10}} 
                                  tickMargin={5}
                                  minTickGap={30}
                              />
                              <YAxis hide={true} domain={[0, domainMax]} />
                              <Tooltip 
                                  contentStyle={{ backgroundColor: '#111', border: '1px solid #444', borderRadius: '4px', fontSize: '10px' }}
                                  itemStyle={{ color: '#fff' }}
                                  formatter={(value: any) => [`${value} kg`, '']}
                              />
                              <Line 
                                  type="monotone" 
                                  dataKey="weight" 
                                  stroke="#ef4444" 
                                  strokeWidth={2} 
                                  dot={{ r: 3, fill: '#ef4444' }} 
                                  activeDot={{ r: 5, fill: '#fff' }}
                                  label={<CustomLabel />}
                              />
                              </LineChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              );
          })}
          
          {currentWorkout?.exercises.every(ex => {
              const d = getExerciseData(selectedWorkoutId, ex.id);
              return !d || d.length < 2;
          }) && (
              <div className="col-span-full text-center py-10 text-gray-500">
                  <i className="fas fa-chart-bar text-4xl mb-4 opacity-50"></i>
                  <p>Brak wystarczających danych dla tego planu (min. 2 treningi).</p>
              </div>
          )}
      </div>


      {/* --- UKRYTY SZABLON PDF (WSZYSTKIE TRENINGI) --- */}
      <div className="absolute top-0 left-[-9999px]">
        <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-[#121212] text-white font-sans">
            
            {/* Strona Tytułowa / Nagłówek */}
            <div className="bg-[#1e1e1e] p-8 border-b-4 border-red-600 flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-red-600 bg-black">
                        <img 
                            src={logo} 
                            alt="Logo" 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src='https://img.icons8.com/ios-filled/100/ef4444/bear.png'; }} 
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-wider">BEAR GYM</h1>
                        <p className="text-gray-400 text-sm mt-1">PEŁNY RAPORT POSTĘPÓW</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold">{CLIENT_CONFIG.name}</h2>
                    <p className="text-gray-400 text-xs">Data: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div className="px-8 pb-8">
                {/* Pętla po wszystkich planach treningowych */}
                {(Object.entries(workouts) as [string, WorkoutPlan][]).map(([wId, plan]) => {
                    // Sprawdź czy plan ma jakiekolwiek dane
                    const hasAnyData = plan.exercises.some(ex => {
                         const d = getExerciseData(wId, ex.id);
                         return d && d.length >= 2;
                    });

                    if (!hasAnyData) return null;

                    return (
                        <section key={wId} className="mb-8 break-inside-avoid">
                            <h2 className="text-xl font-bold text-red-500 border-b border-red-900 pb-2 mb-4 uppercase tracking-widest flex items-center">
                                <i className="fas fa-dumbbell mr-3 text-sm"></i> {plan.title}
                            </h2>

                            {/* Grid wykresów - 2 kolumny dla schludności na A4 */}
                            <div className="grid grid-cols-2 gap-4">
                                {plan.exercises.map(ex => {
                                    const data = getExerciseData(wId, ex.id);
                                    if (!data || data.length < 2) return null;

                                    const weights = data.map((d: any) => d.weight);
                                    const maxVal = Math.max(...weights);
                                    const domainMax = Math.ceil(maxVal * 1.2); 
                                    const lastDate = data[data.length-1].date;

                                    return (
                                        <div key={ex.id} className="bg-[#181818] p-3 rounded border border-gray-800 break-inside-avoid">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-bold text-white text-xs truncate w-2/3" title={ex.name}>{ex.name}</h3>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-400">{lastDate}</div>
                                                    <div className="text-[10px] font-bold text-red-500">Max: {maxVal}kg</div>
                                                </div>
                                            </div>
                                            
                                            {/* Wykres w PDF - stała wysokość */}
                                            <div className="h-32 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={data as any}>
                                                        <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                                                        <XAxis 
                                                            dataKey="date" 
                                                            stroke="#555" 
                                                            tick={{fill: '#777', fontSize: 8}} 
                                                            tickMargin={5}
                                                            minTickGap={20}
                                                        />
                                                        <YAxis hide={true} domain={[0, domainMax]} />
                                                        <Line 
                                                            type="monotone" 
                                                            dataKey="weight" 
                                                            stroke="#ef4444" 
                                                            strokeWidth={2} 
                                                            dot={{ r: 2, fill: '#ef4444' }} 
                                                            isAnimationActive={false} // Ważne dla PDF!
                                                            label={<CustomLabel />}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}

                <div className="mt-8 text-center text-[10px] text-gray-600 border-t border-gray-800 pt-2">
                    Wygenerowano automatycznie przez aplikację Bear Gym
                </div>
            </div>
        </div>
      </div>

    </div>
  );
}