// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { FileCompression } from '@/components/features/file-compression';
import type { FileCompressionHandle } from '@/components/features/file-compression'; // Import type separately
import { CompressionSuggestions } from '@/components/features/compression-suggestions';
import { Separator } from '@/components/ui/separator';
import type { SuggestFilesForCompressionOutput } from '@/ai/flows/suggest-files-for-compression';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCcw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';


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
  const fileCompressionRef = useRef<FileCompressionHandle>(null);
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
      // Fetch suggestions is triggered by useEffect watching isLoggedIn
  }, [toast]); // Ensure toast is dependency

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
    // This function is called by the useEffect below when isLoggedIn becomes true.
    if (!isLoggedIn) {
        // Should not happen if called from useEffect, but good guard clause
        console.log("Fetch suggestions called while logged out. Aborting.");
        setIsLoadingSuggestions(false);
        setSuggestions([]);
        return;
    }
    setIsLoadingSuggestions(true);
    setError(null);
    console.log("Fetching suggestions...");
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));

       // Double-check login status after delay in case user logs out quickly
       if (!isLoggedIn) {
         console.log("User logged out during fetch. Aborting.");
         throw new Error("User logged out during fetch."); // Or simply return without setting state
       }
      setSuggestions(dummySuggestions);
      console.log("Suggestions loaded:", dummySuggestions.length);
    } catch (err: any) {
        // Only show error if the user is still logged in when the error occurs
        if (isLoggedIn) {
            console.error('Error fetching suggestions:', err);
            setError(`Failed to fetch suggestions: ${err.message || 'Please check connection.'}`);
            toast({
                title: "Error Fetching Suggestions",
                description: err.message || "Could not load cloud file suggestions.",
                variant: "destructive",
            });
        } else {
            console.log("Fetch suggestions cancelled due to logout.");
        }
       setSuggestions([]); // Clear suggestions on error or logout during fetch
    } finally {
       // Ensure loading state is turned off regardless of outcome
        setIsLoadingSuggestions(false);
    }
  }, [isLoggedIn, toast]); // Add isLoggedIn and toast as dependencies


  // Effect to fetch suggestions when login status changes
  useEffect(() => {
    if (isLoggedIn) {
      fetchSuggestions();
    } else {
      // Clear suggestions and errors if logged out
      setSuggestions([]);
      setError(null);
      setIsLoadingSuggestions(false); // Ensure loading stops if logout happens mid-fetch
    }
  }, [isLoggedIn, fetchSuggestions]); // Add fetchSuggestions as dependency


   const handleAddCloudFileToLocalQueue = useCallback((filePath: string, fileName: string) => {
      if (!fileCompressionRef.current) {
          console.error("FileCompression component ref not available.");
          toast({ title: "Error", description: "Cannot add file to queue.", variant: "destructive" });
          return;
      }

      // Find the suggestion to get the original size (important for analysis)
      const suggestion = suggestions.find(s => s.path === filePath);
       // Use suggestion size, fallback to a reasonable default if not found (though it should be found)
       const originalSize = suggestion?.size ?? 10 * 1024 * 1024; // e.g., 10MB default

      console.log("page.tsx: Adding cloud file to local queue via ref:", fileName);

      // Simulate creating a File object (in a real scenario, you might fetch the file content first or pass a reference)
      const dummyFile = new File(
          [`Simulated cloud content for ${fileName}. Path: ${filePath}`], // Simulate content
          fileName, // Use the actual file name
          { type: suggestion?.type || 'application/octet-stream', lastModified: Date.now() } // Use suggestion type or fallback
      );

      // Pass the dummy File and source info (path, original size) to the FileCompression component
      fileCompressionRef.current.addFileToLocalQueue(dummyFile, { path: filePath, originalSize: originalSize });

      toast({
          title: "Added to Queue",
          description: `${fileName} added to the local optimization list below.`
      });

  }, [suggestions, toast]); // Add suggestions and toast to dependencies

   // Animation variants for sections
   const sectionVariants = {
     hidden: { opacity: 0, y: 20 },
     visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
   };

  // Helper function to render the main content
  const renderContent = () => (
    <div className="space-y-10 md:space-y-16 pb-10"> {/* Added padding-bottom */}
      {/* File Compression Section (Local Files) */}
      <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          className="space-y-4 p-4 sm:p-6 bg-card rounded-lg shadow-xl border border-border/70 transition-shadow hover:shadow-2xl" // Enhanced shadow and hover effect
      >
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-card-foreground">Local File Optimization</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Select files from your device. They'll be analyzed for the best optimization options.
        </p>
        <FileCompression ref={fileCompressionRef} />
      </motion.section>

      <Separator className="my-8 md:my-12 border-border/50"/> {/* Softened separator */}

       {/* Compression Suggestions Section (Cloud Files) */}
      <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ delay: 0.2 }} // Slight delay for second section
          className="space-y-4 p-4 sm:p-6 bg-card rounded-lg shadow-xl border border-border/70 transition-shadow hover:shadow-2xl" // Enhanced shadow and hover effect
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-card-foreground">Cloud File Suggestions</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {isLoggedIn
                  ? "AI suggestions for optimizing your connected cloud storage."
                  : "Log in to view AI-powered optimization suggestions for your cloud files."}
              </p>
          </div>
          {isLoggedIn && (
              <Button
                  onClick={fetchSuggestions}
                  disabled={isLoadingSuggestions}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 mt-2 sm:mt-0 transition-transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md" // Added shadow effects
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
         {error && !isLoadingSuggestions && isLoggedIn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              {/* Use a slightly softer destructive variant */}
              <Alert variant="destructive" className="mt-4 animate-fade-in border-destructive/70 bg-destructive/10 text-destructive">
                   <AlertCircle className="h-4 w-4"/> {/* Icon color inherits from text-destructive */}
                <AlertTitle>Error Loading Suggestions</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
          </motion.div>
        )}

         {/* Loading State */}
        {isLoadingSuggestions ? (
          <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg mt-4 bg-muted/20 backdrop-blur-sm" // Added subtle blur
          >
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium text-foreground">Loading Cloud Suggestions</p>
            <p className="text-muted-foreground">Analyzing your cloud files...</p>
          </motion.div>
        ) : (
           <motion.div
              // Apply animation only when suggestions appear or login state changes
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={cn(suggestions.length > 0 || !isLoggedIn ? "mt-4" : "")} // Add margin only if content exists
            >
               <CompressionSuggestions
                   suggestions={suggestions}
                   onCompressRequest={handleAddCloudFileToLocalQueue}
                   isLoggedIn={isLoggedIn}
               />
           </motion.div>
        )}
      </motion.section>
    </div>
  );


   return (
    <MainLayout
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        userName={userName}
        userImage={userImage}
    >
        {renderContent()}
    </MainLayout>
   );
}
