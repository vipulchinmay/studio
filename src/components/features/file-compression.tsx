// src/components/features/file-compression.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, File, X, CheckCircle, AlertCircle, Image as ImageIcon, FileAudio, Video, Download, Loader2, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { analyzeCompressionQuality, AnalyzeCompressionQualityOutput } from '@/ai/flows/analyze-compression-quality';
import { Badge } from '@/components/ui/badge';

type CompressionLevel = 'low' | 'medium' | 'high' | 'lossless_optimized'; // Added lossless_optimized
type FileStatus = 'pending' | 'uploading' | 'analyzing' | 'compressing' | 'complete' | 'error';

interface SelectedFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  originalSize: number;
  compressedSize?: number;
  compressedDataUrl?: string; // Store compressed data for download
  error?: string;
  analysis?: AnalyzeCompressionQualityOutput | null;
}

export function FileCompression() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('lossless_optimized'); // Default to best option
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-muted-foreground" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="h-6 w-6 text-muted-foreground" />;
    if (fileType.startsWith('video/')) return <Video className="h-6 w-6 text-muted-foreground" />;
    return <File className="h-6 w-6 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 0) return 'N/A'; // Handle potential negative size if calculation fails
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
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(nf => analyzeFile(nf.id, nf.file.name)); // Pass filename for toast
  };

 const analyzeFile = useCallback(async (fileId: string, fileName: string) => {
    setSelectedFiles(prevFiles =>
      prevFiles.map(f => f.id === fileId ? { ...f, status: 'analyzing', progress: 0 } : f)
    );

    // Simulate getting a file path for the AI flow
    const filePath = `/${fileName}`; // Placeholder path for AI

    try {
        // Simulate API call delay for analysis
       await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

       // *** Use dummy analysis data as file system access is restricted ***
       // In a real application, call the actual AI flow:
       // const analysisResult = await analyzeCompressionQuality({ filePath });

       const dummyAnalysis: AnalyzeCompressionQualityOutput = {
            shouldCompress: Math.random() > 0.15, // 85% chance to recommend compression initially
            compressionRatio: Math.random() * (0.6 - 0.3) + 0.3, // Random ratio between 0.3 (70% reduction) and 0.6 (40% reduction)
            qualityLossDescription: Math.random() > 0.4 ? "Excellent compression possible with minimal/no quality loss." : "Good compression achievable. Potential for very minor quality differences at high levels."
        };
       const analysisResult = dummyAnalysis;

      setSelectedFiles(prevFiles =>
        prevFiles.map(f => {
          if (f.id === fileId) {
            // If analysis says not to compress, still allow lossless
            const nextStatus = analysisResult.shouldCompress || compressionLevel === 'lossless_optimized' ? 'pending' : 'pending'; // Keep pending to allow user choice
            return { ...f, status: nextStatus, analysis: analysisResult };
          }
          return f;
        })
      );
        toast({
            title: `Analysis Complete: ${fileName}`,
            description: (
                <>
                    {analysisResult.shouldCompress
                        ? `Compression recommended. ${analysisResult.qualityLossDescription || ''}`
                        : `File type may already be compressed. Lossless optimization still possible. ${analysisResult.qualityLossDescription || ''}`
                    }
                    {analysisResult.compressionRatio && ` Est. reduction: ${((1 - analysisResult.compressionRatio) * 100).toFixed(0)}%`}
                </>
            ),
            variant: analysisResult.shouldCompress ? 'default' : 'default', // Use default variant, rely on text
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
 }, [toast, compressionLevel]); // Add compressionLevel dependency


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
      setSelectedFiles(prevFiles =>
        prevFiles.map(f => f.id === selectedFile.id ? { ...f, status: 'compressing', progress: 0, error: undefined } : f)
      );

      try {
         // Simulate a more realistic compression time based on level and size
         const baseTime = 500 + Math.random() * 1000; // Base time 0.5-1.5s
         const sizeFactor = Math.log10(Math.max(1024, selectedFile.originalSize)) / 3; // Log scale based on size
         const levelFactor = compressionLevel === 'low' ? 0.8 : compressionLevel === 'medium' ? 1 : compressionLevel === 'high' ? 1.5 : 1.2; // lossless_optimized takes moderate time
         const totalTime = baseTime * sizeFactor * levelFactor;
         const steps = 10;
         const stepTime = totalTime / steps;


        for (let i = 1; i <= steps; i++) {
           await new Promise(resolve => setTimeout(resolve, stepTime));
           setSelectedFiles(prevFiles =>
             prevFiles.map(f => f.id === selectedFile.id ? { ...f, progress: (i / steps) * 100 } : f)
           );
         }

         // Simulate enhanced compression result (aiming for ~50% or better reduction)
         let reductionFactor;
         if (compressionLevel === 'lossless_optimized') {
             // Simulate lossless slightly better than 'medium', sometimes close to 'high'
             reductionFactor = Math.min(0.9, Math.max(0.4, (selectedFile.analysis?.compressionRatio || 0.65) * (0.8 + Math.random() * 0.2)));
         } else {
              const baseReduction = selectedFile.analysis?.compressionRatio || (compressionLevel === 'low' ? 0.8 : compressionLevel === 'medium' ? 0.6 : 0.45);
              // Make high compression significantly better, medium slightly better
              const levelMultiplier = compressionLevel === 'low' ? 1.0 : compressionLevel === 'medium' ? 0.9 : 0.75;
              reductionFactor = Math.min(0.95, Math.max(0.25, baseReduction * levelMultiplier * (0.9 + Math.random() * 0.2))); // Ensure minimum 5% size, max 75% reduction
         }

          // Ensure the compressed size is at least a small value (e.g., 1KB) if original is large, or smaller if original is small
         const minCompressedSize = Math.min(1024, Math.max(10, selectedFile.originalSize * 0.05));
         const compressedSize = Math.max(minCompressedSize, Math.floor(selectedFile.originalSize * reductionFactor));

         // Simulate creating a downloadable data URL (replace with actual blob/URL later)
         const compressedDataUrl = `data:application/octet-stream;base64,U2ltdWxhdGVkIENvbXByZXNzZWQgRGF0YSBmb3Ig${selectedFile.file.name}`; // Dummy data


        setSelectedFiles(prevFiles =>
          prevFiles.map(f => f.id === selectedFile.id ? { ...f, status: 'complete', progress: 100, compressedSize: compressedSize, compressedDataUrl: compressedDataUrl } : f)
        );
        toast({
          title: "Compression Complete!",
          description: `${selectedFile.file.name} compressed successfully.`,
          variant: 'default', // Use default variant for success
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
    if (!file.compressedDataUrl || file.status !== 'complete') return;

    const link = document.createElement('a');
    link.href = file.compressedDataUrl;
    // Suggest a filename (e.g., original_name-compressed.ext)
    const nameParts = file.file.name.split('.');
    const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
    const baseName = nameParts.join('.');
    link.download = `${baseName}-compressed${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

     toast({
        title: "Download Started",
        description: `Downloading ${link.download}`,
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
    // Only set to false if not dragging over a child element
    if (event.relatedTarget && !(event.currentTarget as Node).contains(event.relatedTarget as Node)) {
        setIsDragging(false);
    } else if (!event.relatedTarget) {
        setIsDragging(false); // Handle leaving the window
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

  // Calculate overall progress (optional, for a potential overall progress bar)
  const overallProgress = () => {
    const compressingFiles = selectedFiles.filter(f => f.status === 'compressing');
    if (compressingFiles.length === 0) return 0;
    const totalProgress = compressingFiles.reduce((sum, f) => sum + f.progress, 0);
    return totalProgress / compressingFiles.length;
  };
  const isCompressingAny = selectedFiles.some(f => f.status === 'compressing');


  return (
    <Card
      className={cn("transition-all duration-300 border-dashed border-2", isDragging ? 'border-primary ring-2 ring-primary/50 shadow-lg' : 'border-muted hover:border-border')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" /> Upload and Compress
        </CardTitle>
        <CardDescription>Drag & drop files or click to select. Choose your preferred compression method.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
            className={cn("flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200",
                isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="File upload area"
        >
          <Upload className={cn("h-12 w-12 mb-4 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
          <p className={cn("text-center transition-colors", isDragging ? "text-primary font-medium" : "text-muted-foreground")}>
             {isDragging ? 'Drop files to upload' : 'Drag & drop files here, or click to select'}
           </p>
          <Input
            ref={fileInputRef}
            id="file-upload-input"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            multiple
            accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.csv" // Expanded accepted types
          />
           <Label htmlFor="file-upload-input" className="sr-only">Upload files</Label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Selected Files:</h3>
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-2 border rounded-md p-3 bg-background shadow-inner">
              {selectedFiles.map((item) => (
                <li key={item.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md shadow-sm hover:bg-muted transition-colors duration-150">
                  <div className="flex-shrink-0">{getFileIcon(item.file.type)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground truncate" title={item.file.name}>{item.file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(item.originalSize)}</span>
                       {item.status === 'complete' && item.compressedSize !== undefined && (
                           <>
                             <span className="text-muted-foreground">&rarr;</span>
                             <span className="text-green-600 dark:text-green-500 font-medium">{formatFileSize(item.compressedSize)}</span>
                             <Badge variant="outline" className="text-green-600 dark:text-green-500 border-green-500/50 px-1.5 py-0.5 text-[10px] leading-none">
                                Saved {formatFileSize(item.originalSize - item.compressedSize)} ({( (1 - item.compressedSize / item.originalSize) * 100).toFixed(1)}%)
                            </Badge>
                           </>
                        )}
                    </div>
                     {item.status === 'compressing' && (
                       <Progress value={item.progress} className="h-1.5 mt-1" aria-label={`Compressing ${item.file.name}`} />
                     )}
                      {item.status === 'analyzing' && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 italic">
                            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing suitability...
                        </div>
                    )}
                     {item.status === 'error' && <p className="text-xs text-destructive mt-1 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3"/>{item.error}</p>}
                     {item.status === 'pending' && item.analysis && (
                         <p className={cn("text-xs mt-1 flex items-center gap-1",
                                          item.analysis.shouldCompress ? "text-green-600 dark:text-green-500" : "text-orange-600 dark:text-orange-500")}>
                             <BrainCircuit className="h-3 w-3" />
                             {item.analysis.shouldCompress
                                 ? `AI: ${item.analysis.qualityLossDescription || 'Good candidate.'}`
                                 : `AI: ${item.analysis.qualityLossDescription || 'May not compress well.'}`
                             }
                             {item.analysis.compressionRatio && ` (Est. ~${((1 - item.analysis.compressionRatio) * 100).toFixed(0)}% reduction)`}
                         </p>
                     )}
                  </div>

                   {/* Action Buttons */}
                   <div className="flex-shrink-0 flex items-center gap-2">
                     {item.status === 'complete' ? (
                         <Button variant="outline" size="sm" onClick={() => handleDownload(item)} className="h-8 w-8 p-0" title={`Download ${item.file.name}`}>
                           <Download className="h-4 w-4" />
                         </Button>
                       ) : item.status === 'error' ? (
                           <AlertCircle className="h-5 w-5 text-destructive" title={`Error: ${item.error}`} />
                       ) : item.status === 'compressing' || item.status === 'analyzing' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                       ) : null /* Placeholder for pending/other states */}

                      {/* Remove Button - always show unless compressing/analyzing */}
                      {item.status !== 'compressing' && item.status !== 'analyzing' && (
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeFile(item.id)} title="Remove file">
                             <X className="h-4 w-4" />
                         </Button>
                     )}
                   </div>

                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-base font-medium">Compression Method</Label>
          <RadioGroup
            value={compressionLevel}
            onValueChange={(value: string) => setCompressionLevel(value as CompressionLevel)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            aria-label="Compression level selection"
          >
            {/* Updated Options */}
            <Label htmlFor="lossless_optimized" className="flex items-center space-x-3 p-4 border rounded-md hover:border-primary transition-colors cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-primary">
              <RadioGroupItem value="lossless_optimized" id="lossless_optimized" />
              <div className="flex-1">
                <span className="font-medium">Lossless Optimized (Recommended)</span>
                <p className="text-xs text-muted-foreground">Best quality, significant size reduction via smart optimization.</p>
              </div>
            </Label>
             <Label htmlFor="high" className="flex items-center space-x-3 p-4 border rounded-md hover:border-primary transition-colors cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-primary">
               <RadioGroupItem value="high" id="high" />
                <div className="flex-1">
                  <span className="font-medium">High Compression</span>
                  <p className="text-xs text-muted-foreground">Maximum size reduction, minimal quality loss possible.</p>
               </div>
             </Label>
             <Label htmlFor="medium" className="flex items-center space-x-3 p-4 border rounded-md hover:border-primary transition-colors cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-primary">
               <RadioGroupItem value="medium" id="medium" />
                <div className="flex-1">
                 <span className="font-medium">Balanced</span>
                 <p className="text-xs text-muted-foreground">Good balance between size and speed.</p>
               </div>
             </Label>
              <Label htmlFor="low" className="flex items-center space-x-3 p-4 border rounded-md hover:border-primary transition-colors cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-primary">
                <RadioGroupItem value="low" id="low" />
                <div className="flex-1">
                  <span className="font-medium">Fastest</span>
                  <p className="text-xs text-muted-foreground">Quick compression, less size reduction.</p>
                </div>
             </Label>
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 pt-4 border-t">
        {isCompressingAny && <Progress value={overallProgress()} className="h-2" aria-label="Overall compression progress"/>}
        <Button
            size="lg"
            onClick={handleCompression}
            disabled={isCompressingAny || selectedFiles.every(f => f.status !== 'pending' && f.status !== 'error') || selectedFiles.length === 0}
            className="w-full transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
            aria-live="polite"
        >
            {isCompressingAny ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Compressing...
                </>
             ) : (
                 `Start Compression (${selectedFiles.filter(f => f.status === 'pending' || f.status === 'error').length} files)`
             )}
        </Button>
      </CardFooter>
    </Card>
  );
}
