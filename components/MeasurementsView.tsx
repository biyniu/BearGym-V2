
import React, { useState, useContext } from 'react';
import { storage } from '../services/storage';
import { BodyMeasurement } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppContext } from '../App';

export default function MeasurementsView() {
  const { syncData } = useContext(AppContext);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(storage.getMeasurements());
  const [selectedMetric, setSelectedMetric] = useState<keyof BodyMeasurement>('weight');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    waist: '',
    chest: '',
    biceps: '',
    thigh: ''
  });

  const metricLabels: {[key: string]: string} = {
    weight: 'Waga (kg)',
    waist: 'Pas (cm)',
    chest: 'Klatka (cm)',
    biceps: 'Biceps (cm)',
    thigh: 'Udo (cm)'
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.date) return alert("Wybierz datę");
    if (!form.weight && !form.waist && !form.chest && !form.biceps && !form.thigh) {
        return alert("Wpisz chociaż jedną wartość");
    }

    const newEntry: BodyMeasurement = {
      id: Date.now().toString(),
      date: form.date,
      weight: form.weight,
      waist: form.waist,
      chest: form.chest,
      biceps: form.biceps,
      thigh: form.thigh
    };

    const updated = [...measurements, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setMeasurements(updated);
    storage.saveMeasurements(updated);
    
    // Synchronizacja sekcji "extras"
    await syncData('extras', {
      measurements: updated,
      cardio: storage.getCardioSessions()
    });
    
    setForm(prev => ({ 
        ...prev, 
        weight: '', waist: '', chest: '', biceps: '', thigh: '' 
    }));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Usunąć ten wpis?")) return;
    const updated = measurements.filter(m => m.id !== id);
    setMeasurements(updated);
    storage.saveMeasurements(updated);
    
    await syncData('extras', {
      measurements: updated,
      cardio: storage.getCardioSessions()
    });
  };

  const chartData = measurements
    .map(m => ({
        date: m.date,
        value: parseFloat(m[selectedMetric] as string),
    }))
    .filter(d => !isNaN(d.value));

  const values = chartData.map(d => d.value);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 100;
  const domainMin = Math.max(0, Math.floor(minVal - 2));
  const domainMax = Math.ceil(maxVal * 1.1);

  const CustomLabel = (props: any) => {
    const { x, y, value } = props;
    return (
      <text x={x} y={y - 10} fill="#fff" textAnchor="middle" fontSize={10} fontWeight="bold">
        {value}
      </text>
    );
  };

  return (
    <div className="animate-fade-in pb-10">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Pomiary Ciała</h2>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md p-4 mb-6 border border-gray-800">
        <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase">Nowy wpis</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
             <div className="col-span-2">
                <label className="text-xs text-gray-500">Data</label>
                <input 
                    type="date" 
                    value={form.date} 
                    onChange={e => handleChange('date', e.target.value)}
                    className="w-full bg-gray-800 text-white p-2 rounded border border-gray-600 focus:border-green-500 outline-none" 
                />
             </div>
             <div>
                <label className="text-xs text-gray-500">Waga (kg)</label>
                <input type="number" value={form.weight} onChange={e => handleChange('weight', e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 focus:border-green-500 outline-none" placeholder="0.0" />
             </div>
             <div>
                <label className="text-xs text-gray-500">Pas (cm)</label>
                <input type="number" value={form.waist} onChange={e => handleChange('waist', e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 focus:border-green-500 outline-none" placeholder="0" />
             </div>
             <div>
                <label className="text-xs text-gray-500">Klatka (cm)</label>
                <input type="number" value={form.chest} onChange={e => handleChange('chest', e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 focus:border-green-500 outline-none" placeholder="0" />
             </div>
             <div>
                <label className="text-xs text-gray-500">Biceps (cm)</label>
                <input type="number" value={form.biceps} onChange={e => handleChange('biceps', e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 focus:border-green-500 outline-none" placeholder="0" />
             </div>
             <div className="col-span-2">
                <label className="text-xs text-gray-500">Udo (cm)</label>
                <input type="number" value={form.thigh} onChange={e => handleChange('thigh', e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 focus:border-green-500 outline-none" placeholder="0" />
             </div>
        </div>
        <button 
            onClick={handleSave} 
            className="w-full bg-green-700 hover:bg-green-600 text-white py-3 rounded font-bold shadow transition"
        >
            ZAPISZ POMIAR
        </button>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md p-4 mb-6 border border-gray-800">
         <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white">Wykres</h3>
            <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value as keyof BodyMeasurement)}
                className="bg-gray-800 text-white text-xs p-2 rounded border border-gray-600 outline-none"
            >
                {Object.entries(metricLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                ))}
            </select>
         </div>
         
         <div className="h-64 w-full">
            {chartData.length < 2 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-xs">
                    Za mało danych do wykresu (min. 2 wpisy).
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 10, bottom: 0, left: 10 }}>
                        <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="#666" 
                            tick={{fill: '#888', fontSize: 10}} 
                            tickMargin={8}
                            minTickGap={30}
                        />
                        <YAxis type="number" domain={[domainMin, domainMax]} hide={true} />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #444' }} itemStyle={{ color: '#fff' }} />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#1e1e1e' }} activeDot={{ r: 5, fill: '#fff' }} label={<CustomLabel />} />
                    </LineChart>
                </ResponsiveContainer>
            )}
         </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl shadow-md overflow-hidden border border-gray-800">
        <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="font-bold text-sm text-gray-300">Historia wpisów</span>
            <span className="text-xs text-gray-500">{measurements.length} łącznie</span>
        </div>
        <div>
            {measurements.slice().reverse().map(m => (
                <div key={m.id} className="p-3 border-b border-gray-800 flex justify-between items-center last:border-0 hover:bg-gray-800/50 transition">
                    <div>
                        <div className="text-white font-bold text-sm">{m.date}</div>
                        <div className="text-xs text-gray-500 mt-1 space-x-2">
                            {m.weight && <span className="bg-gray-800 px-1 rounded text-green-400">W: {m.weight}kg</span>}
                            {m.waist && <span className="bg-gray-800 px-1 rounded text-blue-400">P: {m.waist}</span>}
                        </div>
                    </div>
                    <button onClick={() => handleDelete(m.id)} className="text-red-900 hover:text-red-500 p-2 transition">
                        <i className="fas fa-trash"></i>
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
