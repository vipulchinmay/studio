// src/components/features/compression-suggestions.tsx
'use client';

import type { SuggestFilesForCompressionOutput } from '@/ai/flows/suggest-files-for-compression';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { File, Image as ImageIcon, FileAudio, Video, Info, BrainCircuit, Check, AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { analyzeCompressionQuality, AnalyzeCompressionQualityOutput } from '@/ai/flows/analyze-compression-quality';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CompressionSuggestionsProps {
  suggestions: SuggestFilesForCompressionOutput;
  onCompressRequest: (filePath: string, fileName: string) => void; // Callback to request compression
  isLoggedIn: boolean; // Pass login status
}

type AnalysisState = AnalyzeCompressionQualityOutput | 'loading' | 'error' | 'idle';

export function CompressionSuggestions({ suggestions, onCompressRequest, isLoggedIn }: CompressionSuggestionsProps) {
  const { toast } = useToast();
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisState>>({});

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const precision = i < 2 ? 1 : 2;
    return parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + ' ' + sizes[i];
  };

 const getFileIcon = (fileType: string) => {
    fileType = fileType.toLowerCase();
    if (fileType.includes('image')) return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
    if (fileType.includes('audio')) return <FileAudio className="h-5 w-5 text-muted-foreground" />;
    if (fileType.includes('video')) return <Video className="h-5 w-5 text-muted-foreground" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const handleCompressClick = (filePath: string, fileName: string) => {
     if (!isLoggedIn) {
      toast({ title: "Login Required", description: "Please log in to compress files.", variant: "destructive" });
      return;
     }
    console.log(`Requesting compression for: ${filePath}`);
    onCompressRequest(filePath, fileName); // Use the callback
     toast({
      title: "Compression Requested",
      description: `${fileName} added to the compression queue.`,
    });
  };

 const handleAnalyzeClick = async (filePath: string, fileName: string) => {
    if (!isLoggedIn) {
       toast({ title: "Login Required", description: "Please log in to analyze files.", variant: "destructive" });
       return;
     }
    setAnalysisResults(prev => ({ ...prev, [filePath]: 'loading' }));
    try {
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 800));

      // *** Use dummy analysis data - replace with actual AI call ***
      // const result = await analyzeCompressionQuality({ filePath });
      const shouldCompress = Math.random() > 0.1; // 90% chance to recommend
      const dummyAnalysis: AnalyzeCompressionQualityOutput = {
            shouldCompress: shouldCompress,
            compressionRatio: Math.random() * (0.55 - 0.3) + 0.3, // Ratio between 0.3 (70% reduction) and 0.55 (45% reduction)
            qualityLossDescription: shouldCompress
                ? (Math.random() > 0.3 ? "Lossless optimization recommended for best results." : "Excellent candidate for high compression.")
                : "File might be efficiently compressed already. Lossless optimization may still offer benefits."
      };
      const result = dummyAnalysis;

      setAnalysisResults(prev => ({ ...prev, [filePath]: result }));
       toast({
            title: `Analysis Complete: ${fileName}`,
            description: (
                 <>
                    {result.shouldCompress
                        ? `Compression viable. ${result.qualityLossDescription || ''}`
                        : `Compression may not be significantly beneficial. ${result.qualityLossDescription || ''}`
                    }
                     {result.compressionRatio && ` Est. reduction: ${((1 - result.compressionRatio) * 100).toFixed(0)}%`}
                 </>
             ),
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
  };

  // Show placeholder if not logged in or no suggestions
   if (!isLoggedIn) {
      return (
          <Card className="text-center py-10 border-dashed">
              <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2"><Info className="h-6 w-6 text-primary"/> Suggestions Unavailable</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">Please log in to get personalized file compression suggestions based on your cloud storage.</p>
                  {/* Maybe add login buttons here? */}
              </CardContent>
          </Card>
      );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="text-center py-10 border-dashed">
         <CardHeader>
           <CardTitle className="flex items-center justify-center gap-2"><Check className="h-6 w-6 text-green-500"/> All Optimized!</CardTitle>
         </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No files currently suggested for compression. Looks like your storage is in good shape!</p>
           <Button variant="outline" size="sm" className="mt-4" onClick={() => console.log("Trigger manual scan or refresh")}>
                <RefreshCcw className="mr-2 h-4 w-4"/> Re-scan Files
            </Button>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card className="shadow-md">
          <CardHeader>
              <CardTitle>AI Compression Suggestions</CardTitle>
              <CardDescription>Based on file size and type, we recommend compressing these items.</CardDescription>
          </CardHeader>
        <CardContent className="p-0">
           <TooltipProvider delayDuration={100}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] pl-4">Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="hidden md:table-cell">AI Reason</TableHead>
                <TableHead>Analysis & Action</TableHead>
                <TableHead className="text-right pr-4">Compress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((item) => {
                 const analysis = analysisResults[item.path] ?? 'idle';
                 const isLoadingAnalysis = analysis === 'loading';
                 const analysisError = analysis === 'error';
                 const analysisData = typeof analysis === 'object' ? analysis as AnalyzeCompressionQualityOutput : null;

                 return (
                    <TableRow key={item.path} className="hover:bg-muted/50 transition-colors duration-150">
                        <TableCell className="pl-4">{getFileIcon(item.type)}</TableCell>
                        <TableCell className="font-medium truncate max-w-[200px] sm:max-w-xs" title={item.name}>
                            {item.name}
                            <p className="text-xs text-muted-foreground md:hidden mt-1">{item.compressionRecommendation}</p>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatFileSize(item.size)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="flex items-center cursor-default text-sm text-muted-foreground">
                                        <Info className="h-4 w-4 mr-1 flex-shrink-0" />
                                        {item.compressionRecommendation.length > 40 ? item.compressionRecommendation.substring(0, 37) + '...' : item.compressionRecommendation}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start">
                                    <p className="max-w-xs">{item.compressionRecommendation}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TableCell>
                         <TableCell>
                            {/* Analysis Result Display */}
                             <div className="flex items-center gap-2">
                                {isLoadingAnalysis && <><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-xs italic text-muted-foreground">Analyzing...</span></>}
                                {analysisError && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="destructive" className="cursor-help flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3"/> Error
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Analysis failed. Please try again.</p></TooltipContent>
                                    </Tooltip>
                                )}
                                {analysisData && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant={analysisData.shouldCompress ? 'default' : 'secondary'} className={cn("cursor-help flex items-center gap-1", analysisData.shouldCompress ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700" : "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700")}>
                                                <BrainCircuit className="h-3 w-3"/> {analysisData.shouldCompress ? 'Compress OK' : 'Caution'}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start">
                                            <p className="max-w-xs text-sm">{analysisData.qualityLossDescription}</p>
                                            {analysisData.compressionRatio && <p className="text-xs text-muted-foreground mt-1">Est. Reduction: ~{((1 - analysisData.compressionRatio) * 100).toFixed(0)}%</p>}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                 {/* Analyze/Re-analyze Button */}
                                 <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleAnalyzeClick(item.path, item.name)}
                                    disabled={isLoadingAnalysis}
                                >
                                    {analysis === 'idle' ? 'Analyze' : 'Re-analyze'}
                                </Button>
                             </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                             <Button
                                size="sm"
                                onClick={() => handleCompressClick(item.path, item.name)}
                                disabled={isLoadingAnalysis || (analysisData && !analysisData.shouldCompress)}
                                title={analysisData && !analysisData.shouldCompress ? "AI analysis suggests compression might not be efficient or could cause quality loss." : `Compress ${item.name}`}
                            >
                                Compress
                            </Button>
                        </TableCell>
                    </TableRow>
                 );
               })}
            </TableBody>
          </Table>
         </TooltipProvider>
        </CardContent>
      </Card>
  );
}
