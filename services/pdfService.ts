import { TextChunk } from '../types';

// We declare the global pdfjsLib available from the CDN script in index.html
declare global {
  const pdfjsLib: any;
}

export const extractTextFromPdf = async (
  file: File, 
  onProgress: (page: number, total: number) => void
): Promise<TextChunk[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const chunks: TextChunk[] = [];
    const totalPages = pdf.numPages;
    
    // Config for chunking
    const CHUNK_SIZE = 1000; // characters
    const OVERLAP = 200; // characters

    for (let i = 1; i <= totalPages; i++) {
      onProgress(i, totalPages);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' '); // Clean up whitespace

      // Create chunks from the page text
      let start = 0;
      while (start < pageText.length) {
        const end = Math.min(start + CHUNK_SIZE, pageText.length);
        const chunkText = pageText.slice(start, end);
        
        // Only keep chunks with meaningful content
        if (chunkText.length > 50) {
          chunks.push({
            id: `p${i}-${start}`,
            text: chunkText,
            pageNumber: i
          });
        }
        
        start += (CHUNK_SIZE - OVERLAP);
      }
    }

    return chunks;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};