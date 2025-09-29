import React from 'react';
import type { ManagedFile } from '../types';
import { setFile, deleteFile as deleteFileFromDb } from '../services/dbService';

interface FileManagerProps {
  files: ManagedFile[];
  setFiles: React.Dispatch<React.SetStateAction<ManagedFile[]>>;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // Return only base64 part
    reader.onerror = (error) => reject(error);
  });
};

const FileManager: React.FC<FileManagerProps> = ({ files, setFiles }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFileMetadatas: ManagedFile[] = [];
    for (const file of Array.from(selectedFiles)) {
      try {
        const base64Data = await fileToBase64(file);
        const newFile: ManagedFile = {
          id: `file_${Date.now()}_${Math.random()}`,
          name: file.name,
          type: file.type,
          createdAt: new Date().toISOString(),
        };
        
        await setFile(newFile.id, base64Data);
        newFileMetadatas.push(newFile);

      } catch (error) {
        console.error("Error converting file to base64:", error);
        alert(`Failed to upload ${file.name}`);
      }
    }
    setFiles((prev) => [...prev, ...newFileMetadatas]);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this file from the manager?')) {
      await deleteFileFromDb(id);
      setFiles((prev) => prev.filter((file) => file.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">File Manager</h1>
          <p className="text-muted-foreground">Upload and manage files for your campaigns.</p>
        </div>
        <label className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold flex items-center hover:bg-primary/90 cursor-pointer">
          <i className="fas fa-upload mr-2"></i>
          Upload Files
          <input type="file" multiple onChange={handleFileChange} className="hidden" />
        </label>
      </header>
      
       <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md" role="alert">
         <p><span className="font-bold">Note:</span> File metadata is stored in local storage, but the file contents are stored in your browser's more robust IndexedDB storage to handle larger files.</p>
       </div>

      <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>
        {files.length === 0 ? (
          <p className="text-muted-foreground">No files uploaded yet. Click "Upload Files" to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left responsive-table styled-table">
              <thead>
                <tr className="border-b">
                  <th className="p-4">File Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Uploaded At</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.slice().reverse().map((file) => (
                  <tr key={file.id} className="border-b">
                    <td data-label="File Name" className="p-4 font-medium break-all">{file.name}</td>
                    <td data-label="Type" className="p-4 text-sm">{file.type}</td>
                    <td data-label="Uploaded At" className="p-4 text-sm">{new Date(file.createdAt).toLocaleString()}</td>
                    <td data-label="Actions" className="p-4">
                      <button onClick={() => handleDelete(file.id)} className="text-muted-foreground hover:text-destructive">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;