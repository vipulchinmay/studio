/**
 * Represents a file with its name, size, and type.
 */
export interface FileInfo {
  /**
   * The name of the file.
   */
  name: string;
  /**
   * The size of the file in bytes.
   */
  size: number;
  /**
   * The type of the file (e.g., 'image', 'audio', 'video', 'document', 'archive').
   */
  type: string;
  /**
   * The path of the file (could be local or cloud path).
   */
  path: string;
}

/**
 * Asynchronously retrieves a list of files.
 * In a real app, this would interact with local file system APIs (if permitted)
 * or connected cloud storage APIs (Google Drive, iCloud Drive, etc.).
 *
 * @returns A promise that resolves to an array of FileInfo objects.
 */
export async function getFiles(): Promise<FileInfo[]> {
  // TODO: Implement actual file system or cloud API calls based on user authentication and permissions.
  console.log("Fetching files (using mock data)...");
   // Simulate API delay
   await new Promise(resolve => setTimeout(resolve, 500));

  // Return a more diverse and realistic mock dataset
  return [
    {
      name: 'Annual Report 2023.pdf',
      size: 12 * 1024 * 1024, // 12MB
      type: 'document/pdf',
      path: '/cloud/documents/Annual Report 2023.pdf',
    },
    {
      name: 'project_backup.zip',
      size: 250 * 1024 * 1024, // 250MB
      type: 'archive/zip',
      path: '/local/backups/project_backup.zip',
    },
     {
      name: 'IMG_0012.JPG',
      size: 6 * 1024 * 1024, // 6MB
      type: 'image/jpeg',
      path: '/cloud/photos/IMG_0012.JPG',
    },
     {
      name: 'Family Vacation.mov',
      size: 1.2 * 1024 * 1024 * 1024, // 1.2GB
      type: 'video/quicktime',
      path: '/cloud/videos/Family Vacation.mov',
    },
     {
      name: 'Presentation_Draft.pptx',
      size: 35 * 1024 * 1024, // 35MB
      type: 'document/presentation',
      path: '/cloud/work/Presentations/Presentation_Draft.pptx',
    },
     {
      name: 'logo_final_v3.png',
      size: 1.5 * 1024 * 1024, // 1.5MB
      type: 'image/png',
      path: '/local/design/logo_final_v3.png',
    },
     {
      name: 'podcast_episode_raw.wav',
      size: 300 * 1024 * 1024, // 300MB
      type: 'audio/wav',
      path: '/local/audio/podcast_episode_raw.wav',
    },
  ];
}

/**
 * Asynchronously retrieves information for a single file by its path.
 * In a real app, this would interact with the relevant file system or cloud API.
 *
 * @param path The path of the file to retrieve.
 * @returns A promise that resolves to a FileInfo object or null if not found.
 */
export async function getFile(path: string): Promise<FileInfo | null> {
   // TODO: Implement actual file system or cloud API call.
   console.log(`Fetching file info for: ${path} (using mock data)...`);
   // Simulate API delay
   await new Promise(resolve => setTimeout(resolve, 100));

   // Find the file in the mock list or return a default mock if not found
   const mockFiles = await getFiles(); // Use the same mock list
   const foundFile = mockFiles.find(f => f.path === path);

   if (foundFile) {
     return foundFile;
   }

   // Return null if not found in a real scenario, or a generic mock for testing flows
   // For analyzeCompressionQuality flow testing, we need to return *something*.
   console.warn(`Mock file not found for path: ${path}. Returning a default mock.`);
   return {
       name: path.split('/').pop() || 'unknown_file',
       size: 10 * 1024 * 1024, // Default mock size 10MB
       type: 'unknown',
       path: path,
   };
   // return null; // In a real implementation
}
