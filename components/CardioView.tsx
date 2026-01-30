
import React, { useState, useRef, useMemo, useContext } from 'react';
import { storage } from '../services/storage';
import { CardioSession, CardioType } from '../types';
import { CLIENT_CONFIG } from '../constants';
import { AppContext } from '../App';

declare var html2pdf: any;

export default function CardioView() {
  const { syncData } = useContext(AppContext);
  const [sessions, setSessions] = useState<CardioSession[]>(storage.getCardioSessions());
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'rowerek' as CardioType,
    duration: '',
    notes: ''
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const cardioTypes: { value: CardioType, label: string, icon: string }[] = [
    { value: 'rowerek', label: 'Rowerek Stacjonarny', icon: 'fa-bicycle' },
    { value: 'bieznia', label: 'Bieżnia', icon: 'fa-running' },
    { value: 'schody', label: 'Schody', icon: 'fa-stairs' },
    { value: 'orbitrek', label: 'Orbitrek', icon: 'fa-walking' }
  ];

  const handleSave = async () => {
    if (!form.duration) return alert("Podaj czas trwania");
    
    const newSession: CardioSession = {
      id: Date.now().toString(),
      date: form.date,
      type: form.type,
      duration: form.duration,
      notes: form.notes
    };

    const updated = [newSession, ...sessions].sort((a,b) => b.date.localeCompare(a.date));
    setSessions(updated);
    storage.saveCardioSessions(updated);
    
    // Synchronizacja sekcji "extras"
    await syncData('extras', {
      measurements: storage.getMeasurements(),
      cardio: updated
    });

    setForm(prev => ({ ...prev, duration: '', notes: '' }));
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Usunąć wpis?")) return;
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    storage.saveCardioSessions(updated);
    
    await syncData('extras', {
      measurements: storage.getMeasurements(),
      cardio: updated
    });
  };

  const handleExportPDF = () => {
    if (!contentRef.current) return;
    setIsGeneratingPdf(true);
    const element = contentRef.current;
    const opt = {
      margin: 10,
      filename: `Cardio_${CLIENT_CONFIG.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(() => {
            setIsGeneratingPdf(false);
        });
    }, 100);
  };

  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: CardioSession[] } = {};
    sessions.forEach(session => {
        const [y, m, d] = session.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d, 12, 0, 0); 
        const dayOfWeek = dateObj.getDay(); 
        const dist = (dayOfWeek + 6) % 7;
        dateObj.setDate(dateObj.getDate() - dist);
        const monY = dateObj.getFullYear();
        const monM = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const monD = dateObj.getDate().toString().padStart(2, '0');
        const key = `${monY}-${monM}-${monD}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(session);
    });
    return Object.entries(groups)
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([mondayDate, items]) => {
            const [y, m, d] = mondayDate.split('-').map(Number);
            const start = new Date(y, m - 1, d, 12, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            const formatD = (dObj: Date) => `${dObj.getDate().toString().padStart(2,'0')}.${(dObj.getMonth()+1).toString().padStart(2,'0')}`;
            return { label: `${formatD(start)} - ${formatD(end)}`, items: items, count: items.length };
        });
  }, [sessions]);

  return (
    <div className="animate-fade-in pb-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Strefa Cardio</h2>
        <button 
            onClick={handleExportPDF}
            disabled={isGeneratingPdf}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded font-bold shadow transition text-xs flex items-center"
        >
            {isGeneratingPdf ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf mr-2"></i>}
            PDF
        </button>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md p-4 mb-6 border border-gray-800">
        <div className="grid grid-cols-1 gap-4">
            <div>
                <label className="text-xs text-gray-500 block mb-1">Data</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-gray-800 text-white p-3 rounded border border-gray-600 outline-none" />
            </div>
            <div>
                <label className="text-xs text-gray-500 block mb-1">Rodzaj aktywności</label>
                <div className="grid grid-cols-2 gap-2">
                    {cardioTypes.map(t => (
                        <button key={t.value} onClick={() => setForm({...form, type: t.value})} className={`p-3 rounded border flex flex-col items-center justify-center transition ${form.type === t.value ? 'bg-red-900/50 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                            <i className={`fas ${t.icon} text-xl mb-1`}></i>
                            <span className="text-xs font-bold">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="text-xs text-gray-500 block mb-1">Czas trwania (np. 30 min)</label>
                <input type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="Wpisz czas..." className="w-full bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-red-500 outline-none font-bold" />
            </div>
            <button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold shadow-lg transition mt-2">ZAPISZ SESJĘ</button>
        </div>
      </div>

      <div ref={contentRef} className="bg-[#121212] p-2 rounded-xl min-h-[200px]">
         <div className="mb-4 text-center border-b border-gray-700 pb-2 hidden print:block" style={{display: isGeneratingPdf ? 'block' : 'none'}}>
            <h1 className="text-2xl font-bold text-red-500">RAPORT CARDIO</h1>
            <p className="text-gray-400 text-sm">{CLIENT_CONFIG.name}</p>
        </div>
        <h3 className="font-bold text-gray-300 mb-4 px-1 flex items-center justify-between">
            <span><i className="fas fa-history mr-2 text-red-500"></i> Historia</span>
            <span className="text-xs text-gray-500">Łącznie: {sessions.length}</span>
        </h3>
        <div className="space-y-6">
            {groupedSessions.length > 0 ? groupedSessions.map((group, gIdx) => (
                <div key={gIdx} className="break-inside-avoid">
                    <div className="flex items-center justify-between border-b border-gray-700 pb-1 mb-2 px-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tydzień: <span className="text-white ml-1">{group.label}</span></span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${group.count >= 3 ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-300'}`}>{group.count} sesje</span>
                    </div>
                    <div className="space-y-2">
                        {group.items.map(session => {
                            const typeInfo = cardioTypes.find(t => t.value === session.type);
                            return (
                                <div key={session.id} className="bg-[#1e1e1e] p-3 rounded-lg border border-gray-800 flex justify-between items-center hover:bg-[#252525] transition">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-gray-800 w-10 h-10 rounded-full flex items-center justify-center text-red-500 text-lg border border-gray-700 shrink-0"><i className={`fas ${typeInfo?.icon || 'fa-heartbeat'}`}></i></div>
                                        <div>
                                            <div className="text-white font-bold text-sm">{typeInfo?.label}</div>
                                            <div className="text-gray-400 text-[10px]">{session.date} • <span className="text-gray-200 font-mono">{session.duration}</span></div>
                                        </div>
                                    </div>
                                    {!isGeneratingPdf && <button onClick={() => handleDelete(session.id)} className="text-gray-600 hover:text-red-500 p-2 transition"><i className="fas fa-trash-alt"></i></button>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )) : <p className="text-center text-gray-500 py-6">Brak zapisanych sesji cardio.</p>}
        </div>
      </div>
    </div>
  );
}
