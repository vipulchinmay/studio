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
import {getFile, FileInfo} from '@/services/file-system'; // Assuming getFile exists

// Define Input Schema
const AnalyzeCompressionQualityInputSchema = z.object({
  filePath: z.string().describe('The path or identifier of the file to analyze.'),
   // Optional: Could add user preferences later, e.g., prioritize quality vs. size
});
export type AnalyzeCompressionQualityInput = z.infer<
  typeof AnalyzeCompressionQualityInputSchema
>;


// Define Output Schema - Updated based on requirements
const AnalyzeCompressionQualityOutputSchema = z.object({
  shouldCompress: z
    .boolean()
    .describe(
      'Whether any form of compression (lossless or lossy) is likely to yield meaningful size reduction (e.g., > 5-10%).'
    ),
   recommendedMethod: z.enum(['lossless_optimized', 'lossy_high_quality', 'lossy_balanced', 'none'])
       .describe("The recommended compression approach ('lossless_optimized' if lossless savings are significant, 'lossy_high_quality' for minimal perceptible loss, 'lossy_balanced' for good reduction accepting some loss, 'none' if not beneficial)."),
  estimatedReductionPercent: z
    .number()
    .min(0).max(100) // Ensure percentage is within range
    .optional() // Make it optional
    .describe('Estimated percentage reduction in file size (e.g., 50 for 50% reduction). Provided if shouldCompress is true and estimation is feasible.'),
  qualityImpactDescription: z
    .string()
    .describe('A concise description of the expected quality impact based on the recommended method (e.g., "No quality loss", "Visually indistinguishable", "Minor artifacts possible", "Noticeable loss likely", "Not applicable").'),
});

export type AnalyzeCompressionQualityOutput = z.infer<
  typeof AnalyzeCompressionQualityOutputSchema
>;


// Exported Function to Call the Flow
export async function analyzeCompressionQuality(
  input: AnalyzeCompressionQualityInput
): Promise<AnalyzeCompressionQualityOutput> {
    console.log(`[Flow Start] analyzeCompressionQuality: Received request for ${input.filePath}`);
    // Input validation could be added here if needed using the schema
    // try {
    //     AnalyzeCompressionQualityInputSchema.parse(input);
    // } catch (e) {
    //     console.error("[Flow Error] Invalid input:", e);
    //     throw new Error("Invalid input for compression analysis.");
    // }
    try {
        const result = await analyzeCompressionQualityFlow(input);
        console.log(`[Flow Success] analyzeCompressionQuality: Analysis complete for ${input.filePath}`);
        return result;
    } catch (error) {
        console.error(`[Flow Error] analyzeCompressionQuality: Failed for ${input.filePath}`, error);
        // Re-throw or return a specific error structure
        throw error;
    }
}

