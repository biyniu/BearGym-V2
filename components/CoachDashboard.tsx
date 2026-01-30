
import React, { useState, useEffect } from 'react';
import { remoteStorage } from '../services/storage';

export default function CoachDashboard() {
  const [masterCode, setMasterCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'extras'>('plan');

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

  const loadClientDetail = async (clientId: string) => {
    setLoading(true);
    const res = await remoteStorage.fetchCoachClientDetail(masterCode, clientId);
    if (res.success) setSelectedClient(res);
    setLoading(false);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#161616] p-10 rounded-3xl border border-gray-800 shadow-2xl text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/20">
            <i className="fas fa-user-shield text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 italic">ADMIN PANEL</h1>
          <p className="text-gray-500 text-sm mb-8">Wprowadź Master Kod, aby zarządzać podopiecznymi</p>
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
      {/* SIDEBAR */}
      <aside className="w-80 bg-[#161616] border-r border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-black italic">B</div>
          <h2 className="text-xl font-black text-white italic tracking-tighter">BEAR GYM COACH</h2>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 mb-2">Podopieczni ({clients.length})</p>
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

      {/* MAIN CONTENT */}
      <main className="flex-grow overflow-y-auto p-10 bg-gradient-to-br from-[#0f0f0f] to-[#050505]">
        {selectedClient ? (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">{selectedClient.name}</h1>
                <p className="text-gray-500 font-mono">ID KLIENTA: {selectedClient.code}</p>
              </div>
              <div className="flex bg-[#161616] p-1 rounded-xl border border-gray-800">
                <TabBtn active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} label="PLAN" icon="fa-dumbbell" />
                <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="HISTORIA" icon="fa-history" />
                <TabBtn active={activeTab === 'extras'} onClick={() => setActiveTab('extras')} label="POMIARY" icon="fa-ruler" />
              </div>
            </div>

            {activeTab === 'plan' && <div className="bg-[#161616] p-8 rounded-3xl border border-gray-800 shadow-xl">
               <h3 className="text-lg font-bold text-white mb-4">Aktualny Plan Treningowy</h3>
               <pre className="bg-black p-6 rounded-2xl border border-gray-800 text-blue-400 font-mono text-xs overflow-x-auto">
                 {JSON.stringify(selectedClient.plan, null, 2)}
               </pre>
               <p className="mt-4 text-gray-500 text-xs italic">Edycja wizualna w przygotowaniu. Obecnie zmiany wprowadź w arkuszu Google (Kolumna C).</p>
            </div>}

            {activeTab === 'history' && <div className="space-y-4">
               {Object.entries(selectedClient.history || {}).map(([id, sessions]: any) => (
                 <div key={id} className="bg-[#161616] p-6 rounded-3xl border border-gray-800">
                    <h3 className="text-white font-bold mb-4 border-b border-gray-800 pb-2">{id}</h3>
                    <div className="space-y-3">
                      {sessions.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm p-3 bg-black/30 rounded-xl border border-gray-800 hover:border-gray-600 transition">
                           <span className="font-bold text-blue-400">{s.date}</span>
                           <span className="text-gray-500 text-xs italic">{Object.keys(s.results).length} ćwiczeń wykonanych</span>
                        </div>
                      ))}
                    </div>
                 </div>
               ))}
            </div>}

            {activeTab === 'extras' && <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#161616] p-6 rounded-3xl border border-gray-800">
                  <h3 className="text-white font-bold mb-4">Pomiary Ciała</h3>
                  {selectedClient.extras?.measurements?.map((m: any) => (
                    <div key={m.id} className="flex justify-between items-center text-xs py-2 border-b border-gray-800 last:border-0">
                      <span className="text-gray-500">{m.date}</span>
                      <span className="text-white font-bold">{m.weight}kg / {m.waist}cm</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#161616] p-6 rounded-3xl border border-gray-800">
                  <h3 className="text-white font-bold mb-4">Log Cardio</h3>
                  {selectedClient.extras?.cardio?.map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center text-xs py-2 border-b border-gray-800 last:border-0">
                      <span className="text-gray-500">{c.date}</span>
                      <span className="text-red-500 font-bold">{c.duration} ({c.type})</span>
                    </div>
                  ))}
                </div>
            </div>}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <i className="fas fa-users text-8xl mb-6"></i>
            <h2 className="text-2xl font-black italic">WYBIERZ PODOPIECZNEGO Z LISTY</h2>
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
      className={`px-6 py-3 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <i className={`fas ${icon}`}></i>
      <span>{label}</span>
    </button>
  );
}
