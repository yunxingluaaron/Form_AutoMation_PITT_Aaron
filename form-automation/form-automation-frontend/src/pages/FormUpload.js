// src/pages/FormUpload.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { FaFileUpload, FaSpinner, FaFileAlt, FaTrash, FaExclamationTriangle } from 'react-icons/fa';

import { useFormContext } from '../context/FormContext';
import apiService from '../services/api';

const FormUpload = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Get the entire context object for debugging
  const contextObject = useFormContext();
  
  // Use a ref to store the context methods for later access in timeouts
  const contextRef = useRef(contextObject);
  
  // Update ref whenever context changes
  useEffect(() => {
    contextRef.current = contextObject;
  }, [contextObject]);
  
  // Add debug logging on component mount
  useEffect(() => {
  
    // Try to call setMeasurableGoals with an empty array to test if it works
    try {
      if (typeof contextObject.setMeasurableGoals === 'function') {
        console.log('Test calling setMeasurableGoals with empty array');
        contextObject.setMeasurableGoals([]);
        console.log('setMeasurableGoals call successful');
      } else {
        console.error('setMeasurableGoals is not a function at component mount');
      }
    } catch (err) {
      console.error('Error testing setMeasurableGoals:', err);
    }
  }, [contextObject]);
  
  // Destructure context values (for regular usage)
  const {
    uploadedFiles,
    setUploadedFiles,
    setPatientData,
    setFormData,
    setMeasurableGoals,
    startProcessing,
    updateProcessingProgress,
    completeProcessing
  } = contextObject;
  
  // Add debug logging whenever setMeasurableGoals changes
  
  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    // Clear any previous errors
    setError(null);
    
    // Only accept one file at a time since our backend processes 
    // single files for now
    if (acceptedFiles.length > 1) {
      toast.warning('Currently only processing one file at a time. Using the first file only.');
    }
    
    // Use only the first file
    const newFile = acceptedFiles[0];
    
    // Check if this file is already in the list
    const isDuplicate = uploadedFiles.some(existingFile => 
      existingFile.name === newFile.name && existingFile.size === newFile.size
    );
    
    if (isDuplicate) {
      toast.warning('This file is already in your upload list');
      return;
    }
    
    // Add preview URL to the file
    const fileWithPreview = Object.assign(newFile, {
      preview: URL.createObjectURL(newFile)
    });
    
    // Update state with new file, replacing any previous files
    setUploadedFiles([fileWithPreview]);
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
    maxFiles: 1 // Only allow one file
  });
  
  // Remove a file from the list
  const removeFile = (fileToRemove) => {
    setUploadedFiles(prevFiles => 
      prevFiles.filter(file => file !== fileToRemove)
    );
    
    // Revoke the preview URL to avoid memory leaks
    URL.revokeObjectURL(fileToRemove.preview);
  };
  
  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please add a file to upload');
      return;
    }
    
    
    try {
      setIsUploading(true);
      setError(null);
      startProcessing();
      
      // Update upload progress and status
      const onProgress = (progress) => {
        let statusText = 'Uploading file...';
        
        // Display different status messages based on progress
        if (progress < 50) {
          statusText = `Uploading file... ${progress}%`;
        } else if (progress < 70) {
          statusText = 'Processing OCR with Mistral...';
        } else if (progress < 90) {
          statusText = 'Analyzing data with ChatGPT...';
        } else {
          statusText = 'Finalizing processing...';
        }
        
        updateProcessingProgress(progress, statusText);
        setUploadProgress(progress);
      };
      
      // Start with upload progress at 0
      onProgress(0);
      
      // Upload file and process with OCR and LLM
      const response = await apiService.uploadFiles(uploadedFiles, (progress) => {
        // Map the actual upload progress (0-100) to 0-60% of our displayed progress
        // since the upload is just the first part of the process
        onProgress(Math.min(Math.round(progress * 0.6), 60));
      });

      // Add detailed logging to help diagnose issues
      console.log("API Response:", response);
      console.log("Response structure:", Object.keys(response));
      console.log("Measurable goals from API:", response.measurableGoals);
      
      // After upload is complete, show progress for OCR and LLM steps
      onProgress(70); // OCR processing

    
      // Simulate progress updates for the remaining steps
      setTimeout(() => {

        onProgress(85); // ChatGPT analysis
        
        
        setTimeout(() => {

          onProgress(95); // Finalizing
        
          
          setTimeout(() => {

            // Complete the process
            onProgress(100);
            
            try {
              setPatientData(response.patientData);

            } catch (err) {

            }

            try {
              setFormData({
                ibhs: response.formData?.ibhs || {},
                communityCare: response.formData?.communityCare || {}
              });
            } catch (err) {
            }

            // Set measurable goals if available in the response
            const goals = response.measurableGoals || [];



            if (typeof contextRef.current.setMeasurableGoals === 'function') {
              contextRef.current.setMeasurableGoals(goals);
              console.log('Successfully set measurable goals via context');
            } else {
              console.log('setMeasurableGoals not available, using sessionStorage');
              // Store in sessionStorage as a fallback
              sessionStorage.setItem('measurableGoals', JSON.stringify(goals));
            }

            
            // Try multiple approaches to set the goals
            console.log('Attempting to set measurable goals...');
            
            try {
              // Approach 1: Try using the destructured variable
              console.log('Approach 1: Using destructured setMeasurableGoals');
              if (typeof setMeasurableGoals === 'function') {
                setMeasurableGoals(goals);
                console.log('Approach 1 succeeded');
              } else {
                console.error('Approach 1 failed: setMeasurableGoals is not a function');
                
                // Approach 2: Try using the context object directly
                console.log('Approach 2: Using contextRef.current.setMeasurableGoals');
                if (typeof contextRef.current.setMeasurableGoals === 'function') {
                  contextRef.current.setMeasurableGoals(goals);
                  console.log('Approach 2 succeeded');
                } else {
                  console.error('Approach 2 failed: contextRef.current.setMeasurableGoals is not a function');
                  
                  // Fallback: Use sessionStorage
                  console.log('All approaches failed. Using sessionStorage fallback');
                  sessionStorage.setItem('measurableGoals', JSON.stringify(goals));
                  console.log('Stored goals in sessionStorage');
                }
              }
            } catch (err) {
              console.error('Error setting measurable goals:', err);
              console.log('Using sessionStorage as fallback due to error');
              sessionStorage.setItem('measurableGoals', JSON.stringify(goals));
            }
            
            console.log('Completing processing...');
            completeProcessing();
            toast.success('File processed successfully');
            
            // Navigate to the form editor
            console.log('Navigating to /editor');
            navigate('/editor', { 
              state: { measurableGoals: goals } // Pass as navigation state as another fallback
            });
          }, 500);
        }, 1000);
      }, 1000);
      
    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message || 'An error occurred during file processing');
      toast.error(error.message || 'An error occurred during file processing');
      completeProcessing();
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Upload Medical Document</h1>
        <p className="text-gray-600 mt-2">
          Upload a medical record, diagnosis report, or assessment document to automatically
          extract patient information using OCR and ChatGPT analysis.
        </p>
      </div>
      
      {/* Debug Display - Remove in production */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs" style={{display: process.env.NODE_ENV === 'development' ? 'block' : 'none'}}>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        <FaFileUpload className="mx-auto text-8xl text-gray-400 mb-4" />
        
        {isDragActive ? (
          <p className="text-blue-500">Drop the file here...</p>
        ) : (
          <div>
            <p className="text-gray-700 mb-2">
              Drag & drop your file here, or click to select a file
            </p>
            <p className="text-sm text-gray-500">
              Supported file types: PDF, JPG, PNG (Max 15MB)
            </p>
          </div>
        )}
      </div>
      
      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Uploaded File</h2>
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
              Process Document
            </>
          )}
        </button>
      </div>
      
      {/* Instructions */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">How It Works</h3>
        <div className="text-gray-700 space-y-3">
          <p>1. Upload a medical document containing patient information</p>
          <p>2. The system uses <strong>Mistral OCR</strong> to extract patient info from the document</p>
          <p>3. <strong>Most Advacned LLM</strong> analyzes these data to identify relevant key info and map to IBHS form</p>
          <p>4. Review and edit the extracted and mapped information on the next screen</p>
          <p>5. Generate the completed IBHS forms</p>
        </div>
      </div>
    </div>
  );
};

export default FormUpload;