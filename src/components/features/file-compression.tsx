// src/components/features/file-compression.tsx
'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { ForwardedRef } from 'react'; // Import ForwardedRef type if needed, usually inferred
import Image from 'next/image'; // Import next/image
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, File as FileIconLucide, X, CheckCircle, AlertCircle, Image as ImageIcon, FileAudio, Video, Download, Loader2, BrainCircuit, Eye, FileText, FileArchive, Database } from 'lucide-react'; // Added more icons
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { analyzeCompressionQuality, AnalyzeCompressionQualityOutput, AnalyzeCompressionQualityInput } from '@/ai/flows/analyze-compression-quality';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'; // Import Dialog components

type CompressionLevel = 'lossless_optimized' | 'high' | 'medium' | 'low';
type FileStatus = 'pending' | 'uploading' | 'analyzing' | 'compressing' | 'complete' | 'error';

interface SelectedFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  originalSize: number;
  compressedSize?: number;
  compressedBlob?: Blob;
  compressedFileName?: string;
  error?: string;
  analysis?: AnalyzeCompressionQualityOutput | null;
  source?: 'local' | 'cloud';
  sourcePath?: string;
  previewUrl?: string; // Added for image preview
  compressedPreviewUrl?: string; // Added for compressed preview
}

// Define the handle type that will be exposed via the ref
export interface FileCompressionHandle {
  addFileToLocalQueue: (file: File, sourceInfo?: { path: string; originalSize: number }) => void;
}


