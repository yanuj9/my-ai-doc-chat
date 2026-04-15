// components/Sidebar.tsx
"use client";
import React from 'react';
import { MessageSquare, Plus, FileText } from 'lucide-react';

interface Chat {
  id: string;
  document_name: string;
}

export default function Sidebar({ chats, activeChatId, onSelectChat, onNewChat }: any) {
  return (
    <div className="w-64 bg-slate-900 h-screen text-white p-4 flex flex-col border-r border-slate-700">
      <button 
        onClick={onNewChat}
        className="flex items-center gap-2 w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition mb-6"
      >
        <Plus size={18} /> New Document
      </button>

      <div className="flex-1 overflow-y-auto space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Documents</h2>
        {chats.map((chat: Chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg text-sm transition text-left ${
              activeChatId === chat.id ? 'bg-slate-800 border border-slate-600' : 'hover:bg-slate-800'
            }`}
          >
            <FileText size={16} className="text-blue-400" />
            <span className="truncate">{chat.document_name}</span>
          </button>
        ))}
      </div>
      
      <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-500">
        AI Doc Assistant v1.0
      </div>
    </div>
  );
}