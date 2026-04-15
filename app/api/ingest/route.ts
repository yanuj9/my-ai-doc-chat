import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'; 
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase';
import { auth } from "@clerk/nextjs/server";

const pdf = require('pdf-parse');

export async function POST(req: NextRequest) {
  try {
    // 1. Get Authenticated User
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string;

    if (!file || !chatId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // 2. OWNERSHIP VERIFICATION (The Security Check)
    const { data: chat, error: verifyError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', userId) // Critical: Ensure this user owns this chat
      .single();

    if (verifyError || !chat) {
      return NextResponse.json({ error: "Forbidden: You do not own this chat" }, { status: 403 });
    }

    // 3. Process PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdf(buffer);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const output = await splitter.createDocuments([data.text]);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // 4. Save Chunks
    for (const chunk of output) {
      const result = await model.embedContent(chunk.pageContent);
      const embedding = result.embedding.values;

      await supabase.from('document_sections').insert({
        chat_id: chatId,
        content: chunk.pageContent,
        embedding: embedding,
      });
    }

    return NextResponse.json({ message: "Ingestion complete!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
  }
}