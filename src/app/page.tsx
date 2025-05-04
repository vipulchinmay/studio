// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { FileCompression } from '@/components/features/file-compression';
import { CompressionSuggestions } from '@/components/features/compression-suggestions';
import { Separator } from '@/components/ui/separator';
import type { SuggestFilesForCompressionOutput } from '@/ai/flows/suggest-files-for-compression';
import { suggestFilesForCompression } from '@/ai/flows/suggest-files-for-compression';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [suggestions, setSuggestions] = useState<SuggestFilesForCompressionOutput>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false); // Start false, load on login/refresh
  const [error, setError] = useState<string | null>(null);
  const fileCompressionRef = useRef<{ addFilesByPath: (filePath: string, fileName: string) => void }>(null);
  const { toast } = useToast();

  // --- Simulated Authentication State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userImage, setUserImage] = useState<string | undefined>(undefined);

  const handleLogin = useCallback((provider: 'google' | 'apple') => {
    console.log(`Simulating login with ${provider}...`);
    // Simulate successful login
    setIsLoggedIn(true);
    setUserName(provider === 'google' ? 'Demo User' : 'Apple User');
    setUserImage(provider === 'google' ? 'https://picsum.photos/seed/g-user/40/40' : 'https://picsum.photos/seed/a-user/40/40');
    toast({ title: "Login Successful", description: `Welcome, ${userName || 'User'}!` });
    // Fetch suggestions after login
    fetchSuggestions();
  }, [userName]); // Include userName to update toast message

  const handleLogout = useCallback(() => {
    console.log('Simulating logout...');
    setIsLoggedIn(false);
    setUserName(undefined);
    setUserImage(undefined);
    setSuggestions([]); // Clear suggestions on logout
    setIsLoadingSuggestions(false); // Reset loading state
    setError(null); // Clear errors
    toast({ title: "Logged Out", description: "You have been logged out." });
  }, []);
  // --- End Simulated Authentication ---


  const fetchSuggestions = useCallback(async () => {
    if (!isLoggedIn) {
        setError("Please log in to fetch suggestions.");
        setIsLoadingSuggestions(false); // Ensure loading stops if not logged in
        return;
    }
    setIsLoadingSuggestions(true);
    setError(null);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1200));
       // *** In a real app, fetch actual files via cloud provider APIs ***
       // For now, use the existing mock function or a more diverse set
       const dummyFiles: SuggestFilesForCompressionOutput = [
           { name: 'Vacation Photo Album.zip', size: 150 * 1024 * 1024, type: 'archive/zip', path: '/cloud/docs/Vacation Photo Album.zip', compressionRecommendation: 'Large archive, good candidate for optimization.' },
           { name: 'Project Presentation Final FINAL.pptx', size: 80 * 1024 * 1024, type: 'presentation', path: '/cloud/work/Project Presentation Final FINAL.pptx', compressionRecommendation: 'Large presentation, images might be compressible.' },
           { name: 'IMG_9876.heic', size: 8 * 1024 * 1024, type: 'image/heic', path: '/cloud/photos/DCIM/IMG_9876.heic', compressionRecommendation: 'HEIC image, potential for lossless optimization.' },
           { name: 'meeting_recording_long.mp4', size: 550 * 1024 * 1024, type: 'video/mp4', path: '/cloud/recordings/meeting_recording_long.mp4', compressionRecommendation: 'Very large video file, consider compression.' },
           { name: 'backup-log-2024-01.txt', size: 5 * 1024 * 1024, type: 'text/plain', path: '/cloud/logs/backup-log-2024-01.txt', compressionRecommendation: 'Large text file, highly compressible.' },
       ];
       // const result = await suggestFilesForCompression({});
       const result = dummyFiles;

      setSuggestions(result);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Failed to fetch file compression suggestions. Please check your connection or cloud provider access.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [isLoggedIn]); // Depend on isLoggedIn

  // Initial fetch effect only runs if logged in (simulated)
  useEffect(() => {
      // No initial fetch unless logged in state changes from false to true, handled by handleLogin
      // If you want to check on load if already logged in (e.g., via cookie), do it here.
  }, []);


  const handleCompressRequest = useCallback((filePath: string, fileName: string) => {
    // This function simulates adding a file *as if* it were selected locally
    // It needs access to the FileCompression component's internal logic
    // We use a ref to call a method exposed by FileCompression
    console.log("page.tsx received compress request for:", filePath);

    // In a real scenario, you'd fetch the file from the cloud using filePath
    // and then create a File object or Blob to pass to the compression component.
    // For simulation, we'll create a dummy file.
    const dummyFile = new File([`Simulated content for ${fileName}`], fileName, {
        type: 'application/octet-stream', // Adjust type based on actual file if known
        lastModified: Date.now(),
    });

     const dummySelectedFile = {
        id: `${fileName}-cloud-${Date.now()}`,
        file: dummyFile,
        status: 'pending' as const, // Type assertion
        progress: 0,
        originalSize: suggestions.find(s => s.path === filePath)?.size ?? 1024 * 1024, // Use suggestion size or default
     };

    // Need to update FileCompression's state directly or via a method
     // This part requires modifying FileCompression to accept adding files programmatically.
     // Let's assume FileCompression exposes an `addFiles` method via the ref.
     // We will need to modify FileCompression to expose this via useImperativeHandle

     // For now, log the intent:
     console.log("Attempting to add cloud file to compression queue:", dummySelectedFile);
     toast({
         title: "Adding Cloud File",
         description: `${fileName} added to the compression list below.`
     });
     // TODO: Implement the actual adding mechanism in FileCompression and call it here.
     // fileCompressionRef.current?.addFiles([dummyFile]); // Ideal scenario after refactoring FileCompression

  }, [suggestions, toast]);


  return (
    <MainLayout
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        userName={userName}
        userImage={userImage}
    >
      <div className="space-y-10">
        {/* File Compression Section (Local Files) */}
        <section className="space-y-4 p-6 bg-card rounded-lg shadow">
          <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">Local File Compression</h1>
          <p className="text-muted-foreground">
            Select files from your device to compress. Choose your desired compression level for optimal results.
          </p>
          {/* Pass ref and potentially addFiles prop/method */}
          <FileCompression /* ref={fileCompressionRef} */ />
        </section>

        <Separator />

         {/* Compression Suggestions Section (Cloud Files) */}
        <section className="space-y-4 p-6 bg-card rounded-lg shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">Cloud File Suggestions</h2>
                <p className="text-muted-foreground mt-1">
                  {isLoggedIn
                    ? "Our AI has analyzed your connected cloud storage and suggests compressing these files."
                    : "Log in to connect your cloud storage and get AI-powered compression suggestions."}
                </p>
            </div>
            {isLoggedIn && (
                <Button
                    onClick={fetchSuggestions}
                    disabled={isLoadingSuggestions}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    >
                    {isLoadingSuggestions ? (
                        <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refreshing... </>
                    ) : (
                         <> <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Suggestions </>
                     )}
                </Button>
             )}
          </div>

           {error && !isLoadingSuggestions && ( // Show error only if not loading
            <Alert variant="destructive" className="mt-4">
                 <AlertCircle className="h-4 w-4"/>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoadingSuggestions ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-foreground">Fetching Suggestions...</p>
              <p className="text-muted-foreground">Analyzing your cloud files. This might take a moment.</p>
            </div>
          ) : (
            // Pass the callback function and login status
            <CompressionSuggestions
                suggestions={suggestions}
                onCompressRequest={handleCompressRequest}
                isLoggedIn={isLoggedIn}
            />
          )}
        </section>
      </div>
    </MainLayout>
  );
}
