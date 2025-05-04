'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, File, X, CheckCircle, AlertCircle, Image as ImageIcon, FileAudio, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { analyzeCompressionQuality, AnalyzeCompressionQualityOutput } from '@/ai/flows/analyze-compression-quality';

type CompressionLevel = 'low' | 'medium' | 'high';
type FileStatus = 'pending' | 'uploading' | 'analyzing' | 'compressing' | 'complete' | 'error';

interface SelectedFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  originalSize: number;
  compressedSize?: number;
  error?: string;
  analysis?: AnalyzeCompressionQualityOutput | null;
}

export function FileCompression() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(Array.from(event.target.files));
    }
     // Reset file input to allow selecting the same file again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const addFiles = (files: File[]) => {
     const newFiles: SelectedFile[] = files.map(file => ({
      id: `${file.name}-${file.size}-${Date.now()}`, // More unique ID
      file,
      status: 'pending',
      progress: 0,
      originalSize: file.size,
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(nf => analyzeFile(nf.id)); // Start analysis immediately
  };

 const analyzeFile = useCallback(async (fileId: string) => {
    setSelectedFiles(prevFiles =>
      prevFiles.map(f => f.id === fileId ? { ...f, status: 'analyzing', progress: 0 } : f)
    );

    // Simulate file path for analysis (replace with actual path if available)
    const filePath = `/uploads/${fileId}`; // Placeholder path

    try {
       // Simulate analysis delay
       await new Promise(resolve => setTimeout(resolve, 1000));
        // In a real app, you would call the AI flow here.
        // Using placeholder data due to limitations on accessing local file paths from server action.
        const dummyAnalysis: AnalyzeCompressionQualityOutput = {
            shouldCompress: Math.random() > 0.2, // 80% chance to recommend compression
            compressionRatio: Math.random() * (0.8 - 0.4) + 0.4, // Random ratio between 0.4 and 0.8
            qualityLossDescription: Math.random() > 0.5 ? "Minimal quality loss expected." : "Some quality loss possible, especially at higher levels."
        };
        const analysisResult = dummyAnalysis;
        // const analysisResult = await analyzeCompressionQuality({ filePath });


      setSelectedFiles(prevFiles =>
        prevFiles.map(f => f.id === fileId ? { ...f, status: 'pending', analysis: analysisResult } : f)
      );
    } catch (error) {
      console.error('Error analyzing file:', error);
      setSelectedFiles(prevFiles =>
        prevFiles.map(f => f.id === fileId ? { ...f, status: 'error', error: 'Analysis failed', analysis: null } : f)
      );
      toast({
        title: "Analysis Error",
        description: `Failed to analyze ${filePath}.`,
        variant: "destructive",
      });
    }
  }, [toast]);


  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

 const handleCompression = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast({ title: "No files selected", description: "Please select files to compress.", variant: "destructive" });
      return;
    }

    const filesToCompress = selectedFiles.filter(f => f.status === 'pending' || f.status === 'error');

    if (filesToCompress.length === 0) {
        toast({ title: "No files ready", description: "All selected files are already processing or completed."});
        return;
    }


    filesToCompress.forEach(async (selectedFile) => {
      // Update status to compressing
      setSelectedFiles(prevFiles =>
        prevFiles.map(f => f.id === selectedFile.id ? { ...f, status: 'compressing', progress: 0, error: undefined } : f)
      );

      // Simulate compression process
      try {
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += 10;
          if (currentProgress <= 100) {
            setSelectedFiles(prevFiles =>
              prevFiles.map(f => f.id === selectedFile.id ? { ...f, progress: currentProgress } : f)
            );
          } else {
            clearInterval(interval);
             // Simulate compression result
             const reductionFactor = selectedFile.analysis?.compressionRatio || (compressionLevel === 'low' ? 0.9 : compressionLevel === 'medium' ? 0.7 : 0.5);
             const compressedSize = Math.max(10, Math.floor(selectedFile.originalSize * reductionFactor)); // Ensure size is at least 10 bytes

            setSelectedFiles(prevFiles =>
              prevFiles.map(f => f.id === selectedFile.id ? { ...f, status: 'complete', progress: 100, compressedSize: compressedSize } : f)
            );
            toast({
              title: "Compression Complete",
              description: `${selectedFile.file.name} compressed successfully.`,
            });
          }
        }, 200); // Simulate time interval

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

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
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

  return (
    <Card
      className={cn("transition-all duration-300", isDragging ? 'border-primary ring-2 ring-primary' : '')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader>
        <CardTitle>Upload and Compress</CardTitle>
        <CardDescription>Drag & drop files or click to select. Choose a compression level.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
            className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
             {isDragging ? 'Drop files here' : 'Drag & drop files here, or click to select'}
           </p>
          <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            multiple
            accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" // Example accepted types
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Selected Files:</h3>
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {selectedFiles.map((item) => (
                <li key={item.id} className="flex items-center space-x-3 p-3 bg-secondary rounded-md shadow-sm">
                  <div className="flex-shrink-0">{getFileIcon(item.file.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.originalSize)}
                       {item.status === 'complete' && item.compressedSize !== undefined && (
                           <> &rarr; <span className="text-accent">{formatFileSize(item.compressedSize)}</span> </>
                        )}
                    </p>
                     {item.status !== 'pending' && item.status !== 'complete' && item.status !== 'error' && item.status !== 'analyzing' && (
                       <Progress value={item.progress} className="h-1 mt-1" />
                     )}
                      {item.status === 'analyzing' && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Analyzing...</p>
                    )}
                     {item.status === 'error' && <p className="text-xs text-destructive mt-1">{item.error}</p>}
                      {item.analysis && item.status !== 'analyzing' && (
                           <p className={cn("text-xs mt-1", item.analysis.shouldCompress ? "text-green-600" : "text-orange-600")}>
                               {item.analysis.shouldCompress
                                   ? `AI suggests compression possible. ${item.analysis.qualityLossDescription || ''}`
                                   : `AI suggests compression might not be efficient or could cause quality loss. ${item.analysis.qualityLossDescription || ''}`
                               }
                           </p>
                       )}
                  </div>
                  {item.status === 'complete' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : item.status === 'error' ? (
                     <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => removeFile(item.id)} disabled={item.status === 'compressing'}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <Label>Compression Level</Label>
          <RadioGroup
            value={compressionLevel}
            onValueChange={(value: string) => setCompressionLevel(value as CompressionLevel)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="low" id="low" />
              <Label htmlFor="low">Low (Faster, Larger Size)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="medium" />
              <Label htmlFor="medium">Medium (Balanced)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="high" id="high" />
              <Label htmlFor="high">High (Slower, Smaller Size)</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter>
        <Button
            onClick={handleCompression}
            disabled={selectedFiles.every(f => f.status === 'compressing' || f.status === 'complete') || selectedFiles.length === 0}
            className="w-full transition-all duration-300 ease-in-out transform hover:scale-105"
        >
            {selectedFiles.some(f => f.status === 'compressing') ? 'Compressing...' : 'Start Compression'}
        </Button>
      </CardFooter>
    </Card>
  );
}
