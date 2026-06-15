import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../AuthContext';

const FILTER_TYPES = ['All', 'PDF', 'PPT', 'DOCX', 'Video', 'Links'];

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const customShadow = {
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
};

// Helper to format timestamp into human readable relative time
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Helper to map backend file_type to UI icons and colors
function getFileTypeStyle(fileType) {
  const type = (fileType || '').toLowerCase();
  if (type === 'pdf') {
    return {
      typeLabel: 'PDF',
      icon: 'picture_as_pdf',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    };
  }
  if (type === 'ppt' || type === 'pptx') {
    return {
      typeLabel: 'PPT',
      icon: 'slideshow',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
    };
  }
  if (type === 'doc' || type === 'docx') {
    return {
      typeLabel: 'DOCX',
      icon: 'description',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    };
  }
  if (type === 'video' || type === 'mp4') {
    return {
      typeLabel: 'Video',
      icon: 'videocam',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    };
  }
  if (type === 'link') {
    return {
      typeLabel: 'Links',
      icon: 'link',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    };
  }
  // Default fallback for other file formats
  return {
    typeLabel: type.toUpperCase() || 'FILE',
    icon: 'folder_open',
    iconBg: 'bg-surface-container-highest',
    iconColor: 'text-on-surface-variant',
  };
}

export default function MaterialsTab({ classId }) {
  const { user } = useAuth();
  const activeClassId = classId || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const fileInputRef = useRef(null);

  // States
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Fetch materials list
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/classes/${activeClassId}/materials`);
      const data = await res.json();
      if (data.success) {
        setMaterials(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch materials');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Could not load materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [activeClassId]);

  // Filter materials based on search and selected type
  const filteredMaterials = materials.filter((m) => {
    const style = getFileTypeStyle(m.file_type);
    const matchFilter = activeFilter === 'All' || style.typeLabel === activeFilter;
    const matchSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Handle Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Open file browser dialog
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  // Open upload modal with prefilled details
  const handleFileSelected = (file) => {
    setSelectedFile(file);
    // Prefill title with filename without extension
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setUploadTitle(nameWithoutExt);
    setUploadDescription('');
    setUploadError(null);
    setIsUploadModalOpen(true);
  };

  // Handle Close Modal
  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Multipart/Form-data Upload Submit
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    if (!uploadTitle.trim()) {
      setUploadError('Title is required');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', uploadTitle.trim());
    formData.append('description', uploadDescription.trim());
    formData.append('uploaded_by', user?.id || '00000000-0000-0000-0000-000000000001');

    try {
      const res = await fetch(`${API}/api/classes/${activeClassId}/materials/upload`, {
        method: 'POST',
        body: formData, // Browser automatically sets correct boundary and content-type header
      });

      const data = await res.json();
      if (data.success) {
        handleCloseModal();
        await fetchMaterials(); // Refresh materials list immediately
      } else {
        setUploadError(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Connection error. Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-headline-md font-bold text-on-surface">Learning Materials</h3>
          <p className="text-label-sm text-on-surface-variant mt-1">
            {filteredMaterials.length} materials available
          </p>
        </div>
        <button
          onClick={handleBrowseClick}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-md flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          Upload Material
        </button>
      </div>

      {/* Filter + Search Bar */}
      <div className="flex items-center justify-between bg-surface-container p-4 rounded-xl">
        <div className="flex items-center gap-2">
          {FILTER_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`px-4 py-2 rounded-lg text-label-md font-label-md transition-all ${
                activeFilter === type
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:border-primary/30'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search materials..."
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-label-md bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <span className="material-symbols-outlined text-[40px] text-outline mb-2">
          cloud_upload
        </span>
        <p className="text-label-md font-label-md text-on-surface">
          Drag & Drop files here or{' '}
          <span className="text-primary font-bold cursor-pointer">Browse</span>
        </p>
        <p className="text-label-sm text-on-surface-variant mt-1">
          Supports PDF, PPT, DOCX, ZIP, PNG, JPG, and JPEG files up to 50MB
        </p>
      </div>

      {/* Materials List */}
      <div>
        <h4 className="text-label-md font-bold text-on-surface mb-3">
          {activeFilter === 'All' ? 'All Materials' : `${activeFilter} Files`}
        </h4>
        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">Loading materials...</div>
        ) : error ? (
          <div className="text-center py-12 text-error font-semibold">{error}</div>
        ) : filteredMaterials.length === 0 ? (
          <div className="bg-surface-container-lowest border border-surface-container rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-outline text-[48px] mb-2">search_off</span>
            <p className="text-body-md text-on-surface-variant">No materials found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMaterials.map((mat) => {
              const style = getFileTypeStyle(mat.file_type);
              return (
                <div
                  key={mat.id}
                  className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between group hover:border-primary/40 transition-all animate-fade-in"
                  style={customShadow}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div
                      className={`w-10 h-10 rounded-lg ${style.iconBg} ${style.iconColor} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-label-md font-bold text-on-surface truncate" title={mat.title}>
                        {mat.title}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-on-surface-variant mt-0.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-surface-container rounded text-[10px] font-bold uppercase">
                          {style.typeLabel}
                        </span>
                        <span>{mat.file_size || 'N/A'}</span>
                        <span>{formatRelativeTime(mat.created_at)}</span>
                        {mat.uploader_name && (
                          <span className="text-primary font-semibold">By: {mat.uploader_name}</span>
                        )}
                      </div>
                      {mat.description && (
                        <p className="text-[11px] text-on-surface-variant mt-1.5 line-clamp-1 italic">
                          {mat.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={mat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-surface-container rounded-lg transition-colors flex items-center justify-center"
                      title="Download/Open"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                        download
                      </span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Details Modal Overlay */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-xl p-6 border border-outline-variant/30 shadow-lg space-y-4 animate-scale-up">
            <h3 className="text-headline-md font-bold text-on-surface">Upload Learning Material</h3>
            
            {/* File Info Card */}
            <div className="bg-surface-container p-3 rounded-lg flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">draft</span>
              <div className="overflow-hidden">
                <p className="text-label-md font-bold text-on-surface truncate" title={selectedFile?.name}>
                  {selectedFile?.name}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  {selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0'} MB
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-label-sm font-bold text-on-surface-variant">Title</label>
                <input
                  type="text"
                  className="w-full border border-outline-variant rounded-lg p-2.5 text-body-md bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Enter material title..."
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-bold text-on-surface-variant">Description (Optional)</label>
                <textarea
                  className="w-full border border-outline-variant rounded-lg p-2.5 text-body-md bg-surface-container-lowest focus:ring-1 focus:ring-primary outline-none resize-none"
                  rows={3}
                  placeholder="Enter a brief description..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Error Message */}
            {uploadError && (
              <p className="text-xs text-error font-semibold">{uploadError}</p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleCloseModal}
                disabled={isUploading}
                className="px-5 py-2 border border-outline-variant rounded-lg font-bold text-label-md hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={isUploading || !uploadTitle.trim()}
                className="bg-primary text-on-primary px-5 py-2 rounded-lg font-bold text-label-md hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-55"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
