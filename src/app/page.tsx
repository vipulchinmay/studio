'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { FileCompression } from '@/components/features/file-compression';
import { CompressionSuggestions } from '@/components/features/compression-suggestions';
import { Separator } from '@/components/ui/separator';
import type { SuggestFilesForCompressionOutput } from '@/ai/flows/suggest-files-for-compression';
import { suggestFilesForCompression } from '@/ai/flows/suggest-files-for-compression';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [suggestions, setSuggestions] = useState<SuggestFilesForCompressionOutput>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    setError(null);
    try {
      const result = await suggestFilesForCompression({});
      setSuggestions(result);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Failed to fetch file compression suggestions. Please try again later.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <MainLayout>
      <div className="space-y-8">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">File Compression</h1>
          <p className="text-muted-foreground">
            Select files to compress. Choose your desired compression level for optimal results.
          </p>
          <FileCompression />
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Compression Suggestions</h2>
            <button onClick={fetchSuggestions} disabled={isLoadingSuggestions} className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoadingSuggestions ? 'Refreshing...' : 'Refresh Suggestions'}
            </button>
          </div>
          <p className="text-muted-foreground">
            Our AI has analyzed your files and suggests the following items for compression to save space.
          </p>
           {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {isLoadingSuggestions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading suggestions...</span>
            </div>
          ) : (
            <CompressionSuggestions suggestions={suggestions} />
          )}
        </section>
      </div>
    </MainLayout>
  );
}
