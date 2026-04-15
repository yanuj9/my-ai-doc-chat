// components/ChatWindow.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon } from 'lucide-react';

export default function ChatWindow({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: input, chatId }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "model", content: data.text }]);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${
              m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-800'
            }`}>
              {m.role === 'model' ? <Bot size={20} /> : <UserIcon size={20} />}
              <p className="text-sm leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {isLoading && <div className="text-xs text-slate-400 italic">Gemini is thinking...</div>}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask anything about the document..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}