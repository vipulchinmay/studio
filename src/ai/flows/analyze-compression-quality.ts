//analyze-compression-quality.ts
'use server';

/**
 * @fileOverview Analyzes file compression quality and potential.
 *
 * - analyzeCompressionQuality - A function that analyzes a file and determines its potential for compression and expected quality impact.
 * - AnalyzeCompressionQualityInput - The input type for the analyzeCompressionQuality function, including file path.
 * - AnalyzeCompressionQualityOutput - The return type for the analyzeCompressionQuality function, indicating if compression is recommended and details.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {getFile, FileInfo} from '@/services/file-system';

const AnalyzeCompressionQualityInputSchema = z.object({
  filePath: z.string().describe('The path or identifier of the file to analyze.'),
});
export type AnalyzeCompressionQualityInput = z.infer<
  typeof AnalyzeCompressionQualityInputSchema
>;

const AnalyzeCompressionQualityOutputSchema = z.object({
  shouldCompress: z
    .boolean()
    .describe(
      'Whether any form of compression (lossless or lossy) is likely to yield meaningful size reduction.'
    ),
   recommendedMethod: z.enum(['lossless_optimized', 'lossy_high_quality', 'lossy_balanced', 'none'])
       .describe("The recommended compression approach ('lossless_optimized' if possible without significant size increase, 'lossy_high_quality' for minimal visual/audible loss, 'lossy_balanced' for good reduction, 'none' if not beneficial)."),
  estimatedReductionPercent: z
    .number()
    .optional()
    .describe('Estimated percentage reduction in file size (e.g., 50 for 50% reduction). Null if shouldCompress is false or estimation is unreliable.'),
  qualityImpactDescription: z
    .string()
    .describe('A brief description of the expected quality impact based on the recommended method (e.g., "No quality loss", "Visually indistinguishable", "Minor artifacts possible", "Not applicable").'),
});

export type AnalyzeCompressionQualityOutput = z.infer<
  typeof AnalyzeCompressionQualityOutputSchema
>;

export async function analyzeCompressionQuality(
  input: AnalyzeCompressionQualityInput
): Promise<AnalyzeCompressionQualityOutput> {
    console.log(`analyzeCompressionQuality Flow: Received request for ${input.filePath}`);
  return analyzeCompressionQualityFlow(input);
}

const analyzeCompressionQualityPrompt = ai.definePrompt({
  name: 'analyzeCompressionQualityPrompt',
  input: {
    schema: z.object({
      fileInfo: z.object({
        name: z.string(),
        size: z.number(),
        type: z.string().describe('File type or MIME type (e.g., image/jpeg, video/mp4, text/plain, application/zip)'),
        path: z.string(),
      }),
    }),
  },
  output: {
    schema: AnalyzeCompressionQualityOutputSchema,
  },
  prompt: `You are an expert AI analyzing file compression potential and quality trade-offs.

Analyze the following file:
- Name: {{{fileInfo.name}}}
- Size: {{{fileInfo.size}}} bytes
- Type: {{{fileInfo.type}}}
- Path: {{{fileInfo.path}}}

Based on the file type and size, determine:
1.  **shouldCompress**: Is *any* form of compression likely to provide a meaningful size reduction (e.g., > 5-10%)? Consider if the file type is inherently uncompressed (like WAV, BMP, plain TXT) or typically already compressed (like JPG, MP3, MP4, ZIP). Even already compressed files might benefit from re-encoding or optimization.
2.  **recommendedMethod**: If compression is viable, what's the best approach?
    *   'lossless_optimized': If lossless methods (like PNG optimization, FLAC, ZIP DEFLATE) can significantly reduce size without *any* data loss. Prioritize this for text, code, archives, and some image types like PNGs if optimization is possible.
    *   'lossy_high_quality': If lossy compression (like high-quality JPEG, AAC, modern video codecs) can offer good size reduction with minimal, often imperceptible, quality loss. Suitable for photos, most audio/video for general use.
    *   'lossy_balanced': If more aggressive lossy compression is needed for maximum size reduction, accepting some noticeable quality difference. Suitable when space is critical.
    *   'none': If compression is unlikely to be effective or could increase size (e.g., re-compressing a highly optimized JPEG, compressing random data).
3.  **estimatedReductionPercent**: Estimate the potential size reduction as a percentage (0-100) for the *recommendedMethod*. Be realistic. Lossless might be 10-50% for suitable types, lossy_high_quality 30-70%, lossy_balanced 50-90%. Return null if 'none' is recommended or estimation is unreliable.
4.  **qualityImpactDescription**: Describe the expected quality outcome for the *recommendedMethod* concisely (e.g., "No quality loss", "Visually identical", "Minor quality reduction", "Noticeable compression artifacts likely", "Not applicable").

**Examples:**
*   A large PNG image: { shouldCompress: true, recommendedMethod: 'lossless_optimized', estimatedReductionPercent: 30, qualityImpactDescription: "No quality loss, optimized PNG." }
*   A large WAV audio file: { shouldCompress: true, recommendedMethod: 'lossless_optimized', estimatedReductionPercent: 50, qualityImpactDescription: "No quality loss (using FLAC)." } or { shouldCompress: true, recommendedMethod: 'lossy_high_quality', estimatedReductionPercent: 80, qualityImpactDescription: "Near-transparent quality (using AAC/Opus)." } (Provide the better option based on typical use case - likely lossy for general audio).
*   A typical JPEG photo: { shouldCompress: true, recommendedMethod: 'lossy_high_quality', estimatedReductionPercent: 15, qualityImpactDescription: "Visually identical (re-optimized JPEG)." } OR { shouldCompress: false, recommendedMethod: 'none', estimatedReductionPercent: null, qualityImpactDescription: "Already efficiently compressed." }
*   A large text file: { shouldCompress: true, recommendedMethod: 'lossless_optimized', estimatedReductionPercent: 75, qualityImpactDescription: "No quality loss (using Gzip/Deflate)." }
*   A ZIP file: { shouldCompress: false, recommendedMethod: 'none', estimatedReductionPercent: null, qualityImpactDescription: "Archive contents already compressed." } (Unless known to contain uncompressed data).

Return ONLY the JSON object matching the output schema.
`,
})

const analyzeCompressionQualityFlow = ai.defineFlow<
  typeof AnalyzeCompressionQualityInputSchema,
  typeof AnalyzeCompressionQualityOutputSchema
>(
  {
    name: 'analyzeCompressionQualityFlow',
    inputSchema: AnalyzeCompressionQualityInputSchema,
    outputSchema: AnalyzeCompressionQualityOutputSchema,
  },
  async input => {
     console.log(`Flow: Getting file info for ${input.filePath}`);
    // In a real app, getFile might need auth tokens if accessing cloud files
    const fileInfo: FileInfo | null = await getFile(input.filePath);

    if (!fileInfo) {
      console.error(`Flow: File not found at path: ${input.filePath}`);
      throw new Error(`File not found at path: ${input.filePath}`);
    }
     console.log(`Flow: File info received: ${fileInfo.name}, ${fileInfo.size} bytes, ${fileInfo.type}`);

     console.log("Flow: Sending file info to prompt for analysis...");
    const {output} = await analyzeCompressionQualityPrompt({
      fileInfo: fileInfo,
    });

     if (!output) {
        console.error("Flow: Prompt returned no output for analysis.");
        throw new Error("Failed to get compression analysis from AI.");
    }

     console.log("Flow: Analysis received:", output);
    return output;
  }
);
