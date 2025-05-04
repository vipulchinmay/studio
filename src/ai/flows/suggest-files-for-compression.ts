// src/ai/flows/suggest-files-for-compression.ts
'use server';
/**
 * @fileOverview This file contains a Genkit flow that suggests files for compression based on their size, type, and potentially usage patterns or cloud storage context.
 *
 * - suggestFilesForCompression - A function that suggests files for compression.
 * - SuggestFilesForCompressionInput - The input type for the suggestFilesForCompression function (currently none, fetches files internally).
 * - SuggestFilesForCompressionOutput - The return type for the suggestFilesForCompression function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {FileInfo, getFiles} from '@/services/file-system';

const SuggestFilesForCompressionInputSchema = z.object({
  // Optional: Could add parameters like `minSize` or `fileTypes` in the future.
  // Optional: Could include `cloudProviderToken` or similar if accessing cloud storage.
});

export type SuggestFilesForCompressionInput = z.infer<
  typeof SuggestFilesForCompressionInputSchema
>;

// Refine Schema Descriptions
const FileSuggestionSchema = z.object({
    name: z.string().describe('The full name of the file, including extension.'),
    size: z.number().describe('The size of the file in bytes.'),
    type: z.string().describe('The inferred type or MIME type of the file (e.g., image/jpeg, video/mp4, document/pdf, archive/zip).'),
    path: z.string().describe('The unique path or identifier for the file (e.g., /cloud/photos/IMG_1234.jpg, /local/docs/report.docx).'),
    compressionRecommendation: z
      .string()
      .describe(
        'A concise explanation why compression is recommended, focusing on size, type, and potential space savings (e.g., "Large video file, good candidate.", "Archive likely contains compressible data.", "Image format allows for optimization.").'
      ),
  });

const SuggestFilesForCompressionOutputSchema = z.array(FileSuggestionSchema)
  .describe('An array of files recommended for compression.');


export type SuggestFilesForCompressionOutput = z.infer<
  typeof SuggestFilesForCompressionOutputSchema
>;

export async function suggestFilesForCompression(
  input?: SuggestFilesForCompressionInput // Input is optional
): Promise<SuggestFilesForCompressionOutput> {
  // Add input if it's used later
  return suggestFilesForCompressionFlow(input || {});
}

const prompt = ai.definePrompt({
  name: 'suggestFilesForCompressionPrompt',
  input: {
    schema: z.object({
      files: z.array(
        z.object({
          name: z.string().describe('File name.'),
          size: z.number().describe('Size in bytes.'),
          type: z.string().describe('File type/MIME type.'),
          path: z.string().describe('File path/identifier.'),
          // Optional: could add lastModified, accessFrequency if available
        })
      ).describe('List of files available to the user (potentially from cloud storage or local).'),
       // Optional context about where the files came from
       sourceContext: z.string().optional().describe("Information about the source of the files (e.g., 'Google Drive Scan', 'Local Scan', 'iCloud Photos')"),
    }),
  },
  output: {
    schema: SuggestFilesForCompressionOutputSchema, // Use the refined schema
  },
  prompt: `You are an AI assistant specializing in storage optimization. Your task is to analyze a list of files and identify the best candidates for compression to save storage space.

Consider the following factors for each file:
1.  **Size:** Prioritize larger files (e.g., over 50MB, but also consider moderately large files like 5-10MB images).
2.  **Type:** Focus on types known to be compressible or optimizable:
    *   Uncompressed or losslessly compressed images (PNG, TIFF, BMP)
    *   Videos (MP4, MOV, AVI) - even compressed ones can often be further optimized.
    *   Audio (WAV, AIFF)
    *   Documents with embedded large images (PDF, DOCX, PPTX)
    *   Archives (ZIP, TAR) - contents might be compressible.
    *   Log files, text files (TXT, LOG, CSV)
3.  **Avoid:** Files that are likely already heavily compressed and where further lossy compression would degrade quality significantly (e.g., highly optimized JPEGs, MP3s, already compressed video streams). Lossless optimization might still be possible.

{{#if sourceContext}}
File Source Context: {{sourceContext}}
{{/if}}

Analyze the following files:
{{#each files}}
- Name: {{name}}
  Size: {{size}} bytes
  Type: {{type}}
  Path: {{path}}
{{/each}}

Based on the analysis, return a JSON array containing only the files recommended for compression. For each recommended file, include its name, size, type, path, and a *concise* 'compressionRecommendation' explaining *why* it's a good candidate (e.g., "Large video file", "Unoptimized PNG image", "Large text log", "Archive potentially compressible"). Aim for recommendations under 15 words.
`,
});

const suggestFilesForCompressionFlow = ai.defineFlow<
  typeof SuggestFilesForCompressionInputSchema,
  typeof SuggestFilesForCompressionOutputSchema
>(
  {
    name: 'suggestFilesForCompressionFlow',
    inputSchema: SuggestFilesForCompressionInputSchema,
    outputSchema: SuggestFilesForCompressionOutputSchema,
  },
  async (input) => {
    // Fetch files using the service - this service needs to be adapted
    // to potentially fetch from cloud storage based on authentication state.
    console.log("Flow: Fetching files from service...");
    const files: FileInfo[] = await getFiles(); // This currently returns mock data

    console.log(`Flow: Received ${files.length} files. Sending to prompt.`);

     // Determine source context (placeholder)
     // In a real app, this would depend on where getFiles fetched from.
     const sourceContext = files[0]?.path.includes('/cloud/') ? 'Cloud Storage Scan' : 'Local/Mixed Scan';

    const {output} = await prompt({files, sourceContext});

    if (!output) {
        console.error("Flow: Prompt returned no output.");
        throw new Error("Failed to get compression suggestions from AI.");
    }

    console.log(`Flow: Prompt returned ${output.length} suggestions.`);
    return output;
  }
);
