// src/pages/FormUpload.js
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { FaFileUpload, FaSpinner, FaFileAlt, FaTrash } from 'react-icons/fa';

import { useFormContext } from '../context/FormContext';
import apiService from '../services/api';

const FormUpload = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const {
    uploadedFiles,
    setUploadedFiles,
    setPatientData,
    setFormData,
    startProcessing,
    updateProcessingProgress,
    completeProcessing
  } = useFormContext();
  
  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    // Filter out duplicate files
    const newFiles = acceptedFiles.filter(newFile => 
      !uploadedFiles.some(existingFile => 
        existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    );
    
    // Add preview URLs to the files
    const filesWithPreviews = newFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
    );
    
    // Update state with new files
    setUploadedFiles(prevFiles => [...prevFiles, ...filesWithPreviews]);
  }, [uploadedFiles, setUploadedFiles]);
  
  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 15728640, // 15MB
    maxFiles: 5
  });
  
  // Remove a file from the list
  const removeFile = (fileToRemove) => {
    setUploadedFiles(prevFiles => 
      prevFiles.filter(file => file !== fileToRemove)
    );
    
    // Revoke the preview URL to avoid memory leaks
    URL.revokeObjectURL(fileToRemove.preview);
  };
  
  // Handle file upload and processing
  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please add at least one file to upload');
      return;
    }
    
    try {
      setIsUploading(true);
      startProcessing();
      
      // Upload progress callback
      const onProgress = (progress) => {
        updateProcessingProgress(progress, `Uploading files... ${progress}%`);
        setUploadProgress(progress);
      };
      
      // Upload files
      const response = await apiService.uploadFiles(uploadedFiles, onProgress);
      
      // Update context with the extracted and mapped data
      setPatientData(response.patientData);
      setFormData({
        ibhs: response.formData.ibhs,
        communityCare: response.formData.communityCare
      });
      
      completeProcessing();
      toast.success('Files processed successfully');
      
      // Navigate to the form editor
      navigate('/editor');
      
    } catch (error) {
      toast.error(error.message || 'An error occurred during file processing');
      completeProcessing();
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Upload Medical Documents</h1>
        <p className="text-gray-600 mt-2">
          Upload medical records, diagnosis reports, or assessment documents to automatically
          extract patient information and fill forms.
        </p>
      </div>
      
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        <FaFileUpload className="mx-auto text-4xl text-gray-400 mb-4" />
        
        {isDragActive ? (
          <p className="text-blue-500">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-700 mb-2">
              Drag & drop your files here, or click to select files
            </p>
            <p className="text-sm text-gray-500">
              Supported file types: PDF, JPG, PNG (Max 15MB per file)
            </p>
          </div>
        )}
      </div>
      
      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Uploaded Files</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="flex items-center justify-between p-4">
                  <div className="flex items-center">
                    <FaFileAlt className="text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    disabled={isUploading}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Upload Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleUpload}
          disabled={isUploading || uploadedFiles.length === 0}
          className={`
            flex items-center justify-center px-6 py-3 rounded-lg
            ${isUploading ? 
              'bg-blue-400 cursor-not-allowed' : 
              'bg-blue-600 hover:bg-blue-700'
            } text-white font-medium transition-colors
          `}
        >
          {isUploading ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Processing ({uploadProgress}%)
            </>
          ) : (
            <>
              Process Documents
            </>
          )}
        </button>
      </div>
      
      {/* Instructions */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Instructions</h3>
        <div className="text-gray-700 space-y-3">
          <p>1. Upload medical records, diagnosis reports, and assessment documents.</p>
          <p>2. The system will automatically extract relevant patient information.</p>
          <p>3. Review and edit the extracted information on the next screen.</p>
          <p>4. Generate the completed IBHS and Community Care forms.</p>
        </div>
      </div>
    </div>
  );
};

export default FormUpload;