// Define the Prompt
const analyzeCompressionQualityPrompt = ai.definePrompt({
  name: 'analyzeCompressionQualityPrompt',
  // Define Input Schema for the Prompt (expects FileInfo)
  input: {
    schema: z.object({
      fileInfo: z.object({
        name: z.string(),
        size: z.number(),
        // More specific type description
        type: z.string().describe('File type or MIME type (e.g., image/jpeg, video/mp4, text/plain, application/zip, application/pdf, audio/wav)'),
        path: z.string(),
      }),
      // Optional: Could pass user preference context here if available
      // userPreference: z.enum(['quality', 'size', 'balanced']).optional(),
    }),
  },
  // Define Output Schema for the Prompt (matches the Flow's output)
  output: {
    schema: AnalyzeCompressionQualityOutputSchema,
  },
  // The Prompt Text - Updated for new schema and better guidance
  prompt: `You are an expert AI specializing in file compression analysis, balancing size reduction with quality preservation.

Analyze the following file based on its metadata:
- Name: {{{fileInfo.name}}}
- Size: {{{fileInfo.size}}} bytes
- Type: {{{fileInfo.type}}}
- Path: {{{fileInfo.path}}}

{{!-- Optional: Incorporate user preference if provided --}}
{{!-- {#if userPreference}}User Preference: Prioritize {{userPreference}}.{{/if}} --}}

Determine the optimal compression strategy and expected outcome. Provide your analysis as a JSON object matching this schema:
{
  "shouldCompress": boolean, // Is meaningful size reduction (> 5-10%) likely?
  "recommendedMethod": "'lossless_optimized' | 'lossy_high_quality' | 'lossy_balanced' | 'none'", // Best approach?
  "estimatedReductionPercent": number | null, // Estimated % size saved (0-100), null if none or unreliable.
  "qualityImpactDescription": string // Concise quality outcome description.
}

**Analysis Guidelines:**

1.  **shouldCompress**:
    *   Consider file type: Inherently uncompressed (WAV, BMP, TXT, RAW images) usually benefit greatly.
    *   Already compressed types (JPG, MP3, MP4, ZIP, DOCX) might offer *some* optimization potential (re-encoding, metadata stripping, internal image optimization), but often less dramatically. Set to \`false\` only if significant reduction is highly unlikely OR if recompression might *increase* size (e.g., heavily optimized JPEG, random data).
    *   Consider size: Very small files (< 50KB) often don't warrant the effort unless aggregating many.

2.  **recommendedMethod**:
    *   \`lossless_optimized\`: Prioritize if significant savings possible *without any data loss*. Best for text, code, logs, RAW images (if converting to lossless like optimized PNG/WebP lossless), archival (ZIP/Gzip on suitable content), PNG optimization. Aim for >10% reduction.
    *   \`lossy_high_quality\`: Use when lossless isn't efficient enough but perceptual quality must be maintained. Ideal for JPEGs (re-saving at high quality, e.g., 85-95), audio (AAC/Opus at ~128-192kbps), video (modern codecs like AV1/H.265 at high bitrate profiles). Target: Visible/audible indistinguishability.
    *   \`lossy_balanced\`: When space saving is more critical than perfect fidelity. Suitable for JPEGs (quality 70-85), audio (~96-128kbps), video (medium bitrate profiles). Target: Good reduction, minor artifacts potentially acceptable.
    *   \`none\`: If \`shouldCompress\` is false, or if compression is genuinely detrimental.

3.  **estimatedReductionPercent**:
    *   Be realistic based on type and method. Examples:
        *   Text (lossless): 60-90%
        *   PNG (lossless opt.): 10-50%
        *   WAV (to FLAC lossless): 40-60%
        *   WAV (to AAC high quality): 70-85%
        *   JPEG (lossy re-opt high): 5-25%
        *   JPEG (lossy balanced): 20-50%
        *   Large Video (lossy high): 30-60%
        *   Large Video (lossy balanced): 50-80%
    *   Return \`null\` if \`recommendedMethod\` is \`none\` or estimation is highly speculative.

4.  **qualityImpactDescription**: Match the method:
    *   \`lossless_optimized\`: "No quality loss", "Lossless optimization"
    *   \`lossy_high_quality\`: "Visually indistinguishable", "Near-transparent audio", "Excellent quality"
    *   \`lossy_balanced\`: "Minor artifacts possible", "Good quality, noticeable reduction", "Suitable for general use"
    *   \`none\`: "Not applicable", "Compression not recommended"

**Examples:**
*   Large 50MB PNG: { "shouldCompress": true, "recommendedMethod": "lossless_optimized", "estimatedReductionPercent": 40, "qualityImpactDescription": "No quality loss via PNG optimization." }
*   Large 100MB WAV: { "shouldCompress": true, "recommendedMethod": "lossy_high_quality", "estimatedReductionPercent": 80, "qualityImpactDescription": "Near-transparent audio quality (using AAC/Opus)." } (Assuming general use preference over pure lossless like FLAC)
*   Typical 5MB JPEG: { "shouldCompress": true, "recommendedMethod": "lossy_high_quality", "estimatedReductionPercent": 15, "qualityImpactDescription": "Visually indistinguishable (JPEG re-optimization)." }
*   Small 20KB JPEG: { "shouldCompress": false, "recommendedMethod": "none", "estimatedReductionPercent": null, "qualityImpactDescription": "Compression not recommended for small, already compressed file." }
*   Large 20MB TXT Log: { "shouldCompress": true, "recommendedMethod": "lossless_optimized", "estimatedReductionPercent": 85, "qualityImpactDescription": "No quality loss (using standard text compression like Gzip)." }
*   500MB ZIP Archive (contains mixed files): { "shouldCompress": true, "recommendedMethod": "lossless_optimized", "estimatedReductionPercent": 5, "qualityImpactDescription": "Minor optimization potential by re-compressing archive." } (Depends on content, could be higher if known uncompressed data inside)

Return ONLY the valid JSON object matching the output schema.
`,
})

// Define the Flow
const analyzeCompressionQualityFlow = ai.defineFlow<
  typeof AnalyzeCompressionQualityInputSchema,
  typeof AnalyzeCompressionQualityOutputSchema
>(
  {
    name: 'analyzeCompressionQualityFlow',
    inputSchema: AnalyzeCompressionQualityInputSchema,
    outputSchema: AnalyzeCompressionQualityOutputSchema,
  },
  async (input) => {
     console.log(`[Flow Step] Getting file info for: ${input.filePath}`);
     // Assume getFile is an async function that might throw if file not found
     // It should ideally fetch from the appropriate source (local/cloud)
     let fileInfo: FileInfo | null;
     try {
       // In a real app, getFile might need auth tokens etc.
        fileInfo = await getFile(input.filePath); // Use the service
     } catch (error) {
        console.error(`[Flow Error] Failed to get file info for ${input.filePath}`, error);
        throw new Error(`Could not retrieve file information for path: ${input.filePath}`);
     }


    if (!fileInfo) {
      console.error(`[Flow Error] File not found at path: ${input.filePath}`);
      // Throw a specific error or handle as needed
      throw new Error(`File not found at path: ${input.filePath}`);
    }
     console.log(`[Flow Step] File info received: Name=${fileInfo.name}, Size=${fileInfo.size}, Type=${fileInfo.type}`);

     console.log("[Flow Step] Sending file info to prompt for analysis...");
     try {
        const {output} = await analyzeCompressionQualityPrompt({
            fileInfo: fileInfo, // Pass the required structure
            // userPreference: 'balanced' // Example of passing optional context
        });

         if (!output) {
            console.error("[Flow Error] Prompt returned no output.");
            throw new Error("AI analysis did not return a result.");
        }

         // Optional: Validate the output against the schema again
         try {
             AnalyzeCompressionQualityOutputSchema.parse(output);
             console.log("[Flow Step] Analysis received and validated:", output);
             return output;
         } catch (validationError) {
             console.error("[Flow Error] AI output failed validation:", validationError);
             console.log("Problematic AI output:", output); // Log the raw output
             throw new Error("AI analysis returned an invalid format.");
         }

     } catch (promptError) {
        console.error(`[Flow Error] Prompt execution failed for ${input.filePath}`, promptError);
        throw new Error(`AI analysis failed: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`);
     }
  }
);
