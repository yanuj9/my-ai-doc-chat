"use client";
import React from 'react';
import { MessageSquare, Plus, Trash2, Database } from 'lucide-react';

interface Chat {
  id: string;
  document_name: string;
}

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onNewChat: () => void;
}

export default function Sidebar({ chats, activeChatId, onSelectChat, onDeleteChat, onNewChat }: SidebarProps) {
  return (
    <div className="w-72 bg-[#020617] h-full flex flex-col border-r border-slate-800/50 transition-all">
      <button
        onClick={onNewChat}
        className="mx-4 mb-6 flex items-center justify-center gap-2 p-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-blue-900/20 active:scale-[0.98]"
      >
        <Plus size={20} />
        <span className="text-sm">New Analysis</span>
      </button>

      {/* Section Label */}
      <div className="px-6 mb-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Stored Repositories</p>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`
              group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200
              border-l-[3px] 
              ${activeChatId === chat.id
                ? 'border-blue-500 bg-blue-500/10 text-blue-50'
                : 'border-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200'}
            `}
          >
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <MessageSquare 
                size={16} 
                className={`shrink-0 transition-colors ${activeChatId === chat.id ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} 
              />
              <span className="truncate text-sm font-medium tracking-wide">
                {chat.document_name}
              </span>
            </div>

            {/* Delete Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all duration-200"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {chats.length === 0 && (
          <div className="py-10 text-center px-4">
            <p className="text-xs text-slate-600 italic">No documents indexed yet.</p>
          </div>
        )}
      </div>

      {/* Footer / User Area (Visual Polish) */}
      <div className="p-4 border-t border-slate-800/50 mt-auto">
        <div className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-xl border border-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
            JD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-slate-200 truncate">Analyst Mode</p>
            <p className="text-[10px] text-slate-500 truncate">Free Tier Tier</p>
          </div>
        </div>
      </div>
    </div>
  );
}