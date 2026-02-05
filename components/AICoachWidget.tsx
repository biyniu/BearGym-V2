
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { GoogleGenAI } from "@google/genai";

export default function AICoachWidget() {
  const { clientName, workouts, clientCode } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
        // Kontekst dla AI
        const systemInstruction = `
            Jesteś Bear AI - surowym, ale motywującym trenerem personalnym.
            Twój podopieczny to: ${clientName} (ID: ${clientCode}).
            Liczba planów treningowych: ${Object.keys(workouts).length}.
            Styl: Krótki, żołnierski, motywujący, używaj slangu siłownianego (masa, rzeźba, pompa).
            Nie pisz elaboratów. Max 3 zdania. Zmuś go do działania.
        `;

        const apiKey = process.env.API_KEY;
        // Jeśli nie ma klucza API, symulujemy odpowiedź (żeby UI działało)
        if (!apiKey) {
            setTimeout(() => {
                const responses = [
                    "Nie gadaj, tylko pakuj! Ten ciężar sam się nie podniesie!",
                    "Wymówki spalają zero kalorii. Ruszaj na trening!",
                    "Widzę, że masz dzisiaj słabszy dzień. Ale wiesz co? Mistrzowie trenują nawet jak im się nie chce.",
                    "Odłóż ten batonik! Cukier to wróg. Zjedz białko i idź spać.",
                    "Plan sam się nie zrobi. Jazda na siłownię, już!"
                ];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                setMessages(prev => [...prev, { role: 'model', text: randomResponse }]);
                setLoading(false);
            }, 1000);
            return;
        }

        // Prawdziwe połączenie z Gemini
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
                { role: 'user', parts: [{ text: userMsg }] }
            ],
            config: {
                systemInstruction: systemInstruction,
            }
        });

        const text = response.text;
        
        if (text) {
            setMessages(prev => [...prev, { role: 'model', text: text }]);
        }

    } catch (e) {
        setMessages(prev => [...prev, { role: 'model', text: "Błąd połączenia z bazą. Ale to nie zwalnia Cię z treningu! (Sprawdź API Key)" }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button 
          onClick={toggleChat}
          className="fixed bottom-24 right-6 z-40 bg-red-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center animate-pulse border-2 border-white hover:scale-110 transition"
        >
          <i className="fas fa-robot text-2xl"></i>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[500px] animate-fade-in-up">
            {/* Header */}
            <div className="bg-red-600 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-red-600 font-bold">
                        <i className="fas fa-robot"></i>
                    </div>
                    <div>
                        <h3 className="text-white font-black italic text-sm">BEAR AI COACH</h3>
                        <p className="text-[10px] text-red-200 uppercase font-bold flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span> Online
                        </p>
                    </div>
                </div>
                <button onClick={toggleChat} className="text-white hover:text-gray-200"><i className="fas fa-times"></i></button>
            </div>

            {/* Messages */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-[#121212] h-64">
                {messages.length === 0 && (
                    <div className="text-center text-gray-600 text-xs mt-4">
                        <p>Tutaj Twój osobisty kat.</p>
                        <p>Napisz, że Ci się nie chce, a zobaczysz co się stanie.</p>
                    </div>
                )}
                {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-xs font-medium ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800 text-gray-400 p-3 rounded-xl rounded-bl-none text-xs flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-[#1e1e1e] border-t border-gray-700 flex space-x-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Wpisz wiadomość..." 
                    className="flex-grow bg-black text-white text-xs p-3 rounded-xl border border-gray-800 outline-none focus:border-red-600"
                />
                <button 
                    onClick={handleSend}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white w-10 h-10 rounded-xl flex items-center justify-center transition"
                >
                    <i className="fas fa-paper-plane text-xs"></i>
                </button>
            </div>
        </div>
      )}
    </>
  );
}
