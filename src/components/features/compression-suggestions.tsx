'use client';

import type { SuggestFilesForCompressionOutput } from '@/ai/flows/suggest-files-for-compression';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { File, Image as ImageIcon, FileAudio, Video, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { analyzeCompressionQuality, AnalyzeCompressionQualityOutput } from '@/ai/flows/analyze-compression-quality';
import { useState } from 'react';

interface CompressionSuggestionsProps {
  suggestions: SuggestFilesForCompressionOutput;
}

export function CompressionSuggestions({ suggestions }: CompressionSuggestionsProps) {
  const { toast } = useToast();
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalyzeCompressionQualityOutput | 'loading' | 'error'>>({});


  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

 const getFileIcon = (fileType: string) => {
    fileType = fileType.toLowerCase();
    if (fileType.includes('image')) return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
    if (fileType.includes('audio')) return <FileAudio className="h-5 w-5 text-muted-foreground" />;
    if (fileType.includes('video')) return <Video className="h-5 w-5 text-muted-foreground" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const handleCompressClick = (filePath: string, fileName: string) => {
     // TODO: Implement actual compression logic or trigger compression in the main component
    console.log(`Compressing file: ${filePath}`);
    toast({
      title: "Compression Initiated (Simulated)",
      description: `Compression started for ${fileName}.`,
    });
  };

 const handleAnalyzeClick = async (filePath: string, fileName: string) => {
    setAnalysisResults(prev => ({ ...prev, [filePath]: 'loading' }));
    try {
       // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In a real app, you would call the AI flow here.
      // Using placeholder data due to limitations on accessing local file paths from server action.
       const dummyAnalysis: AnalyzeCompressionQualityOutput = {
            shouldCompress: Math.random() > 0.2, // 80% chance to recommend compression
            compressionRatio: Math.random() * (0.8 - 0.4) + 0.4, // Random ratio between 0.4 and 0.8
            qualityLossDescription: Math.random() > 0.5 ? "Minimal quality loss expected." : "Some quality loss possible, especially at higher levels."
        };
      const result = dummyAnalysis;
      // const result = await analyzeCompressionQuality({ filePath });


      setAnalysisResults(prev => ({ ...prev, [filePath]: result }));
       toast({
            title: `Analysis Complete for ${fileName}`,
            description: result.shouldCompress
                ? `Recommended for compression. Est. Ratio: ${result.compressionRatio?.toFixed(2)}. ${result.qualityLossDescription || ''}`
                : `Compression may not be efficient. ${result.qualityLossDescription || ''}`,
        });
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResults(prev => ({ ...prev, [filePath]: 'error' }));
      toast({
        title: "Analysis Error",
        description: `Failed to analyze ${fileName}.`,
        variant: "destructive",
      });
    }
  };


  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="text-center py-10">
         <CardHeader>
           <CardTitle>No Suggestions</CardTitle>
         </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No files currently suggested for compression. Check back later!</p>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card>
        <CardContent className="p-0">
           <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((item) => {
                 const analysis = analysisResults[item.path];
                 const isLoadingAnalysis = analysis === 'loading';
                 const analysisError = analysis === 'error';
                 const analysisData = typeof analysis === 'object' ? analysis : null;

                 return (
                    <TableRow key={item.path} className="hover:bg-muted/50 transition-colors">
                        <TableCell>{getFileIcon(item.type)}</TableCell>
                        <TableCell className="font-medium truncate max-w-xs">{item.name}</TableCell>
                        <TableCell className="text-right">{formatFileSize(item.size)}</TableCell>
                        <TableCell>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="flex items-center cursor-default">
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    Reason
                                </Badge>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start">
                                <p className="text-sm">{item.compressionRecommendation}</p>
                            </TooltipContent>
                            </Tooltip>
                                {analysisData && (
                                <p className={`text-xs mt-1 ${analysisData.shouldCompress ? 'text-green-600' : 'text-orange-600'}`}>
                                    {analysisData.shouldCompress ? 'Analysis: OK to compress.' : 'Analysis: Compression may not be ideal.'}
                                    {analysisData.qualityLossDescription && ` ${analysisData.qualityLossDescription}`}
                                </p>
                            )}
                            {analysisError && <p className="text-xs text-destructive mt-1">Analysis failed.</p>}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                             <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAnalyzeClick(item.path, item.name)}
                                disabled={isLoadingAnalysis}
                                >
                                {isLoadingAnalysis ? 'Analyzing...' : (analysisData || analysisError ? 'Re-analyze' : 'Analyze')}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleCompressClick(item.path, item.name)}
                                disabled={isLoadingAnalysis || (analysisData && !analysisData.shouldCompress)}
                                title={analysisData && !analysisData.shouldCompress ? "Compression not recommended by analysis" : ""}
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
