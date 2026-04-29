"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';

export default function ChatWindow({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, chatId }),
      });
      
      if (!res.ok) throw new Error("Failed to fetch response");
      
      const data = await res.json();
      // Ensure the role matches what your UI renders ('model')
      setMessages(prev => [...prev, { role: "model", content: data.text }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        role: "model", 
        content: "⚠️ I encountered an error processing that request. Please check your connection." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a]"> {/* Deep Slate BG */}
      
      {/* Header Info (Optional but adds polish) */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Neural Retrieval Active</span>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar Circle */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border 
                ${m.role === 'user' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'}`}>
                {m.role === 'model' ? <Bot size={16} className="text-blue-400" /> : <UserIcon size={16} className="text-white" />}
              </div>

              {/* Message Bubble */}
              <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-lg
                ${m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800/80 backdrop-blur-sm text-slate-200 border border-slate-700 rounded-tl-none'}
              `}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading Animation */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-4 items-center bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
              <Loader2 className="animate-spin text-blue-400" size={18} />
              <span className="text-sm text-slate-400">Synthesizing response...</span>
            </div>
          </div>
        )}
        
        {/* Invisible anchor for scrolling */}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Input Section */}
      <div className="p-6 bg-slate-900/90 border-t border-slate-800 backdrop-blur-xl">
        <div className="flex gap-3 max-w-4xl mx-auto items-center">
          <div className="relative flex-1">
            <input
              className="w-full bg-slate-800 border border-slate-700 p-4 pr-12 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
              placeholder="Query document context..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
            />
            {/* Visual Indicator of Focus */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
            </div>
          </div>
          
          <button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Send size={22} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-600 mt-3 uppercase tracking-widest font-medium">
          Powered by Gemini 2.5 Flash • Vector Retrieval V2
        </p>
      </div>
    </div>
  );
}
