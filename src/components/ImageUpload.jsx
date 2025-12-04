import React, { useState, useRef } from "react";

export default function ImageUpload({ onImageSelect, theme }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const bgColor = theme === "dark" ? "bg-neutral-900" : "bg-gray-100";
  const textColor = theme === "dark" ? "text-slate-200" : "text-gray-800";
  const secondaryTextColor = theme === "dark" ? "text-slate-400" : "text-gray-600";
  const borderColor = theme === "dark" ? "border-slate-600" : "border-gray-300";

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      } else {
        alert('Please drop a valid image file (JPEG, JPG, PNG)');
      }
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {/* Drag & Drop Area with Browse Button Inside */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-[50vw] min-h-[35vh] border-2 border-dashed ${
          isDragging ? 'border-[#FF6B35] bg-opacity-10 bg-[#FF6B35]' : borderColor
        } rounded-2xl flex flex-col items-center justify-center gap-6 p-8 transition-all`}
      >
        <svg
          className={`w-16 h-16 ${isDragging ? 'text-[#FF6B35]' : secondaryTextColor}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        
        <div className={`text-center ${textColor} text-2xl font-semibold`}>
          {isDragging ? 'Drop image here' : 'Drag & Drop image here'}
        </div>
        
        <div className={`text-center ${secondaryTextColor} text-lg font-medium`}>
          or
        </div>
        
        <button
          onClick={handleBrowseClick}
          className="px-12 py-4 bg-[#FF6B35] rounded-2xl flex items-center justify-center hover:bg-[#ff7a47] transition-colors cursor-pointer shadow-lg"
        >
          <span className="text-white text-2xl font-semibold">
            Browse File
          </span>
        </button>
        
        <div className={`text-center ${secondaryTextColor} text-sm`}>
          JPEG, JPG, PNG supported
        </div>
      </div>
    </div>
  );
}
