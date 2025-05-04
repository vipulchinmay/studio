// src/components/features/compression-suggestions.tsx
'use client';

import type { SuggestFilesForCompressionOutput } from '@/ai/flows/suggest-files-for-compression';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { File as FileIconLucide, Image as ImageIcon, FileAudio, Video, Info, BrainCircuit, Check, AlertTriangle, Loader2, RefreshCcw, Download, FileArchive, Cloud, Database, FileText } from 'lucide-react'; // Added more icons
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { analyzeCompressionQuality, AnalyzeCompressionQualityOutput, AnalyzeCompressionQualityInput } from '@/ai/flows/analyze-compression-quality';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress'; // Import Progress
import { motion, AnimatePresence } from 'framer-motion'; // Import framer-motion

interface CompressionSuggestionsProps {
  suggestions: SuggestFilesForCompressionOutput;
  onCompressRequest: (filePath: string, fileName: string) => void; // Callback to request adding file to local queue
  isLoggedIn: boolean;
  // Add a callback for direct cloud compression if implemented later
  // onCompressCloudFile: (filePath: string, options: any) => Promise<void>;
}

type AnalysisState = AnalyzeCompressionQualityOutput | 'loading' | 'error' | 'idle';
// Add state for direct cloud compression simulation
type CloudCompressState = 'idle' | 'compressing' | 'complete' | 'error';

