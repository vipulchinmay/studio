// src/components/features/file-compression.tsx
'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'; // Added forwardRef, useImperativeHandle
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, File as FileIconLucide, X, CheckCircle, AlertCircle, Image as ImageIcon, FileAudio, Video, Download, Loader2, BrainCircuit } from 'lucide-react'; // Renamed File to FileIconLucide
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { analyzeCompressionQuality, AnalyzeCompressionQualityOutput, AnalyzeCompressionQualityInput } from '@/ai/flows/analyze-compression-quality';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components
import { motion, AnimatePresence } from 'framer-motion'; // Import framer-motion

type CompressionLevel = 'lossless_optimized' | 'high' | 'medium' | 'low'; // Reordered, lossless is default
type FileStatus = 'pending' | 'uploading' | 'analyzing' | 'compressing' | 'complete' | 'error';

// Extended SelectedFile to include source information
interface SelectedFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  originalSize: number;
  compressedSize?: number;
  compressedBlob?: Blob; // Store compressed Blob for download
  compressedFileName?: string; // Store the suggested filename for download
  error?: string;
  analysis?: AnalyzeCompressionQualityOutput | null;
  source?: 'local' | 'cloud'; // Added source information
  sourcePath?: string; // Original path for cloud files
}

// Define the handle type that will be exposed via the ref
export interface FileCompressionHandle {
  addFileToLocalQueue: (file: File, sourceInfo?: { path: string; originalSize: number }) => void;
}


