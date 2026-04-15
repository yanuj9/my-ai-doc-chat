import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { supabase } from '@/lib/supabase';
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Get Authenticated User
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, chatId } = await req.json();

    // 2. OWNERSHIP VERIFICATION
    const { data: chat, error: verifyError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (verifyError || !chat) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-005" });
    
    // 3. Generate Embedding
    const result = await embedModel.embedContent({
      content: { role: "user", parts: [{ text: message }] },
      taskType: TaskType.RETRIEVAL_QUERY,
    });
    const queryVector = result.embedding.values;

    // 4. Search Supabase (The chatId is already verified now)
    const { data: chunks, error: searchError } = await supabase.rpc('match_document_sections', {
      query_embedding: queryVector,
      match_threshold: 0.3,
      match_count: 5,
      filter_chat_id: chatId
    });

    if (searchError) throw searchError;

    // 5. Build Context and Ask Gemini
    const contextText = chunks?.map((c: any) => c.content).join("\n\n---\n\n") || "No relevant context found.";
    const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are an AI assistant helping a user with a document. 
      Use the following retrieved sections to answer the question. 
      If the answer isn't in the context, say you don't know.

      CONTEXT:
      ${contextText}

      USER QUESTION:
      ${message}
    `;

    const chatResult = await chatModel.generateContent(prompt);
    return NextResponse.json({ text: chatResult.response.text() });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}