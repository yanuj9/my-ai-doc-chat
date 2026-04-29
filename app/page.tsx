"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Upload, FileText, Loader2, PlusCircle } from 'lucide-react';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Internal Components
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import { supabase } from '@/lib/supabase';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function Home() {
  const { userId, isLoaded } = useAuth();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState("");

  // 1. Fetch user's existing documents on load
  useEffect(() => {
    if (!userId) return;

    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) setChats(data);
    };
    fetchChats();
  }, [userId]);

  const deleteChat = async (chatId: string) => {
    const confirmDelete = window.confirm("Permanently delete this document and all AI context?");
    if (!confirmDelete) return;

    try {
      // 1. Attempt the delete in the database FIRST
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      // 2. CHECK FOR ERROR IMMEDIATELY
      if (error) {
        console.error("Supabase rejected delete:", error.message);
        alert(`Delete failed: ${error.message}. Check your Supabase RLS policies.`);
        return; // EXIT HERE - do not remove from UI
      }

      // 3. ONLY update the UI if the database actually deleted the row
      setChats(prev => prev.filter(c => c.id !== chatId));

      if (activeChatId === chatId) {
        setActiveChatId(null);
      }

      console.log("✅ Database and UI synced. Chat removed.");

    } catch (err: any) {
      console.error("Critical Delete Error:", err);
      alert("An unexpected error occurred while deleting.");
    }
  };

  // 2. The Core PDF Processing Logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploading(true);
    setStatus("Initializing Engine...");

    try {
      // --- POLYFILL: Fixes the "undefined is not a function (readableStream)" error ---
      if (!(ReadableStream.prototype as any)[Symbol.asyncIterator]) {
        (ReadableStream.prototype as any)[Symbol.asyncIterator] = async function* () {
          const reader = this.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) return;
              yield value;
            }
          } finally {
            reader.releaseLock();
          }
        };
      }

      // Step A: Create the Chat Record in Supabase
      const { data: newChat, error: chatErr } = await supabase
        .from('chats')
        .insert({
          document_name: file.name,
          user_id: userId
        })
        .select()
        .single();

      if (chatErr) throw chatErr;

      // Step B: Lazy Load PDF.js (Switching to LEGACY build for stability)
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

      setStatus("Reading PDF File...");
      const arrayBuffer = await file.arrayBuffer();

      // Step C: Extract Text in the Browser
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
      });

      const pdf = await loadingTask.promise;
      setStatus(`Extracting ${pdf.numPages} pages...`);

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Safety Map: Ensure strings are joined correctly even if metadata is weird
        const pageText = content.items
          .map((item: any) => item.str || "")
          .join(" ");

        fullText += pageText + "\n";

        if (i % 20 === 0) setStatus(`Extracted ${i}/${pdf.numPages} pages...`);
      }

      // Step D: Chunk the text using LangChain
      setStatus("Splitting into AI-ready chunks...");
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });
      const chunks = await splitter.splitText(fullText);
      const totalBatches = Math.ceil(chunks.length / 10);
      setUploadProgress({ current: 0, total: totalBatches });

      // Step E: Batched Upload with Throttling
      setStatus("Uploading to Database...");
      for (let i = 0; i < chunks.length; i += 10) {
        const batch = chunks.slice(i, i + 10);
        const batchNum = i / 10 + 1;
        setUploadProgress({ current: batchNum, total: totalBatches });

        const response = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunks: batch, chatId: newChat.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Batch upload failed");
        }

        if (i + 10 < chunks.length) await delay(2000);
      }

      setChats([newChat, ...chats]);
      setActiveChatId(newChat.id);
      setStatus("Success!");
      alert("Document indexed successfully!");

    } catch (err: any) {
      console.error("Critical Upload Error:", err);
      setStatus("Upload Failed");
      alert(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  if (!isLoaded) return <div className="p-10 text-center">Loading Profile...</div>;

  return (
    <main className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#020617] text-slate-200">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onDeleteChat={deleteChat}
        onNewChat={() => setActiveChatId(null)}
      />

      <div className="flex-1 flex flex-col relative bg-[#0f172a]"> {/* Appealing Deep Blue-Slate */}
        {!activeChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            {/* Glassmorphism Upload Card */}

            <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl p-10 rounded-[2rem] border border-slate-800 shadow-2xl">
              <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
                <Upload size={40} />
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-3">Add to Your Library</h1>
              <p className="text-slate-400 mb-10 text-sm leading-relaxed">
                Turn your PDFs into a searchable knowledge base. Once uploaded, you can chat with your files to extract facts and summaries.
              </p>

              <label className={`
              flex items-center justify-center gap-3 w-full p-5 rounded-2xl font-bold transition-all cursor-pointer
              ${isUploading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-900/20'}
            `}>
                {isUploading ? <Loader2 className="animate-spin" size={24} /> : <PlusCircle size={24} />}
                <span>{isUploading ? status : "Select PDF to Start"}</span>
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