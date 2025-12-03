import { GoogleGenAI } from "@google/genai";
import { TextChunk } from '../types';
import { vectorStore } from './vectorStore';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// The model used for embeddings
const EMBEDDING_MODEL = "text-embedding-004";

// The model used for chat/generation
const CHAT_MODEL = "gemini-2.5-flash";

/**
 * Embeds a single string with retry logic
 */
export const embedContent = async (
  text: string, 
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' = 'RETRIEVAL_QUERY',
  title?: string,
  retries = 3
): Promise<number[] | null> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Strictly structure the content as an object with parts
      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: {
          parts: [{ text: text }]
        },
        config: {
          taskType: taskType,
          title: taskType === 'RETRIEVAL_DOCUMENT' ? title : undefined
        }
      });

      return response.embeddings?.[0]?.values || null;
    } catch (e: any) {
      const isRateLimit = e.status === 429 || (e.response && e.response.status === 429);
      const isServerErr = e.status >= 500 || (e.response && e.response.status >= 500);

      if ((isRateLimit || isServerErr) && attempt < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Embedding error (attempt ${attempt + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error("Embedding error:", e);
      return null;
    }
  }
  return null;
};

/**
 * Generates embeddings for a list of text chunks
 */
export const generateEmbeddings = async (chunks: TextChunk[]): Promise<TextChunk[]> => {
  const chunksWithVectors: TextChunk[] = [];
  
  // Increased batch size for speed (text-embedding-004 has higher limits than generative models)
  const BATCH_SIZE = 10; 
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    // Create an array of promises for the current batch
    const promises = batch.map(async (chunk) => {
      // Add a small title context for the document embedding
      const vector = await embedContent(chunk.text, 'RETRIEVAL_DOCUMENT', `Page ${chunk.pageNumber}`);
      if (vector) {
        return { ...chunk, vector };
      }
      return chunk;
    });

    // Wait for all in batch to complete
    const results = await Promise.all(promises);
    chunksWithVectors.push(...results);
    
    // Minimal delay between batches
    if (i + BATCH_SIZE < chunks.length) {
       await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return chunksWithVectors;
};

/**
 * Generates an answer using RAG
 */
export const generateRAGResponse = async (
  question: string, 
  history: string
): Promise<string> => {
  
  // 1. Embed the user's question
  const queryVector = await embedContent(question, 'RETRIEVAL_QUERY');
  
  if (!queryVector) {
    console.error("Failed to generate embedding for query.");
    return "I'm sorry, I had trouble processing your question (Embedding Failed). Please try again.";
  }

  // 2. Retrieve relevant context
  const relevantChunks = vectorStore.search(queryVector, 5);
  
  // 3. Construct the prompt
  const contextText = relevantChunks.length > 0 
    ? relevantChunks.map(c => `[Page ${c.pageNumber}]: ${c.text}`).join('\n\n')
    : "No relevant context found in the document.";
  
  const prompt = `
    You are a helpful and intelligent assistant for the application '35 Chat'.
    Your goal is to answer the user's question strictly based on the provided PDF context.
    
    Rules:
    1. Use ONLY the information in the Context below to answer.
    2. If the answer is not in the Context, politely state that the document doesn't contain that information. Do not hallucinate.
    3. Cite the page numbers when possible (e.g., "According to page 3...").
    4. Keep the tone professional but conversational.

    Context:
    ${contextText}

    Chat History:
    ${history}

    User Question: 
    ${question}
  `;

  // 4. Generate content
  try {
    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        temperature: 0.3,
      }
    });
    
    return response.text || "No response generated.";
  } catch (e) {
    console.error("Generation error", e);
    return "I encountered an error while communicating with the AI model.";
  }
};