export function CompressionSuggestions({ suggestions, onCompressRequest, isLoggedIn }: CompressionSuggestionsProps) {
  const { toast } = useToast();
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisState>>({});
  // State to track cloud compression status per file
  const [cloudCompressStates, setCloudCompressStates] = useState<Record<string, CloudCompressState>>({});
  const [cloudCompressProgress, setCloudCompressProgress] = useState<Record<string, number>>({});
  const [compressedCloudFileData, setCompressedCloudFileData] = useState<Record<string, { name: string, size: number, path: string }>>({}); // Store simulated compressed data

  const formatFileSize = (bytes: number): string => {
    if (bytes < 0 || bytes === undefined || bytes === null) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const precision = i < 2 ? 1 : 2;
    return parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + ' ' + sizes[i];
  };

 const getFileIcon = (fileType: string) => {
    fileType = fileType?.toLowerCase() || ''; // Handle undefined type
    if (fileType.includes('image')) return <ImageIcon className="h-5 w-5 text-purple-500" />; // Purple for images
    if (fileType.includes('audio')) return <FileAudio className="h-5 w-5 text-blue-500" />; // Blue for audio
    if (fileType.includes('video')) return <Video className="h-5 w-5 text-red-500" />; // Red for video
    if (fileType.includes('zip') || fileType.includes('archive') || fileType.includes('tar') || fileType.includes('gz')) return <FileArchive className="h-5 w-5 text-orange-500" />; // Orange for archives
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />; // Use specific icon for PDF
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <FileText className="h-5 w-5 text-orange-600" />; // Orange-red for presentations
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <Database className="h-5 w-5 text-green-600" />; // Green for spreadsheets/data
    if (fileType.includes('document') || fileType.includes('word')) return <FileText className="h-5 w-5 text-blue-600" />; // Blue for docs
    if (fileType.includes('text') || fileType.includes('log') || fileType.includes('csv')) return <FileText className="h-5 w-5 text-gray-500" />; // Gray for text/logs
    return <FileIconLucide className="h-5 w-5 text-muted-foreground" />; // Default icon
  };

  // Renamed to reflect adding to the *local* compression queue
  const handleAddToQueueClick = (filePath: string, fileName: string) => {
     if (!isLoggedIn) {
      toast({ title: "Login Required", description: "Please log in to manage files.", variant: "destructive" });
      return;
     }
    console.log(`Requesting to add to local queue: ${filePath}`);
    onCompressRequest(filePath, fileName); // Use the callback to add to the FileCompression component
     // Toast handled by the parent page now
  };

  const handleAnalyzeClick = useCallback(async (filePath: string, fileName: string, fileSize: number, fileType: string) => {
    if (!isLoggedIn) {
       toast({ title: "Login Required", description: "Please log in to analyze files.", variant: "destructive" });
       return;
     }
    setAnalysisResults(prev => ({ ...prev, [filePath]: 'loading' }));

    const analysisInput: AnalyzeCompressionQualityInput = { filePath };

    try {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 800));

      // *** Use improved dummy analysis data based on file info ***
      // In a real application, call the actual AI flow:
      // const result = await analyzeCompressionQuality(analysisInput);

      let shouldCompress = true;
      let recommendedMethod: AnalyzeCompressionQualityOutput['recommendedMethod'] = 'lossless_optimized';
      let estimatedReductionPercent: number | undefined = 50;
      let qualityImpactDescription = "No quality loss with optimization.";

      const lowerCaseType = fileType?.toLowerCase() || '';
       if (lowerCaseType.includes('jpeg') || lowerCaseType.includes('jpg') || lowerCaseType.includes('mp3') || lowerCaseType.includes('aac') || lowerCaseType.includes('mp4') || lowerCaseType.includes('mov') || lowerCaseType.includes('zip') || lowerCaseType.includes('7z') || lowerCaseType.includes('gz') || lowerCaseType.includes('heic')) {
           estimatedReductionPercent = Math.floor(5 + Math.random() * 20);
           recommendedMethod = fileSize > 5 * 1024 * 1024 ? 'lossy_high_quality' : 'lossless_optimized'; // Larger files maybe lossy ok
           qualityImpactDescription = "Potential minor reduction via re-optimization.";
           if (fileSize < 1024 * 100) {
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

       // Simulate uncompressible case sometimes
       if (Math.random() < 0.1 && fileSize > 1024 * 1024) {
            shouldCompress = false;
            recommendedMethod = 'none';
            estimatedReductionPercent = undefined;
            qualityImpactDescription = "File type/content suggests compression won't be effective.";
       }


      const result: AnalyzeCompressionQualityOutput = {
            shouldCompress,
            recommendedMethod,
            estimatedReductionPercent,
            qualityImpactDescription
      };

      setAnalysisResults(prev => ({ ...prev, [filePath]: result }));
       toast({
            title: `Analysis: ${fileName}`,
             description: (
                <div className="text-sm space-y-1">
                    <p>Recommendation: <span className="font-medium">{result.recommendedMethod.replace(/_/g, ' ')}</span></p>
                    {result.estimatedReductionPercent !== undefined && (
                        <p>Est. Reduction: <span className="font-medium">~{result.estimatedReductionPercent}%</span></p>
                    )}
                    <p>Quality Impact: <span className="italic">{result.qualityImpactDescription}</span></p>
                     {!result.shouldCompress && result.recommendedMethod === 'none' && (
                        <p className="text-orange-600 dark:text-orange-500 text-xs mt-1">Optimization may not be effective.</p>
                     )}
                </div>
            ),
             duration: 6000, // Longer duration for analysis results
        });
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResults(prev => ({ ...prev, [filePath]: 'error' }));
      toast({
        title: "Analysis Error",
        description: `Failed to analyze ${fileName}. Please try again.`,
        variant: "destructive",
      });
    }
  }, [isLoggedIn, toast]);


   // --- Simulate Direct Cloud Compression ---
   const handleCompressCloudFile = useCallback(async (filePath: string, fileName: string, originalSize: number) => {
     if (!isLoggedIn) {
       toast({ title: "Login Required", description: "Please log in to compress cloud files.", variant: "destructive" });
       return;
     }

     const analysis = analysisResults[filePath];
     const analysisData = typeof analysis === 'object' ? analysis as AnalyzeCompressionQualityOutput : null;

     // Use analysis recommendation if available, default to lossless
     const method = analysisData?.recommendedMethod || 'lossless_optimized';
     // Use estimated reduction, default to 50% if no analysis, but cap reduction more reasonably for simulation
     const baseEstimatedReduction = (analysisData?.estimatedReductionPercent ?? 50);
     // Make simulation slightly less optimistic than analysis
     const simulatedReductionPercent = Math.max(5, Math.min(90, baseEstimatedReduction * (0.8 + Math.random() * 0.3)));
     const estimatedReduction = simulatedReductionPercent / 100;


     setCloudCompressStates(prev => ({ ...prev, [filePath]: 'compressing' }));
     setCloudCompressProgress(prev => ({ ...prev, [filePath]: 0 }));
     setCompressedCloudFileData(prev => ({ ...prev, [filePath]: undefined! })); // Clear previous result

     try {
       // Simulate compression time based on size
       const totalTime = 1500 + Math.log10(Math.max(1024, originalSize)) * 500 + Math.random() * 1000;
       const steps = 20;
       const stepTime = totalTime / steps;

       for (let i = 1; i <= steps; i++) {
         await new Promise(resolve => setTimeout(resolve, stepTime));
         setCloudCompressProgress(prev => ({ ...prev, [filePath]: Math.min(99, (i / steps) * 100) }));
       }

       // Simulate result
       const reductionFactor = (1 - estimatedReduction);
       const compressedSize = Math.max(50, Math.floor(originalSize * reductionFactor));
       const compressedFileName = fileName.replace(/(\.[^.]+)$/, `-optimized$1`); // Use '-optimized' suffix
       const compressedPath = filePath.replace(/(\.[^.]+)$/, `-optimized$1`); // Simulate path change

       setCompressedCloudFileData(prev => ({ ...prev, [filePath]: { name: compressedFileName, size: compressedSize, path: compressedPath } }));
       setCloudCompressStates(prev => ({ ...prev, [filePath]: 'complete' }));
       setCloudCompressProgress(prev => ({ ...prev, [filePath]: 100 }));

       toast({
         title: "Cloud Optimization Complete",
         description: `${fileName} optimized to ${formatFileSize(compressedSize)} in cloud storage.`,
       });

     } catch (err) {
       console.error("Cloud compression simulation error:", err);
       setCloudCompressStates(prev => ({ ...prev, [filePath]: 'error' }));
       toast({ title: "Cloud Optimization Failed", description: `Could not optimize ${fileName}.`, variant: "destructive" });
     }
   }, [isLoggedIn, toast, analysisResults]);

   // Simulate download of the "compressed" cloud file
   const handleDownloadCloudFile = (filePath: string) => {
       const compressedData = compressedCloudFileData[filePath];
       if (!compressedData) {
            toast({title: "Download Error", description: "Optimized file data not found.", variant: "destructive"});
            return;
       }
       // Simulate download with dummy data
       const blob = new Blob([`Simulated optimized cloud data for ${compressedData.name}. Size: ${compressedData.size}`], {type: 'text/plain'});
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = compressedData.name;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       URL.revokeObjectURL(url);
        toast({title: "Download Started", description: `Downloading ${compressedData.name}`});
   };
  // --- End Simulation ---


  // Show placeholder if not logged in
   if (!isLoggedIn) {
      return (
           <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
           >
              <Card className="text-center py-10 border-dashed border-border/50 bg-muted/30 shadow-none">
                  <CardHeader>
                      <CardTitle className="flex items-center justify-center gap-2 text-xl font-semibold text-foreground">
                          <Cloud className="h-6 w-6 text-primary"/> Connect Your Cloud
                       </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">Please log in to view AI-powered optimization suggestions for your cloud files.</p>
                      {/* Login buttons are in the header */}
                  </CardContent>
              </Card>
          </motion.div>
      );
  }

  // Show placeholder if logged in but no suggestions (and not loading)
  if (suggestions.length === 0) {
    return (
       <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
       >
          <Card className="text-center py-10 border-dashed border-border/50 bg-muted/30 shadow-none">
             <CardHeader>
               <CardTitle className="flex items-center justify-center gap-2 text-xl font-semibold text-foreground">
                   <Check className="h-6 w-6 text-green-500"/> All Optimized!
               </CardTitle>
             </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No files currently suggested for optimization. Your storage looks efficient!</p>
               {/* Refresh button is now in the parent page */}
            </CardContent>
          </Card>
        </motion.div>
    );
  }

  return (
      <Card className="shadow-md border border-border/50 overflow-hidden">
          {/* CardHeader removed for a cleaner table look, title moved to parent */}
        <CardContent className="p-0">
           <TooltipProvider delayDuration={100}>
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm"> {/* Subtle bg, sticky header, and backdrop blur */}
              <TableRow>
                <TableHead className="w-[50px] pl-4">Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[200px]">AI Reason</TableHead> {/* Show on large screens */}
                <TableHead className="min-w-[200px]">Analysis</TableHead> {/* Ensure min width */}
                <TableHead className="text-right pr-4 min-w-[180px]">Actions</TableHead> {/* Ensure min width */}
              </TableRow>
            </TableHeader>
            {/* Use AnimatePresence for row animations */}
            <AnimatePresence initial={false}>
                 <TableBody>
                  {suggestions.map((item, index) => {
                     const analysis = analysisResults[item.path] ?? 'idle';
                     const isLoadingAnalysis = analysis === 'loading';
                     const analysisError = analysis === 'error';
                     const analysisData = typeof analysis === 'object' ? analysis as AnalyzeCompressionQualityOutput : null;

                     const cloudState = cloudCompressStates[item.path] ?? 'idle';
                     const isCompressingCloud = cloudState === 'compressing';
                     const isCompleteCloud = cloudState === 'complete';
                     const isErrorCloud = cloudState === 'error';
                     const progressCloud = cloudCompressProgress[item.path] ?? 0;
                     const compressedData = compressedCloudFileData[item.path];

                     const disableActions = isLoadingAnalysis || isCompressingCloud;

                     return (
                         // Wrap TableRow with motion.tr for animation
                         <motion.tr
                            key={item.path}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }} // Exit animation
                            transition={{ duration: 0.3, delay: index * 0.03 }} // Staggered entry
                            layout // Animate layout changes
                            className="hover:bg-muted/40 transition-colors duration-150 align-top border-b last:border-b-0" // Add bottom border
                         >
                            <TableCell className="pl-4 pt-3">{getFileIcon(item.type)}</TableCell>
                            <TableCell className="font-medium pt-3">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="block max-w-[200px] sm:max-w-xs xl:max-w-md truncate cursor-default">{item.name}</span>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{item.name}</p></TooltipContent>
                                </Tooltip>
                                <p className="text-xs text-muted-foreground mt-1 lg:hidden">{item.compressionRecommendation}</p> {/* Show reason on smaller screens */}
                                 {isCompleteCloud && compressedData && (
                                    <div className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                        <Check className="h-3 w-3"/> Optimized: {compressedData.name} ({formatFileSize(compressedData.size)})
                                    </div>
                                )}
                                 {isErrorCloud && (
                                    <div className="mt-1 text-xs text-destructive flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3"/> Cloud optimization failed.
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap pt-3">{formatFileSize(item.size)}</TableCell>
                            <TableCell className="hidden lg:table-cell pt-3">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="flex items-center cursor-default text-sm text-muted-foreground">
                                            <Info className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500" /> {/* Colored info icon */}
                                            {item.compressionRecommendation.length > 50 ? item.compressionRecommendation.substring(0, 47) + '...' : item.compressionRecommendation}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="start" className="text-xs"> {/* Smaller tooltip */}
                                        <p className="max-w-xs">{item.compressionRecommendation}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                             <TableCell className="pt-3">
                                 {/* Analysis Trigger & Display */}
                                 <div className="flex items-center gap-2">
                                    {analysis === 'idle' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs hover:bg-blue-500/10 text-blue-600 dark:text-blue-400" // Themed analyze button
                                            onClick={() => handleAnalyzeClick(item.path, item.name, item.size, item.type)}
                                            disabled={disableActions}
                                        >
                                            <BrainCircuit className="h-4 w-4 mr-1" /> Analyze
                                        </Button>
                                    )}
                                    {isLoadingAnalysis && <><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-xs italic text-muted-foreground">Analyzing...</span></>}
                                    {analysisError && (
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                {/* Make error clickable to retry */}
                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAnalyzeClick(item.path, item.name, item.size, item.type)} disabled={disableActions}>
                                                    <AlertTriangle className="h-4 w-4 mr-1"/> Retry Analysis
                                                </Button>
                                             </TooltipTrigger>
                                             <TooltipContent><p>Analysis failed. Click to retry.</p></TooltipContent>
                                         </Tooltip>
                                    )}
                                    {analysisData && (
                                        <div className="flex items-center gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                     <Badge
                                                        variant={analysisData.recommendedMethod === 'none' ? 'secondary' : analysisData.shouldCompress ? 'default' : 'outline'}
                                                         className={cn("cursor-help font-normal flex items-center gap-1 text-[10px] leading-tight py-0.5", // Smaller badge
                                                            analysisData.recommendedMethod !== 'none' && !analysisData.shouldCompress && "text-orange-600 dark:text-orange-500 border-orange-500/50 bg-orange-500/10",
                                                             analysisData.recommendedMethod !== 'none' && analysisData.shouldCompress && "text-green-600 dark:text-green-400 border-green-500/50 bg-green-500/10", // Subtle green bg
                                                             analysisData.recommendedMethod === 'none' && "opacity-70 bg-muted/60"
                                                        )}
                                                     >
                                                        <BrainCircuit className="h-3 w-3"/> {analysisData.recommendedMethod.replace(/_/g, ' ')}
                                                         {analysisData.estimatedReductionPercent !== undefined ? ` (~${analysisData.estimatedReductionPercent}%)` : ''}
                                                     </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" align="start" className="max-w-xs text-xs"> {/* Smaller tooltip */}
                                                    <p className="font-medium mb-1">{analysisData.recommendedMethod.replace(/_/g, ' ')} Recommended</p>
                                                    <p className="text-muted-foreground">{analysisData.qualityImpactDescription}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/50" // Subtle re-analyze
                                                onClick={() => handleAnalyzeClick(item.path, item.name, item.size, item.type)}
                                                disabled={disableActions}
                                                aria-label="Re-analyze"
                                            >
                                                 <RefreshCcw className="h-3 w-3" />
                                             </Button>
                                        </div>
                                    )}
                                 </div>
                            </TableCell>
                             <TableCell className="text-right pr-4 pt-3 space-y-1.5">
                               {isCompressingCloud ? (
                                 <div className="flex flex-col items-end">
                                   <Progress value={progressCloud} className="h-1.5 w-24 mb-1 rounded-full" />
                                   <span className="text-xs text-muted-foreground italic">Optimizing...</span>
                                 </div>
                               ) : isCompleteCloud && compressedData ? (
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDownloadCloudFile(item.path)}
                                      className="h-8 text-green-600 hover:text-green-700 border-green-500/50 hover:bg-green-500/10" // Themed download
                                      aria-label={`Download ${compressedData.name}`}
                                  >
                                       <Download className="mr-1 h-4 w-4"/> Download
                                  </Button>
                               ) : (
                                // Show primary action: Compress in Cloud (Simulated)
                                <Tooltip>
                                   <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            onClick={() => handleCompressCloudFile(item.path, item.name, item.size)}
                                            disabled={disableActions || (analysisData && analysisData.recommendedMethod === 'none')}
                                            className="h-8 w-full sm:w-auto shadow-sm hover:shadow-md" // Added shadow
                                            aria-label={`Optimize ${item.name} in cloud`}
                                        >
                                           Optimize Cloud File
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" align="end" className="text-xs"> {/* Left tooltip */}
                                        <p>{(analysisData && analysisData.recommendedMethod === 'none') ? "AI suggests optimization is not beneficial." : "Optimize this file directly in cloud storage (Simulated)."}</p>
                                    </TooltipContent>
                                </Tooltip>
                               )}
                                {/* Secondary action: Add to local queue */}
                                 {!isCompressingCloud && !isCompleteCloud && (
                                     <Tooltip>
                                        <TooltipTrigger asChild>
                                             <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddToQueueClick(item.path, item.name)}
                                                disabled={disableActions}
                                                className="h-8 w-full sm:w-auto text-xs hover:bg-accent/50 hover:text-accent-foreground" // Subtle outline hover
                                                 aria-label={`Add ${item.name} to local optimization queue`}
                                            >
                                                 Add to Local Queue
                                             </Button>
                                         </TooltipTrigger>
                                         <TooltipContent side="left" align="end" className="text-xs"><p>Add to the optimization queue below (downloads if needed).</p></TooltipContent>
                                     </Tooltip>
                                 )}
                            </TableCell>
                        </motion.tr>
                     );
                   })}
                 </TableBody>
              </AnimatePresence>
          </Table>
         </TooltipProvider>
        </CardContent>
      </Card>
  );
}
