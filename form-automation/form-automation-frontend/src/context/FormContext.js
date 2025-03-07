// src/context/FormContext.js
import React, { createContext, useState, useContext } from 'react';

// Create the context
const FormContext = createContext();

// Custom hook to use the form context
export const useFormContext = () => useContext(FormContext);

// Provider component
export const FormProvider = ({ children }) => {
  // State for uploaded files
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // State for extracted patient data
  const [patientData, setPatientData] = useState(null);
  
  // State for form data
  const [formData, setFormData] = useState({
    ibhs: null,
    communityCare: null
  });
  
  // State for tracking current form being edited
  const [activeForm, setActiveForm] = useState(null);
  
  // State for tracking upload processing status
  const [processingStatus, setProcessingStatus] = useState({
    isProcessing: false,
    progress: 0,
    message: ''
  });
  
  // State for form generation status
  const [generationStatus, setGenerationStatus] = useState({
    isGenerating: false,
    forms: {
      ibhs: { generated: false, downloading: false, url: null },
      communityCare: { generated: false, downloading: false, url: null }
    }
  });
  
  // Reset form state
  const resetFormState = () => {
    setUploadedFiles([]);
    setPatientData(null);
    setFormData({
      ibhs: null,
      communityCare: null
    });
    setActiveForm(null);
    setProcessingStatus({
      isProcessing: false,
      progress: 0,
      message: ''
    });
    setGenerationStatus({
      isGenerating: false,
      forms: {
        ibhs: { generated: false, downloading: false, url: null },
        communityCare: { generated: false, downloading: false, url: null }
      }
    });
  };
  
  // Update a specific form's data
  const updateFormData = (formType, newData) => {
    setFormData(prev => ({
      ...prev,
      [formType]: newData
    }));
  };
  
  // Update patient data
  const updatePatientData = (newData) => {
    setPatientData(prev => ({
      ...prev,
      ...newData
    }));
  };
  
  // Start file processing
  const startProcessing = () => {
    setProcessingStatus({
      isProcessing: true,
      progress: 0,
      message: 'Uploading files...'
    });
  };
  
  // Update processing progress
  const updateProcessingProgress = (progress, message) => {
    setProcessingStatus({
      isProcessing: true,
      progress,
      message
    });
  };
  
  // Complete processing
  const completeProcessing = () => {
    setProcessingStatus({
      isProcessing: false,
      progress: 100,
      message: 'Processing complete'
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
      ...prev,
      isGenerating: false,
      forms: {
        ...prev.forms,
        [formType]: {
          generated: true,
          downloading: false,
          url: downloadUrl
        }
      }
    }));
  };
  
  // Set download status
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
  
  // Value object to be provided to consumers
  const value = {
    uploadedFiles,
    setUploadedFiles,
    patientData,
    setPatientData,
    updatePatientData,
    formData,
    setFormData,
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
    resetFormState
  };
  
  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

export default FormContext;