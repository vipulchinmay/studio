'use server';
/**
 * @fileOverview This file contains a Genkit flow that suggests files for compression based on their size and usage patterns.
 *
 * - suggestFilesForCompression - A function that suggests files for compression.
 * - SuggestFilesForCompressionInput - The input type for the suggestFilesForCompression function.
 * - SuggestFilesForCompressionOutput - The return type for the suggestFilesForCompression function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {FileInfo, getFiles} from '@/services/file-system';

const SuggestFilesForCompressionInputSchema = z.object({
  // No input needed, the flow will fetch the files.
});

export type SuggestFilesForCompressionInput = z.infer<
  typeof SuggestFilesForCompressionInputSchema
>;

const SuggestFilesForCompressionOutputSchema = z.array(
  z.object({
    name: z.string().describe('The name of the file.'),
    size: z.number().describe('The size of the file in bytes.'),
    type: z.string().describe('The type of the file (e.g., image, audio, video).'),
    path: z.string().describe('The path of the file.'),
    compressionRecommendation: z
      .string()      
      .describe(
        'The reason why the file is recommended for compression, mentioning size and type.'
      ),
  })
);

export type SuggestFilesForCompressionOutput = z.infer<
  typeof SuggestFilesForCompressionOutputSchema
>;

export async function suggestFilesForCompression(
  input: SuggestFilesForCompressionInput
): Promise<SuggestFilesForCompressionOutput> {
  return suggestFilesForCompressionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFilesForCompressionPrompt',
  input: {
    schema: z.object({
      files: z.array(
        z.object({
          name: z.string().describe('The name of the file.'),
          size: z.number().describe('The size of the file in bytes.'),
          type: z.string().describe('The type of the file (e.g., image, audio, video).'),
          path: z.string().describe('The path of the file.'),
        })
      ),
    }),
  },
  output: {
    schema: z.array(
      z.object({
        name: z.string().describe('The name of the file.'),
        size: z.number().describe('The size of the file in bytes.'),
        type: z.string().describe('The type of the file (e.g., image, audio, video).'),
        path: z.string().describe('The path of the file.'),
        compressionRecommendation: z
          .string()
          .describe(
            'The reason why the file is recommended for compression, mentioning size and type.'
          ),
      })
    ),
  },
  prompt: `You are an AI assistant designed to analyze a user's files and suggest which ones could benefit from compression.

Given the following list of files, identify those that are large in size or of a type that commonly benefits from compression (images, audio, video).
Explain why each file is a good candidate for compression.

Files:
{{#each files}}
- Name: {{name}}, Size: {{size}} bytes, Type: {{type}}, Path: {{path}}
{{/each}}

Suggest the files which should be compressed and give a short reason why compression is recommended for each.
Ensure that the output contains all the file details.

Format your output as a JSON array of objects, where each object represents a file and contains the file's name, size, type, path, and a compressionRecommendation.
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
  async () => {
    const files: FileInfo[] = await getFiles();
    const {output} = await prompt({files});
    return output!;
  }
);