// Wrap the component with forwardRef
export const FileCompression = forwardRef<FileCompressionHandle, {}>((props, ref) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('lossless_optimized'); // Default to best option
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

   // Expose the addFileToLocalQueue function via useImperativeHandle
   useImperativeHandle(ref, () => ({
     addFileToLocalQueue: (file, sourceInfo) => {
       console.log("FileCompression: addFileToLocalQueue called via ref", file.name, sourceInfo);
       const newFile: SelectedFile = {
         id: `${file.name}-${sourceInfo?.originalSize ?? file.size}-${Date.now()}`, // Use original size if available
         file: file, // Store the dummy File object
         status: 'pending',
         progress: 0,
         originalSize: sourceInfo?.originalSize ?? file.size,
         source: 'cloud', // Mark as cloud source
         sourcePath: sourceInfo?.path,
       };
       setSelectedFiles(prev => [...prev, newFile]);
        // Immediately start analysis for the added cloud file
        analyzeFile(newFile.id, file.name, newFile.originalSize, file.type);
     }
   }));


  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-muted-foreground" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="h-6 w-6 text-muted-foreground" />;
    if (fileType.startsWith('video/')) return <Video className="h-6 w-6 text-muted-foreground" />;
    return <FileIconLucide className="h-6 w-6 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 0 || bytes === undefined || bytes === null) return 'N/A'; // Handle potential invalid size
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Ensure minimum precision for small files, more for larger ones
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
     const newFiles: SelectedFile[] = files.map(file => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      file,
      status: 'pending',
      progress: 0,
      originalSize: file.size,
      source: 'local', // Mark as local source
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(nf => analyzeFile(nf.id, nf.file.name, nf.file.size, nf.file.type)); // Pass more info for analysis
  };

 const analyzeFile = useCallback(async (fileId: string, fileName: string, fileSize: number, fileType: string) => {
    setSelectedFiles(prevFiles =>
      prevFiles.map(f => f.id === fileId ? { ...f, status: 'analyzing', progress: 0 } : f)
    );

    // Simulate getting a file path for the AI flow - this remains a limitation
    // without actual file system access or cloud integration. Use sourcePath if available.
     const targetFile = selectedFiles.find(f => f.id === fileId);
     const simulatedFilePath = targetFile?.sourcePath || `/local/${fileName}`;

    const analysisInput: AnalyzeCompressionQualityInput = {
      filePath: simulatedFilePath // Pass the simulated or actual cloud path
    };

    try {
        // Simulate API call delay for analysis
       await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

       // *** Use improved dummy analysis data based on file info ***
       // In a real application, call the actual AI flow:
       // const analysisResult = await analyzeCompressionQuality(analysisInput);

       let shouldCompress = true;
       let recommendedMethod: AnalyzeCompressionQualityOutput['recommendedMethod'] = 'lossless_optimized';
       let estimatedReductionPercent: number | undefined = 50; // Default optimistic reduction
       let qualityImpactDescription = "No quality loss with optimization.";

       // More refined dummy logic based on type and size
       const lowerCaseType = fileType.toLowerCase();
       if (lowerCaseType.includes('jpeg') || lowerCaseType.includes('jpg') || lowerCaseType.includes('mp3') || lowerCaseType.includes('aac') || lowerCaseType.includes('mp4') || lowerCaseType.includes('mov') || lowerCaseType.includes('zip') || lowerCaseType.includes('7z') || lowerCaseType.includes('gz') || lowerCaseType.includes('heic')) {
           // Typically already compressed, but optimization might help
           estimatedReductionPercent = Math.floor(5 + Math.random() * 20); // 5-25% reduction potential
           recommendedMethod = fileSize > 10 * 1024 * 1024 ? 'lossy_high_quality' : 'lossless_optimized'; // Suggest re-encoding/optimization, more likely for larger files
           qualityImpactDescription = "Potential minor reduction via re-optimization.";
           if (fileSize < 1024 * 200) { // Small already-compressed files (increased threshold)
             shouldCompress = false;
             recommendedMethod = 'none';
             estimatedReductionPercent = undefined;
             qualityImpactDescription = "Likely already efficiently compressed.";
           }
       } else if (lowerCaseType.includes('png') || lowerCaseType.includes('gif') || lowerCaseType.includes('tiff') || lowerCaseType.includes('bmp') ) {
           recommendedMethod = 'lossless_optimized';
           estimatedReductionPercent = Math.floor(20 + Math.random() * 40); // 20-60% for lossless image types
           qualityImpactDescription = "Good candidate for lossless optimization.";
       } else if (lowerCaseType.includes('wav') || lowerCaseType.includes('aiff')) {
           recommendedMethod = 'lossless_optimized'; // e.g., FLAC
           estimatedReductionPercent = Math.floor(40 + Math.random() * 30); // 40-70% for lossless audio
           qualityImpactDescription = "Significant savings via lossless audio codec (e.g., FLAC).";
       } else if (lowerCaseType.includes('text') || lowerCaseType.includes('csv') || lowerCaseType.includes('log') || lowerCaseType.includes('html') || lowerCaseType.includes('css') || lowerCaseType.includes('js') || lowerCaseType.includes('json') || lowerCaseType.includes('xml')) {
           recommendedMethod = 'lossless_optimized'; // e.g., Gzip/Deflate
           estimatedReductionPercent = Math.floor(60 + Math.random() * 30); // 60-90% for text
           qualityImpactDescription = "Highly compressible with no quality loss.";
       } else {
           // Default for unknown or other types (like PDF, DOCX which can vary)
            recommendedMethod = fileSize > 20 * 1024 * 1024 ? 'lossy_balanced' : 'lossless_optimized'; // Default to lossless for smaller unknown, balanced for larger
           estimatedReductionPercent = Math.floor(30 + Math.random() * 40); // 30-70% general guess
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
             // Also update the recommended compression level based on analysis
             // This is a UI hint, actual compression uses the selected level
             const recommendedLevel = analysisResult.recommendedMethod.startsWith('lossless') ? 'lossless_optimized'
                                : analysisResult.recommendedMethod === 'lossy_high_quality' ? 'high'
                                : analysisResult.recommendedMethod === 'lossy_balanced' ? 'medium'
                                : 'low'; // Default to low if 'none' or other unexpected
             // Uncomment below if you want to auto-select the recommended level
             // if (analysisResult.shouldCompress && analysisResult.recommendedMethod !== 'none') {
             //   setCompressionLevel(recommendedLevel);
             // }
            return { ...f, status: 'pending', analysis: analysisResult }; // Always go back to pending after analysis
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
            duration: 5000, // Show analysis toast longer
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
 }, [toast, selectedFiles]); // Added selectedFiles dependency


  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
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
      // Skip compression if AI analysis recommends 'none' and user didn't override?
      // For now, we compress regardless of recommendation if user clicks the button.
      // if (selectedFile.analysis?.recommendedMethod === 'none') {
      //   toast({ title: "Skipped", description: `${selectedFile.file.name} was not compressed as analysis recommended against it.`});
      //   return;
      // }

      setSelectedFiles(prevFiles =>
        prevFiles.map(f => f.id === selectedFile.id ? { ...f, status: 'compressing', progress: 0, error: undefined } : f)
      );

      try {
         // Simulate a more realistic compression time
         const baseTime = 500 + Math.random() * 1000;
         const sizeFactor = Math.log10(Math.max(1024, selectedFile.originalSize)) / 3;
         const levelFactor = compressionLevel === 'low' ? 0.7 : compressionLevel === 'medium' ? 1 : compressionLevel === 'high' ? 1.6 : 1.3; // lossless takes moderate time
         const totalTime = baseTime * sizeFactor * levelFactor;
         const steps = 15; // More steps for smoother progress
         const stepTime = totalTime / steps;


        for (let i = 1; i <= steps; i++) {
           await new Promise(resolve => setTimeout(resolve, stepTime));
           setSelectedFiles(prevFiles =>
             prevFiles.map(f => f.id === selectedFile.id ? { ...f, progress: Math.min(99, (i / steps) * 100) } : f) // Cap at 99 until truly done
           );
         }

         // *** Enhanced Simulation of Compression Result ***
         let reductionFactor;
         const recommendedMethod = selectedFile.analysis?.recommendedMethod || 'lossless_optimized'; // Use analysis recommendation if available
         const baseReductionEstimate = (selectedFile.analysis?.estimatedReductionPercent ?? 50) / 100; // Use estimated reduction percent

         // Adjust reduction based on selected level vs. recommended
         if (compressionLevel === 'lossless_optimized') {
             // Aim for the estimated lossless reduction, or slightly better if estimate was conservative
             reductionFactor = Math.min(0.9, Math.max(0.1, (1 - baseReductionEstimate) * (0.9 + Math.random() * 0.2))); // 10-90% of original size
             if (!recommendedMethod.startsWith('lossless')) {
                 // If user chose lossless but AI recommended lossy, simulate less effective lossless
                 reductionFactor = Math.min(0.95, Math.max(0.6, reductionFactor * 1.5)); // Less reduction
             }
             // Force significant reduction for highly compressible types even if estimate was low
             const type = selectedFile.file.type.toLowerCase();
             if (type.includes('text') || type.includes('log') || type.includes('wav')) {
                reductionFactor = Math.min(reductionFactor, 0.4); // Ensure at least 60% reduction
             }
         } else {
             // Lossy levels
             const levelEffect = compressionLevel === 'low' ? 1.1 : compressionLevel === 'medium' ? 1.0 : 0.8; // High compression = lower factor (more reduction)
             reductionFactor = Math.min(0.9, Math.max(0.1, (1 - baseReductionEstimate) * levelEffect * (0.85 + Math.random() * 0.3)));

             if (recommendedMethod.startsWith('lossless') && selectedFile.originalSize > 1024) {
                 // If user chose lossy for something AI said was good for lossless (like text), simulate HIGH reduction
                 reductionFactor = Math.min(reductionFactor, 0.3); // Max 70% reduction
             }
         }

          // Ensure reduction meets the "at least half" requirement for non-lossless cases if possible
         if (compressionLevel === 'lossless_optimized' && reductionFactor > 0.5 && baseReductionEstimate > 0.5) {
             reductionFactor = Math.min(0.5, reductionFactor * 0.8); // Try to push it below 50% if estimate was good
         } else if (compressionLevel !== 'lossless_optimized' && reductionFactor > 0.5) {
            // For lossy, more aggressively try to meet 50% if estimate wasn't already bad
            reductionFactor = Math.min(0.5, reductionFactor * 0.7);
         }


         // Ensure minimum size and realistic bounds
         const minCompressedSize = Math.min(1024, Math.max(50, selectedFile.originalSize * 0.05)); // At least 50 bytes or 5%
         const compressedSize = Math.max(minCompressedSize, Math.floor(selectedFile.originalSize * reductionFactor));

         // *** Simulate creating a downloadable Blob ***
         // For cloud files, content might not be available locally, adapt simulation
         let compressedData = `Simulated compressed data for ${selectedFile.file.name} (Level: ${compressionLevel}). Original size: ${selectedFile.originalSize}, Compressed: ${compressedSize}`;
         if (selectedFile.source === 'cloud') {
             compressedData += `\nSource Path: ${selectedFile.sourcePath}`;
         }
         const compressedBlob = new Blob([compressedData], { type: 'text/plain' }); // Simulate as text for simplicity; adjust type if needed

         // Suggest a filename
          const nameParts = selectedFile.file.name.split('.');
          const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
          const baseName = nameParts.join('.');
          // Add a more descriptive suffix
          let suffix = '-compressed';
          if (compressionLevel === 'lossless_optimized') suffix = '-optimized';
          else if (compressionLevel === 'high') suffix = '-high';
          else if (compressionLevel === 'medium') suffix = '-med';
          else if (compressionLevel === 'low') suffix = '-fast';
         const compressedFileName = `${baseName}${suffix}${extension}`;


        setSelectedFiles(prevFiles =>
          prevFiles.map(f => f.id === selectedFile.id ? {
              ...f,
              status: 'complete',
              progress: 100, // Final progress
              compressedSize: compressedSize,
              compressedBlob: compressedBlob, // Store the blob
              compressedFileName: compressedFileName // Store the filename
             } : f)
        );
        toast({
          title: "Compression Complete!",
          description: `${selectedFile.file.name} compressed to ${formatFileSize(compressedSize)}.`,
          variant: 'default',
        });

      } catch (error) {
        console.error('Compression error:', error);
        setSelectedFiles(prevFiles =>
          prevFiles.map(f => f.id === selectedFile.id ? { ...f, status: 'error', error: 'Compression failed' } : f)
        );
        toast({
          title: "Compression Error",
          description: `Failed to compress ${selectedFile.file.name}.`,
          variant: "destructive",
        });
      }
    });
  }, [selectedFiles, compressionLevel, toast]);

   const handleDownload = (file: SelectedFile) => {
    if (!file.compressedBlob || !file.compressedFileName || file.status !== 'complete') {
        toast({ title: "Download Error", description: "Compressed file data is not available.", variant: "destructive"});
        return;
    }

    // Create a URL for the Blob
    const url = URL.createObjectURL(file.compressedBlob);

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = file.compressedFileName; // Use the stored filename

    // Append to the document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the Blob URL to free up memory
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
    // Check relatedTarget to prevent flickering when dragging over child elements
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

  // Calculate overall progress
  const calculateOverallProgress = () => {
    const filesInProgress = selectedFiles.filter(f => f.status === 'compressing' || f.status === 'analyzing');
    if (filesInProgress.length === 0) return 0;

    const totalProgress = filesInProgress.reduce((sum, f) => {
      // Weight analysis as less progress than compression if desired, e.g., max 20%
      const progressValue = f.status === 'analyzing' ? f.progress * 0.2 : f.progress;
      return sum + progressValue;
    }, 0);

    return totalProgress / filesInProgress.length;
  };
  const isProcessingAny = selectedFiles.some(f => f.status === 'compressing' || f.status === 'analyzing');
  const overallProgressValue = calculateOverallProgress();

  // Animation variants for list items
  const listItemVariants = {
      initial: { opacity: 0, y: -10, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };


  return (
    // Wrap with TooltipProvider
    <TooltipProvider delayDuration={100}>
        <Card
          className={cn("transition-all duration-300 border-dashed border-2 relative overflow-hidden shadow-md hover:shadow-lg", // Added shadow
            isDragging ? 'border-primary ring-2 ring-primary/50 shadow-lg' : 'border-muted hover:border-primary/30' // Use primary for hover border too
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        {/* Add a visual overlay for drag state */}
         {isDragging && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-primary/10 z-10 flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm" // Added backdrop blur
            >
                 <Upload className="h-16 w-16 text-primary animate-bounce mb-2" />
                 <p className="text-lg font-medium text-primary">Drop files here</p>
             </motion.div>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Upload className="h-6 w-6 text-primary" /> {/* Make icon primary */}
                 Upload & Optimize
            </CardTitle>
            <CardDescription>Drag & drop files or click below. AI analysis provides optimization insights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
                className={cn(
                    "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 relative z-0", // Ensure content is below overlay
                    isDragging ? "border-primary bg-transparent scale-105" : "border-border hover:border-primary/50 hover:bg-muted/50", // Scale up on drag
                    "group" // Add group class for hover effects on children
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
                accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.csv,.json,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.h,.hpp,.md,.log" // Even more expanded types
              />
               <Label htmlFor="file-upload-input" className="sr-only">Upload files</Label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">File Queue:</h3>
                <ul className="space-y-3 max-h-72 overflow-y-auto pr-2 border rounded-md p-3 bg-background shadow-inner">
                   <AnimatePresence initial={false}>
                  {selectedFiles.map((item) => (
                     <motion.li
                        key={item.id}
                        variants={listItemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout // Animate layout changes (like reordering or height changes)
                        className="flex items-center space-x-3 p-3 bg-card rounded-md shadow-sm hover:bg-muted/80 transition-colors duration-150 relative overflow-hidden border border-transparent hover:border-border" // Added subtle border on hover
                    >
                      {/* Status Indicator Bar */}
                       <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1 rounded-l-md transition-colors duration-300",
                           item.status === 'pending' && 'bg-yellow-400/50',
                           item.status === 'analyzing' && 'bg-blue-400/60 animate-pulse',
                           item.status === 'compressing' && 'bg-primary/70',
                           item.status === 'complete' && 'bg-green-500/70',
                           item.status === 'error' && 'bg-destructive/70'
                       )}></div>
                       {/* Indent content slightly */}
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
                            // Use Tooltip for detailed analysis info
                             <Tooltip>
                                <TooltipTrigger asChild>
                                     <Badge
                                         variant={item.analysis.recommendedMethod === 'none' ? 'secondary' : item.analysis.shouldCompress ? 'default' : 'outline'}
                                         className={cn("cursor-help mt-1 font-normal text-[10px] leading-tight py-0.5", // Adjusted size and padding
                                             !item.analysis.shouldCompress && item.analysis.recommendedMethod !== 'none' && "text-orange-600 dark:text-orange-500 border-orange-500/50 bg-orange-500/10",
                                             item.analysis.shouldCompress && "text-green-600 dark:text-green-400 border-green-500/50 bg-green-500/10", // Added subtle bg
                                              item.analysis.recommendedMethod === 'none' && "opacity-70 bg-muted/50",
                                             // Apply primary color if analysis matches selected compression level (visual cue)
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
                                 <TooltipContent side="bottom" align="start" className="text-xs"> {/* Smaller tooltip text */}
                                    <p className="font-medium mb-1">{item.analysis.recommendedMethod.replace(/_/g, ' ')} Recommended</p>
                                    <p className="text-muted-foreground max-w-xs">{item.analysis.qualityImpactDescription}</p>
                                </TooltipContent>
                             </Tooltip>
                         )}
                      </div>

                       {/* Action Buttons */}
                       <div className="flex-shrink-0 flex items-center gap-1 pl-2"> {/* Added padding */}
                         {item.status === 'complete' ? (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                     <Button variant="outline" size="icon" onClick={() => handleDownload(item)} className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" aria-label={`Download ${item.compressedFileName}`}>
                                       <Download className="h-4 w-4" />
                                     </Button>
                                 </TooltipTrigger>
                                 <TooltipContent><p>Download Optimized File</p></TooltipContent>
                             </Tooltip>
                           ) : item.status === 'error' ? (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      {/* Make error icon clickable to retry analysis/compression? */}
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => analyzeFile(item.id, item.file.name, item.originalSize, item.file.type)} aria-label="Retry Analysis">
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
                           ) : null /* Placeholder for pending */}

                          {/* Remove Button - always show unless processing */}
                          {item.status !== 'compressing' && item.status !== 'analyzing' && (
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeFile(item.id)} aria-label="Remove file">
                                         <X className="h-4 w-4" />
                                     </Button>
                                 </TooltipTrigger>
                                 <TooltipContent><p>Remove File</p></TooltipContent>
                             </Tooltip>
                         )}
                       </div>

                     </motion.li>
                  ))}
                  </AnimatePresence>
                </ul>
              </div>
            )}

            <div className="space-y-3 pt-4"> {/* Added padding top */}
              <Label className="text-base font-medium">Optimization Method</Label>
              <RadioGroup
                value={compressionLevel}
                onValueChange={(value: string) => setCompressionLevel(value as CompressionLevel)}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" // Responsive grid
                aria-label="Compression level selection"
              >
                {/* Lossless Option */}
                 <Label htmlFor="lossless_optimized" className={cn("flex flex-col items-start space-y-1 p-4 border rounded-md transition-all duration-200 cursor-pointer hover:border-primary hover:shadow-sm has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:checked]:shadow-md", compressionLevel === 'lossless_optimized' && "bg-primary/5 border-primary")}>
                    <div className="flex items-center justify-between w-full">
                        <span className="font-medium">Lossless</span>
                         <RadioGroupItem value="lossless_optimized" id="lossless_optimized" className="mt-0" /> {/* Moved radio item */}
                    </div>
                    <p className="text-xs text-muted-foreground">Best quality via smart optimization. Ideal for text, code, PNGs.</p>
                     <Badge variant="outline" className="text-green-600 border-green-500/50 text-[10px] mt-1">Recommended</Badge>
                </Label>
                {/* High Option */}
                 <Label htmlFor="high" className={cn("flex flex-col items-start space-y-1 p-4 border rounded-md transition-all duration-200 cursor-pointer hover:border-primary hover:shadow-sm has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:checked]:shadow-md", compressionLevel === 'high' && "bg-primary/5 border-primary")}>
                     <div className="flex items-center justify-between w-full">
                        <span className="font-medium">High Compression</span>
                         <RadioGroupItem value="high" id="high" className="mt-0" />
                     </div>
                    <p className="text-xs text-muted-foreground">Max size reduction, slight quality loss possible. Good for images/video.</p>
                 </Label>
                 {/* Medium Option */}
                 <Label htmlFor="medium" className={cn("flex flex-col items-start space-y-1 p-4 border rounded-md transition-all duration-200 cursor-pointer hover:border-primary hover:shadow-sm has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:checked]:shadow-md", compressionLevel === 'medium' && "bg-primary/5 border-primary")}>
                     <div className="flex items-center justify-between w-full">
                         <span className="font-medium">Balanced</span>
                          <RadioGroupItem value="medium" id="medium" className="mt-0" />
                     </div>
                    <p className="text-xs text-muted-foreground">Good balance between size reduction and quality/speed.</p>
                 </Label>
                 {/* Low Option */}
                  <Label htmlFor="low" className={cn("flex flex-col items-start space-y-1 p-4 border rounded-md transition-all duration-200 cursor-pointer hover:border-primary hover:shadow-sm has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:checked]:shadow-md", compressionLevel === 'low' && "bg-primary/5 border-primary")}>
                     <div className="flex items-center justify-between w-full">
                         <span className="font-medium">Fastest</span>
                         <RadioGroupItem value="low" id="low" className="mt-0" />
                     </div>
                    <p className="text-xs text-muted-foreground">Quickest compression, less size reduction. Minimal quality impact.</p>
                 </Label>
              </RadioGroup>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 pt-4 border-t bg-muted/30"> {/* Subtle bg for footer */}
            {isProcessingAny && <Progress value={overallProgressValue} className="h-2 rounded-full" aria-label="Overall processing progress"/>}
            <Button
                size="lg"
                onClick={handleCompression}
                disabled={isProcessingAny || selectedFiles.every(f => f.status !== 'pending' && f.status !== 'error') || selectedFiles.length === 0}
                className="w-full transition-all duration-300 ease-in-out transform hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100 shadow-sm hover:shadow-md" // Enhanced button interaction
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
    </TooltipProvider> // Close TooltipProvider
  );
});

FileCompression.displayName = 'FileCompression'; // Add display name for the forwarded ref component