// Wrap the component with forwardRef
export const FileCompression = forwardRef<FileCompressionHandle, {}>((props, ref) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('lossless_optimized');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  // Rename state to avoid conflict with Image component
  const [previewStates, setPreviewStates] = useState<Record<string, { original?: string, compressed?: string }>>({});


   // Effect to create and revoke preview URLs
   useEffect(() => {
    const currentPreviewUrls: Record<string, { original?: string, compressed?: string }> = {};

    selectedFiles.forEach(item => {
        let originalUrl: string | undefined = undefined;
        let compressedUrl: string | undefined = undefined;

        // Create URL for original file if it's an image
        if (item.file.type.startsWith('image/')) {
            originalUrl = URL.createObjectURL(item.file);
        }

        // Create URL for compressed blob if it exists and is an image
        // Assuming compressed blob maintains image type or we can check the name/type
        if (item.compressedBlob && (item.file.type.startsWith('image/') || item.compressedBlob.type.startsWith('image/'))) {
            compressedUrl = URL.createObjectURL(item.compressedBlob);
        }

        if (originalUrl || compressedUrl) {
            currentPreviewUrls[item.id] = { original: originalUrl, compressed: compressedUrl };
        }
    });

    setPreviewStates(currentPreviewUrls);

    // Cleanup function to revoke URLs when component unmounts or files change
    return () => {
      Object.values(currentPreviewUrls).forEach(urls => {
        if (urls.original) URL.revokeObjectURL(urls.original);
        if (urls.compressed) URL.revokeObjectURL(urls.compressed);
      });
    };
  }, [selectedFiles]); // Re-run when selectedFiles change


   // Expose the addFileToLocalQueue function via useImperativeHandle
   useImperativeHandle(ref, () => ({
     addFileToLocalQueue: (file, sourceInfo) => {
       console.log("FileCompression: addFileToLocalQueue called via ref", file.name, sourceInfo);
        let previewUrl: string | undefined = undefined;
        if (file.type.startsWith('image/')) {
          try {
            previewUrl = URL.createObjectURL(file); // Create preview URL immediately
          } catch (e) {
            console.error("Error creating object URL for cloud file:", e);
          }
        }

       const newFile: SelectedFile = {
         id: `${file.name}-${sourceInfo?.originalSize ?? file.size}-${Date.now()}`,
         file: file,
         status: 'pending',
         progress: 0,
         originalSize: sourceInfo?.originalSize ?? file.size,
         source: 'cloud',
         sourcePath: sourceInfo?.path,
         previewUrl: previewUrl, // Store the initial preview URL
       };
       // Ensure adding to state updates it correctly
        setSelectedFiles(prev => {
           // Prevent duplicates if necessary
            if (prev.some(f => f.id === newFile.id)) return prev;
            return [...prev, newFile];
        });
        // Start analysis after state update completes
        // Defer analysis slightly to ensure state is updated before analyzeFile reads it
        setTimeout(() => {
            analyzeFile(newFile.id, file.name, newFile.originalSize, file.type);
        }, 0);
     }
   }));


 const getFileIcon = (fileType: string) => {
    fileType = fileType?.toLowerCase() || ''; // Handle undefined type
    if (fileType.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="h-6 w-6 text-blue-500" />;
    if (fileType.startsWith('video/')) return <Video className="h-6 w-6 text-red-500" />;
    if (fileType.includes('zip') || fileType.includes('archive') || fileType.includes('tar') || fileType.includes('gz')) return <FileArchive className="h-6 w-6 text-orange-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-6 w-6 text-red-600" />;
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <FileText className="h-6 w-6 text-orange-600" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <Database className="h-6 w-6 text-green-600" />;
    if (fileType.includes('document') || fileType.includes('word')) return <FileText className="h-6 w-6 text-blue-600" />;
    if (fileType.includes('text') || fileType.includes('log') || fileType.includes('csv')) return <FileText className="h-6 w-6 text-gray-500" />;
    return <FileIconLucide className="h-6 w-6 text-muted-foreground" />;
  };


  const formatFileSize = (bytes: number): string => {
    if (bytes < 0 || bytes === undefined || bytes === null) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const precision = i < 2 ? 1 : 2;
    return parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + ' ' + sizes[i];
  };

   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(Array.from(event.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const addFiles = (files: File[]) => {
     const newFiles: SelectedFile[] = files.map(file => {
        let previewUrl: string | undefined = undefined;
        if (file.type.startsWith('image/')) {
            try {
                previewUrl = URL.createObjectURL(file);
            } catch (e) {
                console.error("Error creating object URL:", e);
            }
        }
        return {
          id: `${file.name}-${file.size}-${Date.now()}`,
          file,
          status: 'pending',
          progress: 0,
          originalSize: file.size,
          source: 'local',
          previewUrl: previewUrl, // Store the preview URL
        };
     });

    setSelectedFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(nf => analyzeFile(nf.id, nf.file.name, nf.file.size, nf.file.type));
  };

 const analyzeFile = useCallback(async (fileId: string, fileName: string, fileSize: number, fileType: string) => {
    setSelectedFiles(prevFiles =>
      prevFiles.map(f => f.id === fileId ? { ...f, status: 'analyzing', progress: 0 } : f)
    );

     // Find the correct file *from the current state* inside the callback closure
    // Use a function update for setSelectedFiles if direct state access is problematic
    let simulatedFilePath = `/local/${fileName}`;
    setSelectedFiles(prev => {
        const targetFile = prev.find(f => f.id === fileId);
        if (targetFile?.sourcePath) {
            simulatedFilePath = targetFile.sourcePath;
        }
        return prev; // No state change here, just getting the path
    })


    const analysisInput: AnalyzeCompressionQualityInput = {
      filePath: simulatedFilePath
    };

    try {
       await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

       let shouldCompress = true;
       let recommendedMethod: AnalyzeCompressionQualityOutput['recommendedMethod'] = 'lossless_optimized';
       let estimatedReductionPercent: number | undefined = 50;
       let qualityImpactDescription = "No quality loss with optimization.";

       const lowerCaseType = fileType.toLowerCase();
        if (lowerCaseType.includes('jpeg') || lowerCaseType.includes('jpg') || lowerCaseType.includes('mp3') || lowerCaseType.includes('aac') || lowerCaseType.includes('mp4') || lowerCaseType.includes('mov') || lowerCaseType.includes('zip') || lowerCaseType.includes('7z') || lowerCaseType.includes('gz') || lowerCaseType.includes('heic')) {
           estimatedReductionPercent = Math.floor(5 + Math.random() * 20);
           recommendedMethod = fileSize > 10 * 1024 * 1024 ? 'lossy_high_quality' : 'lossless_optimized';
           qualityImpactDescription = "Potential minor reduction via re-optimization.";
           if (fileSize < 1024 * 200) {
             shouldCompress = false;
             recommendedMethod = 'none';
             estimatedReductionPercent = undefined;
             qualityImpactDescription = "Likely already efficiently compressed.";
           }
       } else if (lowerCaseType.includes('png') || lowerCaseType.includes('gif') || lowerCaseType.includes('tiff') || lowerCaseType.includes('bmp') ) {
           recommendedMethod = 'lossless_optimized';
           estimatedReductionPercent = Math.floor(20 + Math.random() * 40);
           qualityImpactDescription = "Good candidate for lossless optimization.";
       } else if (lowerCaseType.includes('wav') || lowerCaseType.includes('aiff')) {
           recommendedMethod = 'lossless_optimized';
           estimatedReductionPercent = Math.floor(40 + Math.random() * 30);
           qualityImpactDescription = "Significant savings via lossless audio codec (e.g., FLAC).";
       } else if (lowerCaseType.includes('text') || lowerCaseType.includes('csv') || lowerCaseType.includes('log') || lowerCaseType.includes('html') || lowerCaseType.includes('css') || lowerCaseType.includes('js') || lowerCaseType.includes('json') || lowerCaseType.includes('xml')) {
           recommendedMethod = 'lossless_optimized';
           estimatedReductionPercent = Math.floor(60 + Math.random() * 30);
           qualityImpactDescription = "Highly compressible with no quality loss.";
       } else {
            recommendedMethod = fileSize > 20 * 1024 * 1024 ? 'lossy_balanced' : 'lossless_optimized';
           estimatedReductionPercent = Math.floor(30 + Math.random() * 40);
           qualityImpactDescription = "Compression viable, potential quality trade-off depending on content.";
       }

       const dummyAnalysis: AnalyzeCompressionQualityOutput = {
            shouldCompress,
            recommendedMethod,
            estimatedReductionPercent,
            qualityImpactDescription
        };
       const analysisResult = dummyAnalysis;

      setSelectedFiles(prevFiles =>
        prevFiles.map(f => {
          if (f.id === fileId) {
            return { ...f, status: 'pending', analysis: analysisResult };
          }
          return f;
        })
      );
        toast({
            title: `Analysis: ${fileName}`,
            description: (
                <div className="text-sm space-y-1">
                    <p>Recommendation: <span className="font-medium">{analysisResult.recommendedMethod.replace(/_/g, ' ')}</span></p>
                    {analysisResult.estimatedReductionPercent !== undefined && (
                        <p>Est. Reduction: <span className="font-medium">~{analysisResult.estimatedReductionPercent}%</span></p>
                    )}
                    <p>Quality Impact: <span className="italic">{analysisResult.qualityImpactDescription}</span></p>
                     {!analysisResult.shouldCompress && analysisResult.recommendedMethod === 'none' && (
                         <p className="text-orange-600 dark:text-orange-500 text-xs mt-1">Compression may not be effective.</p>
                     )}
                </div>
            ),
            variant: analysisResult.shouldCompress ? 'default' : 'default',
            duration: 5000,
        });
    } catch (error) {
      console.error('Error analyzing file:', error);
      setSelectedFiles(prevFiles =>
        prevFiles.map(f => f.id === fileId ? { ...f, status: 'error', error: 'Analysis failed', analysis: null } : f)
      );
      toast({
        title: "Analysis Error",
        description: `Failed to analyze ${fileName}.`,
        variant: "destructive",
      });
    }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [toast]); // Keep selectedFiles removed if it causes issues, rely on functional updates


  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
    // Preview URL cleanup is handled by the useEffect hook
  };

  const handleCompression = useCallback(async () => {
    const filesToCompress = selectedFiles.filter(f => f.status === 'pending' || f.status === 'error');

     if (filesToCompress.length === 0) {
      toast({
          title: "No files ready",
          description: selectedFiles.length > 0 ? "Select files or wait for analysis/compression to finish." : "Please select files to compress.",
          variant: "destructive"
      });
      return;
    }

    filesToCompress.forEach(async (selectedFile) => {
      setSelectedFiles(prevFiles =>
        prevFiles.map(f => f.id === selectedFile.id ? { ...f, status: 'compressing', progress: 0, error: undefined } : f)
      );

      try {
         const baseTime = 500 + Math.random() * 1000;
         const sizeFactor = Math.log10(Math.max(1024, selectedFile.originalSize)) / 3;
         const levelFactor = compressionLevel === 'low' ? 0.7 : compressionLevel === 'medium' ? 1 : compressionLevel === 'high' ? 1.6 : 1.3;
         const totalTime = baseTime * sizeFactor * levelFactor;
         const steps = 15;
         const stepTime = totalTime / steps;


        for (let i = 1; i <= steps; i++) {
           await new Promise(resolve => setTimeout(resolve, stepTime));
           setSelectedFiles(prevFiles =>
             prevFiles.map(f => f.id === selectedFile.id ? { ...f, progress: Math.min(99, (i / steps) * 100) } : f)
           );
         }

         let reductionFactor;
         const recommendedMethod = selectedFile.analysis?.recommendedMethod || 'lossless_optimized';
         const baseReductionEstimate = (selectedFile.analysis?.estimatedReductionPercent ?? 50) / 100;

         if (compressionLevel === 'lossless_optimized') {
             reductionFactor = Math.min(0.9, Math.max(0.1, (1 - baseReductionEstimate) * (0.9 + Math.random() * 0.2)));
             if (!recommendedMethod.startsWith('lossless')) {
                 reductionFactor = Math.min(0.95, Math.max(0.6, reductionFactor * 1.5));
             }
             const type = selectedFile.file.type.toLowerCase();
             if (type.includes('text') || type.includes('log') || type.includes('wav')) {
                reductionFactor = Math.min(reductionFactor, 0.4);
             }
         } else {
             const levelEffect = compressionLevel === 'low' ? 1.1 : compressionLevel === 'medium' ? 1.0 : 0.8;
             reductionFactor = Math.min(0.9, Math.max(0.1, (1 - baseReductionEstimate) * levelEffect * (0.85 + Math.random() * 0.3)));

             if (recommendedMethod.startsWith('lossless') && selectedFile.originalSize > 1024) {
                 reductionFactor = Math.min(reductionFactor, 0.3);
             }
         }

          if (compressionLevel === 'lossless_optimized' && reductionFactor > 0.5 && baseReductionEstimate > 0.5) {
             reductionFactor = Math.min(0.5, reductionFactor * 0.8);
         } else if (compressionLevel !== 'lossless_optimized' && reductionFactor > 0.5) {
            reductionFactor = Math.min(0.5, reductionFactor * 0.7);
         }


         const minCompressedSize = Math.min(1024, Math.max(50, selectedFile.originalSize * 0.05));
         const compressedSize = Math.max(minCompressedSize, Math.floor(selectedFile.originalSize * reductionFactor));

          let compressedBlob: Blob;
          let compressedType = selectedFile.file.type;

          if (selectedFile.file.type.startsWith('image/')) {
              const svgData = `<svg width="100" height="50" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="lightgray"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10">Compressed ${selectedFile.file.name}</text></svg>`;
              // Approximate size adjustment for SVG simulation
              const sizeDiffFactor = Math.max(0.1, compressedSize / (svgData.length * 2)); // Avoid zero or negative
              const adjustedSvgData = `<svg width="${Math.max(10, 100 * Math.sqrt(sizeDiffFactor))}" height="${Math.max(5, 50 * Math.sqrt(sizeDiffFactor))}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="lightgray"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10">Compressed ${selectedFile.file.name}</text></svg>`;
              compressedBlob = new Blob([adjustedSvgData], { type: 'image/svg+xml' });
              compressedType = 'image/svg+xml';
          } else {
              let compressedData = `Simulated compressed data for ${selectedFile.file.name} (Level: ${compressionLevel}). Original size: ${selectedFile.originalSize}, Compressed: ${compressedSize}`;
               if (selectedFile.source === 'cloud') {
                   compressedData += `\nSource Path: ${selectedFile.sourcePath}`;
               }
               compressedBlob = new Blob([compressedData], { type: 'text/plain' });
               compressedType = 'text/plain';
          }

          const originalNameParts = selectedFile.file.name.split('.');
          const originalBaseName = originalNameParts.length > 1 ? originalNameParts.slice(0, -1).join('.') : selectedFile.file.name;

          let newExtension = '.bin'; // Default backup extension
          if (compressedType === 'image/svg+xml') {
            newExtension = '.svg';
          } else if (compressedType === 'text/plain') {
            newExtension = '.txt';
          }
          // Add more mappings if other simulated types are introduced

          let suffix = '-compressed';
          if (compressionLevel === 'lossless_optimized') suffix = '-optimized';
          else if (compressionLevel === 'high') suffix = '-high';
          else if (compressionLevel === 'medium') suffix = '-med';
          else if (compressionLevel === 'low') suffix = '-fast';

          const compressedFileName = `${originalBaseName}${suffix}${newExtension}`;

        setSelectedFiles(prevFiles =>
          prevFiles.map(f => f.id === selectedFile.id ? {
              ...f,
              status: 'complete',
              progress: 100,
              compressedSize: compressedSize,
              compressedBlob: compressedBlob,
              compressedFileName: compressedFileName
             } : f)
        );
        toast({
          title: "Optimization Complete!",
          description: `${selectedFile.file.name} optimized to ${formatFileSize(compressedSize)}.`,
          variant: 'default',
        });

      } catch (error) {
        console.error('Compression error:', error);
        setSelectedFiles(prevFiles =>
          prevFiles.map(f => f.id === selectedFile.id ? { ...f, status: 'error', error: 'Optimization failed' } : f)
        );
        toast({
          title: "Optimization Error",
          description: `Failed to optimize ${selectedFile.file.name}.`,
          variant: "destructive",
        });
      }
    });
  }, [selectedFiles, compressionLevel, toast]);

   const handleDownload = (file: SelectedFile) => {
    if (!file.compressedBlob || !file.compressedFileName || file.status !== 'complete') {
        toast({ title: "Download Error", description: "Optimized file data is not available.", variant: "destructive"});
        return;
    }

    const url = URL.createObjectURL(file.compressedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.compressedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

     toast({
        title: "Download Started",
        description: `Downloading ${file.compressedFileName}`,
     });
  };


  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const relatedTarget = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(relatedTarget)) {
        setIsDragging(false);
    }
};


  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      addFiles(Array.from(event.dataTransfer.files));
      event.dataTransfer.clearData();
    }
  };

  const calculateOverallProgress = () => {
    const filesInProgress = selectedFiles.filter(f => f.status === 'compressing' || f.status === 'analyzing');
    if (filesInProgress.length === 0) return 0;

    const totalProgress = filesInProgress.reduce((sum, f) => {
      const progressValue = f.status === 'analyzing' ? f.progress * 0.2 : f.progress;
      return sum + progressValue;
    }, 0);

    return totalProgress / filesInProgress.length;
  };
  const isProcessingAny = selectedFiles.some(f => f.status === 'compressing' || f.status === 'analyzing');
  const overallProgressValue = calculateOverallProgress();

  const listItemVariants = {
      initial: { opacity: 0, y: -10, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };


  return (
    <TooltipProvider delayDuration={100}>
        <Card
          className={cn("transition-all duration-300 border-dashed border-2 relative overflow-hidden shadow-lg hover:shadow-xl", // Enhanced shadow
            isDragging ? 'border-primary ring-2 ring-primary/50 scale-[1.01]' : 'border-muted hover:border-primary/30' // Subtle scale on drag
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
         {isDragging && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-primary/10 z-10 flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm"
            >
                 <Upload className="h-16 w-16 text-primary animate-bounce mb-2" />
                 <p className="text-lg font-medium text-primary">Drop files here</p>
             </motion.div>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <Upload className="h-6 w-6 text-primary" />
                 Upload & Optimize
            </CardTitle>
            <CardDescription>Drag & drop files or click below. AI analysis provides optimization insights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
                className={cn(
                    "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 relative z-0 bg-muted/20 hover:bg-muted/30", // Subtle background on hover
                    isDragging ? "border-primary bg-transparent scale-105" : "border-border hover:border-primary/50",
                    "group"
                )}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                aria-label="File upload area"
            >
              <Upload className={cn("h-12 w-12 mb-4 transition-colors duration-300 group-hover:text-primary", isDragging ? "text-primary" : "text-muted-foreground")} />
              <p className={cn("text-center transition-colors duration-300 group-hover:text-primary", isDragging ? "text-primary font-medium" : "text-muted-foreground")}>
                 {isDragging ? 'Drop files to upload' : 'Drag & drop files here, or click to select'}
               </p>
              <Input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                multiple
                accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.csv,.json,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.h,.hpp,.md,.log"
              />
               <Label htmlFor="file-upload-input" className="sr-only">Upload files</Label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">File Queue:</h3>
                <ul className="space-y-3 max-h-72 overflow-y-auto pr-2 border rounded-md p-3 bg-background shadow-inner">
                   <AnimatePresence initial={false}>
                  {selectedFiles.map((item) => {
                     const previews = previewStates[item.id] || {};
                     const canPreview = item.file.type.startsWith('image/') && (previews.original || previews.compressed);

                     return (
                     <motion.li
                        key={item.id}
                        variants={listItemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                        className="flex items-center space-x-3 p-3 bg-card rounded-md shadow-sm hover:bg-muted/80 transition-colors duration-150 relative overflow-hidden border border-transparent hover:border-border/50" // Subtle hover border
                    >
                       <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-colors duration-300",
                           item.status === 'pending' && 'bg-yellow-400/60', // Slightly stronger pending color
                           item.status === 'analyzing' && 'bg-blue-400/70 animate-pulse',
                           item.status === 'compressing' && 'bg-primary/80',
                           item.status === 'complete' && 'bg-green-500/80',
                           item.status === 'error' && 'bg-destructive/80'
                       )}></div>
                      <div className="flex-shrink-0 pl-2">{getFileIcon(item.file.type)}</div>
                      <div className="flex-1 min-w-0 space-y-1 pl-1">
                        <p className="text-sm font-medium text-foreground truncate" title={item.file.name}>{item.file.name}</p>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                             {item.source === 'cloud' && <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-400/50 text-blue-600 dark:text-blue-400">Cloud</Badge>}
                            <span>{formatFileSize(item.originalSize)}</span>
                           {item.status === 'complete' && item.compressedSize !== undefined && (
                               <>
                                 <span className="text-muted-foreground">&rarr;</span>
                                 <span className="text-green-600 dark:text-green-400 font-medium">{formatFileSize(item.compressedSize)}</span>
                                 <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-500/50 px-1.5 py-0.5 text-[10px] leading-none font-normal whitespace-nowrap">
                                    Saved {formatFileSize(item.originalSize - item.compressedSize)} ({( (1 - item.compressedSize / item.originalSize) * 100).toFixed(1)}%)
                                </Badge>
                               </>
                            )}
                             {item.status === 'error' && <Badge variant="destructive" className="whitespace-nowrap font-normal text-[10px]"><AlertCircle className="h-3 w-3 mr-1"/>{item.error}</Badge>}
                        </div>
                         {item.status === 'compressing' && (
                           <Progress value={item.progress} className="h-1.5 mt-1 rounded-full" aria-label={`Compressing ${item.file.name}`} />
                         )}
                          {item.status === 'analyzing' && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 italic">
                                <Loader2 className="h-3 w-3 animate-spin" /> Analyzing...
                            </div>
                        )}
                         {item.status === 'pending' && item.analysis && (
                             <Tooltip>
                                <TooltipTrigger asChild>
                                     <Badge
                                         variant={item.analysis.recommendedMethod === 'none' ? 'secondary' : item.analysis.shouldCompress ? 'default' : 'outline'}
                                         className={cn("cursor-help mt-1 font-normal text-[10px] leading-tight py-0.5",
                                             !item.analysis.shouldCompress && item.analysis.recommendedMethod !== 'none' && "text-orange-600 dark:text-orange-500 border-orange-500/50 bg-orange-500/10",
                                             item.analysis.shouldCompress && "text-green-600 dark:text-green-400 border-green-500/50 bg-green-500/10",
                                              item.analysis.recommendedMethod === 'none' && "opacity-70 bg-muted/60",
                                             (
                                                (item.analysis.recommendedMethod.startsWith('lossless') && compressionLevel === 'lossless_optimized') ||
                                                (item.analysis.recommendedMethod === 'lossy_high_quality' && compressionLevel === 'high') ||
                                                (item.analysis.recommendedMethod === 'lossy_balanced' && compressionLevel === 'medium')
                                             ) && item.analysis.shouldCompress && "border-primary/50 text-primary bg-primary/10"
                                         )}
                                     >
                                         <BrainCircuit className="h-3 w-3 mr-1" />
                                        AI: {item.analysis.recommendedMethod.replace(/_/g, ' ')}
                                         {item.analysis.estimatedReductionPercent !== undefined ? ` (~${item.analysis.estimatedReductionPercent}%)` : ''}
                                     </Badge>
                                </TooltipTrigger>
                                 <TooltipContent side="bottom" align="start" className="text-xs">
                                    <p className="font-medium mb-1">{item.analysis.recommendedMethod.replace(/_/g, ' ')} Recommended</p>
                                    <p className="text-muted-foreground max-w-xs">{item.analysis.qualityImpactDescription}</p>
                                </TooltipContent>
                             </Tooltip>
                         )}
                      </div>

                       <div className="flex-shrink-0 flex items-center gap-1 pl-2">
                           {/* Preview Button */}
                           {canPreview && (
                               <Dialog>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <DialogTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full" aria-label="Preview Image">
                                         <Eye className="h-4 w-4" />
                                       </Button>
                                     </DialogTrigger>
                                   </TooltipTrigger>
                                   <TooltipContent><p>Preview Image</p></TooltipContent>
                                 </Tooltip>
                                 {/* Increase max-width, remove fixed width */}
                                 <DialogContent className="max-w-4xl w-auto">
                                     <DialogHeader>
                                         <DialogTitle>Image Preview: {item.file.name}</DialogTitle>
                                     </DialogHeader>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 items-start">
                                         {/* Original Preview */}
                                        {previews.original && (
                                             <div className="space-y-2 flex flex-col items-center">
                                                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Original</h3>
                                                 {/* Ensure image fills container but respects aspect ratio */}
                                                 <div className="border rounded-md overflow-hidden relative w-full max-w-md aspect-[4/3] bg-muted flex items-center justify-center">
                                                     <Image
                                                         src={previews.original}
                                                         alt="Original Preview"
                                                         fill // Use fill for responsive sizing
                                                         style={{ objectFit: 'contain' }} // Maintain aspect ratio
                                                         sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Add sizes prop
                                                     />
                                                 </div>
                                                <p className="text-xs text-muted-foreground text-center mt-2">Size: {formatFileSize(item.originalSize)}</p>
                                             </div>
                                         )}
                                         {/* Optimized Preview */}
                                         {previews.compressed && item.status === 'complete' && (
                                             <div className="space-y-2 flex flex-col items-center">
                                                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Optimized ({compressionLevel.replace(/_/g, ' ')})</h3>
                                                 <div className="border rounded-md overflow-hidden relative w-full max-w-md aspect-[4/3] bg-muted flex items-center justify-center">
                                                     <Image
                                                        src={previews.compressed}
                                                        alt="Compressed Preview"
                                                        fill
                                                        style={{ objectFit: 'contain' }}
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                     />
                                                 </div>
                                                 <p className="text-xs text-muted-foreground text-center mt-2">Size: {formatFileSize(item.compressedSize!)}</p>
                                             </div>
                                          )}
                                          {/* Show placeholder if compressing or not yet compressed */}
                                          {(item.status === 'compressing' || item.status === 'analyzing' || (item.status === 'pending' && !item.analysis) || (item.status === 'pending' && item.analysis && !previews.compressed)) && previews.original && (
                                              <div className="space-y-2 flex flex-col items-center justify-center border rounded-md aspect-[4/3] w-full max-w-md bg-muted/50">
                                                 <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                                 <p className="text-sm text-muted-foreground">Optimized preview pending...</p>
                                              </div>
                                          )}
                                           {/* Handle error state for preview */}
                                            {item.status === 'error' && previews.original && (
                                                <div className="space-y-2 flex flex-col items-center justify-center border rounded-md aspect-[4/3] w-full max-w-md bg-destructive/10">
                                                    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                                                    <p className="text-sm text-destructive">Optimization failed</p>
                                                </div>
                                            )}
                                     </div>
                                      <DialogClose asChild>
                                         <Button variant="ghost" size="icon" className="absolute right-4 top-4 rounded-full opacity-70 hover:opacity-100 hover:bg-muted">
                                           <X className="h-4 w-4" />
                                           <span className="sr-only">Close</span>
                                         </Button>
                                      </DialogClose>
                                 </DialogContent>
                               </Dialog>
                           )}
                         {item.status === 'complete' ? (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                     <Button variant="outline" size="icon" onClick={() => handleDownload(item)} className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-full" aria-label={`Download ${item.compressedFileName}`}>
                                       <Download className="h-4 w-4" />
                                     </Button>
                                 </TooltipTrigger>
                                 <TooltipContent><p>Download Optimized File</p></TooltipContent>
                             </Tooltip>
                           ) : item.status === 'error' ? (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer rounded-full" onClick={() => analyzeFile(item.id, item.file.name, item.originalSize, item.file.type)} aria-label="Retry Analysis">
                                          <AlertCircle className="h-5 w-5" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Error: {item.error}. Click to retry analysis.</p></TooltipContent>
                              </Tooltip>
                           ) : item.status === 'compressing' || item.status === 'analyzing' ? (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    </TooltipTrigger>
                                     <TooltipContent><p>{item.status === 'compressing' ? 'Optimizing...' : 'Analyzing...'}</p></TooltipContent>
                                </Tooltip>
                           ) : null }

                          {item.status !== 'compressing' && item.status !== 'analyzing' && (
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => removeFile(item.id)} aria-label="Remove file">
                                         <X className="h-4 w-4" />
                                     </Button>
                                 </TooltipTrigger>
                                 <TooltipContent><p>Remove File</p></TooltipContent>
                             </Tooltip>
                         )}
                       </div>

                     </motion.li>
                   );
                  })}
                  </AnimatePresence>
                </ul>
              </div>
            )}

            <div className="space-y-3 pt-4">
              <Label className="text-base font-medium">Optimization Method</Label>
              <RadioGroup
                value={compressionLevel}
                onValueChange={(value: string) => setCompressionLevel(value as CompressionLevel)}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                aria-label="Compression level selection"
              >
                 {/* Make Radio Labels more prominent */}
                 <Label htmlFor="lossless_optimized" className={cn("flex flex-col items-start space-y-1 p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:border-primary hover:shadow-lg has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:checked]:shadow-lg", compressionLevel === 'lossless_optimized' && "bg-primary/5 border-primary")}>
                    <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-sm">Lossless</span>
                         <RadioGroupItem value="lossless_optimized" id="lossless_optimized" className="mt-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">Best quality via smart optimization. Ideal for text, code, PNGs.</p>
                     <Badge variant="outline" className="text-green-600 border-green-500/50 text-[10px] mt-1 font-medium">Recommended</Badge>
                </Label>
                 <Label htmlFor="high" className={cn("flex flex-col items-start space-y-1 p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:border-primary hover:shadow-lg has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:checked]:shadow-lg", compressionLevel === 'high' && "bg-primary/5 border-primary")}>
                     <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-sm">High Compression</span>
                         <RadioGroupItem value="high" id="high" className="mt-0" />
                     </div>
                    <p className="text-xs text-muted-foreground">Max size reduction, slight quality loss possible. Good for images/video.</p>
                 </Label>
                 <Label htmlFor="medium" className={cn("flex flex-col items-start space-y-1 p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:border-primary hover:shadow-lg has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:checked]:shadow-lg", compressionLevel === 'medium' && "bg-primary/5 border-primary")}>
                     <div className="flex items-center justify-between w-full">
                         <span className="font-semibold text-sm">Balanced</span>
                          <RadioGroupItem value="medium" id="medium" className="mt-0" />
                     </div>
                    <p className="text-xs text-muted-foreground">Good balance between size reduction and quality/speed.</p>
                 </Label>
                  <Label htmlFor="low" className={cn("flex flex-col items-start space-y-1 p-4 border rounded-lg transition-all duration-200 cursor-pointer hover:border-primary hover:shadow-lg has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:checked]:shadow-lg", compressionLevel === 'low' && "bg-primary/5 border-primary")}>
                     <div className="flex items-center justify-between w-full">
                         <span className="font-semibold text-sm">Fastest</span>
                         <RadioGroupItem value="low" id="low" className="mt-0" />
                     </div>
                    <p className="text-xs text-muted-foreground">Quickest compression, less size reduction. Minimal quality impact.</p>
                 </Label>
              </RadioGroup>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 pt-4 border-t bg-muted/30">
            {isProcessingAny && <Progress value={overallProgressValue} className="h-2 rounded-full" aria-label="Overall processing progress"/>}
            <Button
                size="lg"
                onClick={handleCompression}
                disabled={isProcessingAny || selectedFiles.every(f => f.status !== 'pending' && f.status !== 'error') || selectedFiles.length === 0}
                className={cn("w-full transition-all duration-300 ease-in-out transform hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100 shadow-md hover:shadow-lg", // Enhance button shadow
                   isProcessingAny ? "bg-gradient-to-r from-primary/80 to-primary/60" : "bg-gradient-to-r from-primary to-blue-500" // Subtle gradient on button
                )}
                aria-live="polite"
            >
                {isProcessingAny ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {selectedFiles.some(f => f.status === 'compressing') ? 'Optimizing...' : 'Analyzing...'}
                         ({selectedFiles.filter(f => f.status === 'compressing' || f.status === 'analyzing').length} files)
                    </>
                 ) : (
                      `Start Optimization (${selectedFiles.filter(f => f.status === 'pending' || f.status === 'error').length} files)`
                 )}
            </Button>
          </CardFooter>
        </Card>
    </TooltipProvider>
  );
});

FileCompression.displayName = 'FileCompression';
