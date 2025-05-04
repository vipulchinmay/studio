//analyze-compression-quality.ts
'use server';

/**
 * @fileOverview Analyzes file compression quality and suggests files for compression.
 *
 * - analyzeCompressionQuality - A function that analyzes a file and determines if it can be compressed without significant quality loss.
 * - AnalyzeCompressionQualityInput - The input type for the analyzeCompressionQuality function, including file path.
 * - AnalyzeCompressionQualityOutput - The return type for the analyzeCompressionQuality function, indicating if compression is recommended.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {getFile, FileInfo} from '@/services/file-system';

const AnalyzeCompressionQualityInputSchema = z.object({
  filePath: z.string().describe('The path to the file to analyze.'),
});
export type AnalyzeCompressionQualityInput = z.infer<
  typeof AnalyzeCompressionQualityInputSchema
>;

const AnalyzeCompressionQualityOutputSchema = z.object({
  shouldCompress: z
    .boolean()
    .describe(
      'Whether the file can be compressed without significant quality loss.'
    ),
  compressionRatio: z
    .number()
    .optional()
    .describe('The estimated compression ratio if compressed.'),
  qualityLossDescription: z
    .string()
    .optional()
    .describe('Description of the quality loss after compression'),
});
export type AnalyzeCompressionQualityOutput = z.infer<
  typeof AnalyzeCompressionQualityOutputSchema
>;

export async function analyzeCompressionQuality(
  input: AnalyzeCompressionQualityInput
): Promise<AnalyzeCompressionQualityOutput> {
  return analyzeCompressionQualityFlow(input);
}

const analyzeCompressionQualityPrompt = ai.definePrompt({
  name: 'analyzeCompressionQualityPrompt',
  input: {
    schema: z.object({
      fileInfo: z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
        path: z.string(),
      }),
    }),
  },
  output: {
    schema: z.object({
      shouldCompress: z
        .boolean()
        .describe(
          'Whether the file can be compressed without significant quality loss.'
        ),
      compressionRatio: z
        .number()
        .optional()
        .describe('The estimated compression ratio if compressed.'),
      qualityLossDescription: z
        .string()
        .optional()
        .describe('Description of the quality loss after compression'),
    }),
  },
  prompt: `You are an AI assistant that analyzes files and determines if they can be compressed without significant quality loss.\n\nYou are given the following information about the file:\nName: {{{fileInfo.name}}}\nSize: {{{fileInfo.size}}} bytes\nType: {{{fileInfo.type}}}\nPath: {{{fileInfo.path}}}\n\nBased on this information, determine if the file can be compressed without significant quality loss. Consider the file type and size when making your decision. If the file is already highly compressed (e.g., a JPEG image), it may not be possible to compress it further without significant quality loss. If the file is large and of a type that can be compressed (e.g. uncompressed image or audio), then it is a good candidate for compression.\n\nReturn a JSON object with the following properties:\n- shouldCompress: true if the file can be compressed without significant quality loss, false otherwise.\n- compressionRatio: The estimated compression ratio if compressed (e.g., 0.5 for 50% reduction in size).  If shouldCompress is false, this can be null.\n- qualityLossDescription: A brief description of the expected quality loss after compression. If shouldCompress is false, this can be null.
\nExample:\n{\n  "shouldCompress": true,\n  "compressionRatio": 0.6,\n  "qualityLossDescription": "Slight reduction in image quality, but still acceptable for most uses."
}\n`,
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
    const fileInfo: FileInfo | null = await getFile(input.filePath);

    if (!fileInfo) {
      throw new Error(`File not found at path: ${input.filePath}`);
    }

    const {output} = await analyzeCompressionQualityPrompt({
      fileInfo: fileInfo,
    });

    return output!;
  }
);
