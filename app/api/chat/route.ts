// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { message, chatId } = await req.json();

    // 1. Generate an embedding for the user's QUESTION
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await embeddingModel.embedContent(message);
    const embedding = result.embedding.values;

    // 2. SEARCH the database for the relevant chunks (The RPC call)
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.1, // Adjust based on how strict you want the match
      match_count: 5,        // Top 5 most relevant chunks
      p_chat_id: chatId,
    });

    if (error) throw error;

    // 3. Create the Context from the matching chunks
    const context = documents?.map((d: any) => d.content).join("\n---\n") ?? "";

    // 4. Send Context + Question to Gemini for the final answer
    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Answer the question based ONLY on the following context from a PDF document. 
      If the answer is not in the context, say "I couldn't find that in the document."
      
      CONTEXT:
      ${context}
      
      QUESTION: 
      ${message}
    `;

    const chatResult = await chatModel.generateContent(prompt);
    const responseText = chatResult.response.text();

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}