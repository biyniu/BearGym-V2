
import React, { useContext, useRef, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { storage } from '../services/storage';
import { CLIENT_CONFIG } from '../constants';
import { WorkoutPlan } from '../types';

export default function Dashboard() {
  const { workouts, logo, updateLogo, clientName } = useContext(AppContext);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if(ev.target?.result) updateLogo(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getLastDate = (id: string) => {
    const history = storage.getHistory(id);
    return history.length > 0 ? history[0].date : 'Nigdy';
  };

  return (
    <div className="animate-fade-in relative">
      
      {/* HEADER */}
      <div className="flex flex-col items-center mb-6">
        <div 
          onClick={() => fileInputRef.current?.click()} 
          className="cursor-pointer relative group w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-red-600 shadow-xl transition-all hover:shadow-red-900/50"
        >
          <img 
            src={logo || 'https://lh3.googleusercontent.com/u/0/d/1GZ-QR4EyK6Ho9czlpTocORhwiHW4FGnP'} 
            alt="Logo"
            onError={(e) => { (e.target as HTMLImageElement).src='https://lh3.googleusercontent.com/u/0/d/1GZ-QR4EyK6Ho9czlpTocORhwiHW4FGnP'; }} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
            <i className="fas fa-camera text-white text-2xl"></i>
          </div>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight uppercase text-center px-4">
          {clientName || "TWÓJ TRENING"}
        </h2>
        <p className="text-[10px] text-red-500 font-bold tracking-[0.2em] uppercase mt-1">{CLIENT_CONFIG.name}</p>
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={handleLogoUpload} 
        />
      </div>

      {/* WORKOUT LIST */}
      <div className="grid gap-4 mb-6">
        {(Object.entries(workouts) as [string, WorkoutPlan][]).map(([id, data]) => (
          <button 
            key={id}
            onClick={() => navigate(`/workout/${id}`)} 
            className="bg-[#1e1e1e] rounded-xl shadow-md p-6 flex items-center justify-between border-l-4 border-red-500 hover:bg-gray-800 transition transform active:scale-95 group"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">{data.title}</h2>
              <span className="text-gray-500 text-xs flex items-center mt-1">
                <i className="fas fa-clock mr-1"></i> Ostatnio: {getLastDate(id)}
              </span>
            </div>
            <i className="fas fa-chevron-right text-gray-600 group-hover:text-white transition-colors"></i>
          </button>
        ))}
      </div>

      {/* CALENDAR WIDGET */}
      <div className="mb-6">
        <CalendarWidget workouts={workouts} logo={logo} />
      </div>

      {/* ANALYSIS & EXTRAS NAVIGATION */}
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/history')} 
            className="bg-[#1e1e1e] rounded-xl shadow p-4 text-gray-400 hover:text-white flex flex-col items-center justify-center transition border border-transparent hover:border-gray-600"
          >
            <i className="fas fa-history mb-2 text-2xl"></i> 
            <span className="text-sm">Pełna historia</span>
          </button>
          
          <button 
            onClick={() => navigate('/progress')} 
            className="bg-[#1e1e1e] rounded-xl shadow p-4 text-blue-400 hover:text-blue-300 flex flex-col items-center justify-center transition border border-transparent hover:border-blue-900"
          >
            <i className="fas fa-chart-line mb-2 text-2xl"></i> 
            <span className="text-sm">Wykresy postępu</span>
          </button>
        </div>

        <button 
            onClick={() => navigate('/measurements')} 
            className="w-full bg-[#1e1e1e] rounded-xl shadow p-4 text-green-400 hover:text-green-300 flex items-center justify-center transition border border-transparent hover:border-green-900"
        >
            <i className="fas fa-ruler-combined text-2xl mr-3"></i>
            <span className="font-bold">Pomiary Ciała</span>
        </button>
        
        <button 
            onClick={() => navigate('/cardio')} 
            className="w-full bg-[#1e1e1e] rounded-xl shadow p-4 text-red-400 hover:text-red-300 flex flex-col items-center justify-center transition border border-transparent hover:border-red-900"
        >
            <i className="fas fa-heartbeat text-2xl mb-2"></i>
            <span className="text-sm font-bold">Log Cardio</span>
        </button>
      </div>
    </div>
  );
}

// --- CALENDAR WIDGET ---
function CalendarWidget({ workouts, logo }: { workouts: any, logo: string }) {
    const [viewDate, setViewDate] = useState(new Date());
    
    const months = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    const daysShort = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

    const dayStatus = useMemo(() => {
        const status: Record<string, { strength: boolean; cardio: boolean }> = {};
        
        const ensureDate = (d: string) => {
            if (!status[d]) status[d] = { strength: false, cardio: false };
        };

        Object.keys(workouts).forEach(id => {
            const hist = storage.getHistory(id);
            hist.forEach(h => {
                const datePart = h.date.split(' ')[0]; 
                ensureDate(datePart);
                status[datePart].strength = true;
            });
        });

        const cardio = storage.getCardioSessions();
        cardio.forEach(c => {
            const [y, m, d] = c.date.split('-');
            const datePart = `${d}.${m}.${y}`;
            ensureDate(datePart);
            status[datePart].cardio = true;
        });

        return status;
    }, [workouts, viewDate]);

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days = [];
    for(let i=0; i<firstDayIndex; i++) days.push(null);
    for(let i=1; i<=daysInMonth; i++) days.push(i);

    const isToday = (d: number) => {
        const today = new Date();
        return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    const getStatus = (d: number) => {
        const dStr = d.toString().padStart(2, '0');
        const mStr = (month + 1).toString().padStart(2, '0');
        const checkDate = `${dStr}.${mStr}.${year}`;
        return dayStatus[checkDate];
    };

    return (
        <div className="bg-[#1e1e1e] rounded-xl shadow-md p-4 border border-gray-800 relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] text-gray-800 opacity-20 transform rotate-12">
                 <i className="fas fa-calendar-alt text-8xl"></i>
            </div>

            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 relative z-10">
                <button onClick={prevMonth} className="text-gray-400 hover:text-white p-2"><i className="fas fa-chevron-left"></i></button>
                <div className="text-white font-bold text-lg uppercase tracking-wide">
                    {months[month]} <span className="text-red-500">{year}</span>
                </div>
                <button onClick={nextMonth} className="text-gray-400 hover:text-white p-2"><i className="fas fa-chevron-right"></i></button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2 text-center relative z-10">
                {daysShort.map(d => (
                    <div key={d} className="text-[10px] text-gray-500 font-bold uppercase">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 relative z-10">
                {days.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} className="aspect-square"></div>;
                    
                    const status = getStatus(day);
                    const today = isToday(day);
                    
                    const hasStrength = status?.strength;
                    const hasCardio = status?.cardio;
                    const anyActivity = hasStrength || hasCardio;

                    return (
                        <div 
                            key={day} 
                            className={`
                                aspect-square rounded-lg flex items-center justify-center relative border transition overflow-hidden
                                ${today ? 'border-red-500 bg-gray-800' : 'border-gray-800 bg-[#121212]'}
                                ${anyActivity ? 'cursor-pointer border-green-600/50' : ''}
                            `}
                        >
                            {!anyActivity && (
                                <span className="text-xs font-bold z-10 relative text-gray-500">
                                    {day}
                                </span>
                            )}
                            
                            {hasCardio && !hasStrength && (
                                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-red-900/30">
                                    <i className="fas fa-heartbeat text-red-500 text-xl animate-pulse"></i>
                                    <div className="absolute top-0 left-0 p-0.5 text-[8px] text-gray-500 font-mono">{day}</div>
                                </div>
                            )}

                            {hasStrength && (
                                <div className="absolute inset-0 w-full h-full">
                                    <img 
                                        src={logo || 'https://lh3.googleusercontent.com/u/0/d/1GZ-QR4EyK6Ho9czlpTocORhwiHW4FGnP'} 
                                        alt="" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src='https://lh3.googleusercontent.com/u/0/d/1GZ-QR4EyK6Ho9czlpTocORhwiHW4FGnP'; }} 
                                    />
                                    
                                    {hasCardio && (
                                        <div className="absolute top-0 left-0 w-full bg-red-600 bg-opacity-90 flex justify-center items-center py-[1px]">
                                            <span className="text-[8px] font-black text-white tracking-widest uppercase" style={{fontSize: '0.5rem'}}>CARDIO</span>
                                        </div>
                                    )}

                                    <div className="absolute bottom-0 right-0 bg-black/60 px-1 rounded-tl text-[8px] text-green-400">
                                        <i className="fas fa-check"></i>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-3 flex justify-center items-center space-x-3 text-[10px] text-gray-500 relative z-10">
                 <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div> Dzisiaj</div>
                 <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div> Siła</div>
                 <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-900 border border-red-500 mr-1"></div> Cardio</div>
            </div>
        </div>
    );
}
