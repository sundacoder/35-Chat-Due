import { TextChunk } from '../types';

/**
 * A simple in-memory vector store.
 * In a production app, this would be Pinecone, Supabase pgvector, etc.
 */
class VectorStore {
  private chunks: TextChunk[] = [];

  public addChunks(chunks: TextChunk[]) {
    this.chunks = [...this.chunks, ...chunks];
  }

  public clear() {
    this.chunks = [];
  }

  public getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Calculates Cosine Similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Searches for the most similar chunks to the query vector
   */
  public search(queryVector: number[], topK: number = 5): TextChunk[] {
    if (this.chunks.length === 0) return [];
    
    // Calculate scores
    const scoredChunks = this.chunks.map(chunk => {
      if (!chunk.vector) return { chunk, score: -1 };
      return {
        chunk,
        score: this.cosineSimilarity(queryVector, chunk.vector)
      };
    });

    // Sort by score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    // Return top K
    return scoredChunks.slice(0, topK).map(item => item.chunk);
  }
}

export const vectorStore = new VectorStore();