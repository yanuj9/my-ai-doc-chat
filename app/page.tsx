// app/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch chats on mount (Mock user_id for now, link to Auth later)
  useEffect(() => {
    const fetchChats = async () => {
      const { data } = await supabase.from('chats').select('*').order('created_at', { ascending: false });
      if (data) setChats(data);
    };
    fetchChats();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Create a record in 'chats' table
      const { data: newChat } = await supabase.from('chats').insert({
        document_name: file.name,
        user_id: "temp_user_123" // Replace with Clerk's userId later
      }).select().single();

      // 2. Send to Ingestion API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', newChat.id);

      await fetch('/api/ingest', { method: 'POST', body: formData });
      
      setChats([newChat, ...chats]);
      setActiveChatId(newChat.id);
    } catch (err) {
      alert("Upload failed. For 500-page docs, ensure your server timeout is sufficient.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex h-screen overflow-hidden">
      <Sidebar 
        chats={chats} 
        activeChatId={activeChatId} 
        onSelectChat={setActiveChatId}
        onNewChat={() => setActiveChatId(null)}
      />

      <div className="flex-1 flex flex-col">
        {!activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-50">
            <div className="max-w-md w-full p-8 border-2 border-dashed border-slate-300 rounded-3xl bg-white text-center">
              <Upload className="mx-auto mb-4 text-slate-400" size={48} />
              <h1 className="text-xl font-bold mb-2">Upload your Document</h1>
              <p className="text-slate-500 text-sm mb-6">PDF files up to 500 pages are supported for AI analysis.</p>
              
              <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2">
                {isUploading ? <Loader2 className="animate-spin" /> : <FileText size={18} />}
                {isUploading ? "Processing Chunks..." : "Select PDF"}
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            </div>
          </div>
        ) : (
          <ChatWindow chatId={activeChatId} />
        )}
      </div>
    </main>
  );
}