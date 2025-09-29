import React, { useState, useMemo } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const filteredFiles = useMemo(() => {
    if (!searchTerm) {
      return files;
    }
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredFiles]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedFiles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1); // Reset to first page on search
  };
  
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setItemsPerPage(Number(e.target.value));
      setCurrentPage(1); // Reset to first page
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-xl font-semibold">Uploaded Files</h2>
          <div className="w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full sm:w-64 bg-input border border-border rounded-md px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        
        {files.length === 0 ? (
          <p className="text-muted-foreground">No files uploaded yet. Click "Upload Files" to get started.</p>
        ) : paginatedFiles.length === 0 ? (
          <p className="text-muted-foreground">No files found for your search term.</p>
        ) : (
          <>
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
                  {paginatedFiles.map((file) => (
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

            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span>Rows per page:</span>
                <select value={itemsPerPage} onChange={handleItemsPerPageChange} className="bg-input border border-border rounded-md p-1">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({sortedFiles.length} items)
              </span>
              <div className="flex items-center space-x-2">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 text-sm hover:bg-accent">Previous</button>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50 text-sm hover:bg-accent">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileManager;
