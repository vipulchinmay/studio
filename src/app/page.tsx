// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { FileCompression } from '@/components/features/file-compression';
import { CompressionSuggestions } from '@/components/features/compression-suggestions';
import { Separator } from '@/components/ui/separator';
import type { SuggestFilesForCompressionOutput } from '@/ai/flows/suggest-files-for-compression';
// Remove suggestFilesForCompression import if not calling directly
// import { suggestFilesForCompression } from '@/ai/flows/suggest-files-for-compression';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCcw, AlertCircle } from 'lucide-react'; // Added AlertCircle
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button'; // Added Button import

// Define the type for the ref handle exposed by FileCompression
export interface FileCompressionHandle {
  addFileToLocalQueue: (file: File, sourceInfo?: { path: string; originalSize: number }) => void;
}

// Define dummy data at module level or fetch appropriately
const dummySuggestions: SuggestFilesForCompressionOutput = [
   { name: 'Holiday Snaps Archive.zip', size: 180 * 1024 * 1024, type: 'archive/zip', path: '/cloud/docs/Holiday Snaps Archive.zip', compressionRecommendation: 'Large archive, optimization recommended.' },
   { name: 'Quarterly Business Review.pptx', size: 95 * 1024 * 1024, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', path: '/cloud/work/Quarterly Business Review.pptx', compressionRecommendation: 'Large presentation with images.' },
   { name: 'IMG_1024.heic', size: 9 * 1024 * 1024, type: 'image/heic', path: '/cloud/photos/DCIM/IMG_1024.heic', compressionRecommendation: 'HEIC image, lossless optimization.' },
   { name: 'Full Team Meeting Recording.mp4', size: 680 * 1024 * 1024, type: 'video/mp4', path: '/cloud/recordings/Full Team Meeting Recording.mp4', compressionRecommendation: 'Very large video file.' },
   { name: 'server_access_log_2024-Q1.log', size: 25 * 1024 * 1024, type: 'text/plain', path: '/cloud/logs/server_access_log_2024-Q1.log', compressionRecommendation: 'Large text log, highly compressible.' },
   { name: 'Website Backup_Full.tar.gz', size: 450 * 1024 * 1024, type: 'application/gzip', path: '/cloud/backups/Website Backup_Full.tar.gz', compressionRecommendation: 'Large compressed archive, re-assess.' },
   { name: ' scanned_document_receipts.pdf', size: 2 * 1024 * 1024, type: 'application/pdf', path: '/cloud/scans/scanned_document_receipts.pdf', compressionRecommendation: 'Scanned PDF, OCR & optimization.' },

];

export default function Home() {
  const [suggestions, setSuggestions] = useState<SuggestFilesForCompressionOutput>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileCompressionRef = useRef<FileCompressionHandle>(null); // Use the defined handle type
  const { toast } = useToast();

  // --- Simulated Authentication State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Start logged out
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userImage, setUserImage] = useState<string | undefined>(undefined);

   const handleLogin = useCallback((provider: 'google' | 'apple') => {
      console.log(`Simulating login with ${provider}...`);
      setIsLoggedIn(true);
      const name = provider === 'google' ? 'Demo User' : 'Apple User';
      setUserName(name);
      setUserImage(provider === 'google' ? 'https://picsum.photos/seed/g-user/40/40' : 'https://picsum.photos/seed/a-user/40/40');
      toast({ title: "Login Successful", description: `Welcome, ${name}!` });
      fetchSuggestions(); // Fetch suggestions immediately after login
  }, [toast]); // Removed userName dependency from here

  const handleLogout = useCallback(() => {
    console.log('Simulating logout...');
    setIsLoggedIn(false);
    setUserName(undefined);
    setUserImage(undefined);
    setSuggestions([]);
    setIsLoadingSuggestions(false);
    setError(null);
    toast({ title: "Logged Out", description: "You have been logged out." });
  }, [toast]);
  // --- End Simulated Authentication ---


  const fetchSuggestions = useCallback(async () => {
    if (!isLoggedIn) {
        // Don't explicitly set an error here, the UI handles the logged-out state
        setIsLoadingSuggestions(false);
        setSuggestions([]); // Clear suggestions if logged out during fetch
        return;
    }
    setIsLoadingSuggestions(true);
    setError(null);
    console.log("Fetching suggestions...");
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // *** Use dummy data directly ***
      // In a real app, this is where you'd call your backend/cloud function
      // which *might* internally use `suggestFilesForCompression` flow
      // const result = await fetch('/api/suggestions'); // Example API call
       if (!isLoggedIn) {
         // Check again in case user logged out during the delay
         throw new Error("User logged out during fetch.");
       }
      setSuggestions(dummySuggestions);
      console.log("Suggestions loaded:", dummySuggestions.length);
    } catch (err: any) {
       // Only show error if logged in
        if (isLoggedIn) {
            console.error('Error fetching suggestions:', err);
            setError(`Failed to fetch suggestions: ${err.message || 'Please check connection.'}`);
            toast({
                title: "Error Fetching Suggestions",
                description: err.message || "Could not load cloud file suggestions.",
                variant: "destructive",
            })
        } else {
            console.log("Fetch suggestions cancelled due to logout.");
        }
       setSuggestions([]); // Clear suggestions on error
    } finally {
      // Check login status again before setting loading state
      if (isLoggedIn) {
          setIsLoadingSuggestions(false);
      }
    }
  }, [isLoggedIn, toast]); // Depend on isLoggedIn and toast

  // Initial check effect - if logged in (e.g., via persisted session), fetch data
  useEffect(() => {
      // Simulate checking auth status on load (e.g., from localStorage/cookie)
      const checkAuthStatus = async () => {
          // Replace with your actual auth check logic
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async check
          const storedLoggedIn = false; // Simulate starting logged out
           if (storedLoggedIn) {
               // If found logged in, set state and fetch
               setIsLoggedIn(true);
               setUserName("Persisted User"); // Set appropriate user info
               // setUserImage(...)
               fetchSuggestions();
           } else {
               // Ensure loading state is false if starting logged out
               setIsLoadingSuggestions(false);
           }
      };
       checkAuthStatus();
      // We only want this check on initial mount
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: runs only once on mount


  // Callback passed to CompressionSuggestions to handle adding a cloud file to the LOCAL queue
   const handleAddCloudFileToLocalQueue = useCallback((filePath: string, fileName: string) => {
      if (!fileCompressionRef.current) {
          console.error("FileCompression component ref not available.");
          toast({ title: "Error", description: "Cannot add file to queue.", variant: "destructive" });
          return;
      }

       // Find the suggestion to get original size (needed for simulation)
      const suggestion = suggestions.find(s => s.path === filePath);
       const originalSize = suggestion?.size ?? 10 * 1024 * 1024; // Default 10MB if not found

      console.log("page.tsx: Adding cloud file to local queue via ref:", fileName);

      // *** Simulate creating a dummy File object ***
      // In a real app, you might need to FETCH the file from the cloud first,
      // which could be slow and costly. This approach simulates adding a *reference*
      // that the FileCompression component can handle (e.g., by showing it differently
      // or triggering a download+compress flow).
      // For this simulation, we create a basic File object.
      const dummyFile = new File(
          [`Simulated cloud content for ${fileName}. Path: ${filePath}`],
          fileName,
          { type: suggestion?.type || 'application/octet-stream', lastModified: Date.now() }
      );

      // Call the method exposed by FileCompression component via its ref
      fileCompressionRef.current.addFileToLocalQueue(dummyFile, { path: filePath, originalSize });

      toast({
          title: "Added to Queue",
          description: `${fileName} added to the local compression list below.`
      });

  }, [suggestions, toast]);


  return (
    <MainLayout
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        userName={userName}
        userImage={userImage}
    >
      <div className="space-y-8 md:space-y-12"> {/* Increased spacing */}
        {/* File Compression Section (Local Files) */}
        <section className="space-y-4 p-4 sm:p-6 bg-card rounded-lg shadow border border-border/50"> {/* Added subtle border */}
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-card-foreground">Local File Compression</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Select files from your device. They'll be analyzed for the best compression options.
          </p>
           {/* Forward the ref to the FileCompression component */}
           {/* Note: FileCompression needs to use forwardRef and useImperativeHandle */}
          <FileCompression ref={fileCompressionRef} />
        </section>

        <Separator />

         {/* Compression Suggestions Section (Cloud Files) */}
        <section className="space-y-4 p-4 sm:p-6 bg-card rounded-lg shadow border border-border/50"> {/* Added subtle border */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-card-foreground">Cloud File Suggestions</h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  {isLoggedIn
                    ? "AI suggestions for optimizing your connected cloud storage."
                    : "Log in to view AI-powered compression suggestions for your cloud files."}
                </p>
            </div>
            {isLoggedIn && (
                <Button
                    onClick={fetchSuggestions}
                    disabled={isLoadingSuggestions}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 mt-2 sm:mt-0" // Add margin top on small screens
                    >
                    {isLoadingSuggestions ? (
                        <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching... </>
                    ) : (
                         <> <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Suggestions </>
                     )}
                </Button>
             )}
          </div>

           {/* Error Display */}
           {error && !isLoadingSuggestions && isLoggedIn && ( // Show error only if logged in and not loading
            <Alert variant="destructive" className="mt-4">
                 <AlertCircle className="h-4 w-4"/>
              <AlertTitle>Error Loading Suggestions</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

           {/* Loading State */}
          {isLoadingSuggestions ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg mt-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-foreground">Loading Cloud Suggestions</p>
              <p className="text-muted-foreground">Analyzing your cloud files. This might take a moment.</p>
            </div>
          ) : (
            // Suggestions Component
            <CompressionSuggestions
                suggestions={suggestions}
                onCompressRequest={handleAddCloudFileToLocalQueue} // Pass the correct handler
                isLoggedIn={isLoggedIn}
                // Pass cloud compression handler if implemented:
                // onCompressCloudFile={handleCompressCloudFile}
            />
          )}
        </section>
      </div>
    </MainLayout>
  );
}


// Wrap FileCompression with forwardRef to receive the ref
const ForwardedFileCompression = forwardRef<FileCompressionHandle, {}>( (props, ref) => {
   // Expose the addFileToLocalQueue function via useImperativeHandle
  // This requires the actual FileCompression component to be modified
  // to accept a ref and define this handle.

  // Placeholder implementation - the real one needs to be inside FileCompression.tsx
   useImperativeHandle(ref, () => ({
     addFileToLocalQueue: (file, sourceInfo) => {
       console.log("Placeholder: addFileToLocalQueue called in FileCompression wrapper", file.name, sourceInfo);
       // The actual implementation inside FileCompression.tsx would update its internal state
       // e.g., call its internal addFiles function or similar
     }
   }));

   // Render the actual component (this is just illustrative)
   // In reality, you'd likely pass the ref down to the component itself
   // if FileCompression itself is wrapped in forwardRef
   // For now, assume FileCompression.tsx is modified to handle the ref internally.
   return <FileCompression /* {...props} - Pass props if needed */ />;
 });

// It's often cleaner to do the forwardRef directly in the component file (FileCompression.tsx)
// If FileCompression.tsx is updated like:
// export const FileCompression = forwardRef<FileCompressionHandle, {}>( (props, ref) => { ... });
// Then you can directly use `<FileCompression ref={fileCompressionRef} />` above.
// Assuming that modification is done, we don't need the wrapper here.

// If FileCompression.tsx IS NOT modified, this wrapper becomes necessary,
// but the `useImperativeHandle` needs access to FileCompression's internal state/functions,
// which makes placing it inside FileCompression.tsx the better approach.
