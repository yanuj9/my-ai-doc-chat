import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

// Use Service Role Key for backend bypass of RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { chunks, chatId } = await req.json();

    if (!chunks || !chatId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    // 1. Generate Embeddings for the batch
    const { embeddings } = await model.batchEmbedContents({
      requests: chunks.map((text: string) => ({
        content: { role: "user", parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT" as any,
      })),
    });

    // 2. Prepare data for Supabase
    const rows = chunks.map((content: string, i: number) => ({
      chat_id: chatId,
      content: content,
      embedding: embeddings[i].values,
    }));

    // 3. Insert into Database
    const { error } = await supabaseAdmin
      .from('document_sections')
      .insert(rows);

    if (error) {
      console.error("❌ Supabase Insert Error:", error.message);
      throw error;
    }

    console.log(`✅ Successfully indexed ${chunks.length} chunks for chat ${chatId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ Ingest API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}