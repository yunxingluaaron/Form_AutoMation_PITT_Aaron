// src/context/FormContext.js
import React, { createContext, useContext, useState } from 'react';

// Create the context
const FormContext = createContext();

// Create a custom hook for using the context
export const useFormContext = () => useContext(FormContext);

// Form context provider component
export const FormProvider = ({ children }) => {
  // State for uploaded files
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // State for extracted patient data
  const [patientData, setPatientData] = useState(null);
  
  // State for form data
  const [formData, setFormData] = useState(null);
  
  // State for measurable goals - FIXED: moved inside component
  const [measurableGoals, setMeasurableGoals] = useState([]);
  
  // State for active form
  const [activeForm, setActiveForm] = useState('ibhs');
  
  // State for processing status
  const [processingStatus, setProcessingStatus] = useState({
    isProcessing: false,
    progress: 0,
    statusText: ''
  });
  
  // State for form generation status
  const [generationStatus, setGenerationStatus] = useState({
    isGenerating: false,
    forms: {
      ibhs: {
        generated: false,
        downloading: false,
        url: null
      },
      communityCare: {
        generated: false,
        downloading: false,
        url: null
      }
    }
  });
  
  // Update form data
  const updateFormData = (formType, newFormData) => {
    setFormData(prevData => ({
      ...prevData,
      [formType]: {
        ...prevData[formType],
        ...newFormData
      }
    }));
  };
  
  // Start document processing
  const startProcessing = () => {
    setProcessingStatus({
      isProcessing: true,
      progress: 0,
      statusText: 'Starting document processing...'
    });
  };
  
  // Update processing progress
  const updateProcessingProgress = (progress, statusText) => {
    setProcessingStatus({
      isProcessing: true,
      progress,
      statusText: statusText || `Processing... ${progress}%`
    });
  };
  
  // Complete document processing
  const completeProcessing = () => {
    setProcessingStatus({
      isProcessing: false,
      progress: 100,
      statusText: 'Processing complete'
    });
  };
  
  // Start form generation
  const startFormGeneration = () => {
    setGenerationStatus(prev => ({
      ...prev,
      isGenerating: true
    }));
  };
  
  // Complete form generation
  const completeFormGeneration = (formType, downloadUrl) => {
    setGenerationStatus(prev => ({
      isGenerating: false,
      forms: {
        ...prev.forms,
        [formType]: {
          ...prev.forms[formType],
          generated: true,
          url: downloadUrl
        }
      }
    }));
  };
  
  // Set form download status
  const setDownloadStatus = (formType, isDownloading) => {
    setGenerationStatus(prev => ({
      ...prev,
      forms: {
        ...prev.forms,
        [formType]: {
          ...prev.forms[formType],
          downloading: isDownloading
        }
      }
    }));
  };
  
  // Reset the entire state (for starting over)
  const resetState = () => {
    // Revoke object URLs to prevent memory leaks
    uploadedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    setUploadedFiles([]);
    setPatientData(null);
    setFormData(null);
    setMeasurableGoals([]);
    setActiveForm('ibhs');
    setProcessingStatus({
      isProcessing: false,
      progress: 0,
      statusText: ''
    });
    setGenerationStatus({
      isGenerating: false,
      forms: {
        ibhs: {
          generated: false,
          downloading: false,
          url: null
        },
        communityCare: {
          generated: false,
          downloading: false,
          url: null
        }
      }
    });
  };
  
  // Value object to be provided by the context
  const contextValue = {
    uploadedFiles,
    setUploadedFiles,
    patientData,
    setPatientData,
    // Remove or define updatePatientData
    formData,
    setFormData,
    measurableGoals,
    setMeasurableGoals,
    updateFormData,
    activeForm,
    setActiveForm,
    processingStatus,
    startProcessing,
    updateProcessingProgress,
    completeProcessing,
    generationStatus,
    startFormGeneration,
    completeFormGeneration,
    setDownloadStatus,
    resetState  // Changed to match the function name defined above
  };
  
  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
};

export default FormContext;