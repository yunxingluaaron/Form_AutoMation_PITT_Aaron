// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const apiService = {
  /**
   * Upload and process files
   * @param {Array} files - Array of file objects
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} - Resolved with extracted data
   */
  uploadFiles: async (files, onProgress) => {
    try {
      // Create form data
      const formData = new FormData();
      
      // Use the first file (simplifying to one file for now based on the backend)
      if (files.length > 0) {
        formData.append('file', files[0]);
      }
      
      // Upload file and process with backend OCR + LLM
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        }
      });
      
      if (response.data.status === 'success') {
        // Restructure data based on your backend response
        return {
          // Original patient data from backend
          patientData: response.data.patientData || {},
          // Form data from backend
          formData: response.data.formData || {
            ibhs: {},
            communityCare: {}
          },
          // Keep original response for debugging
          originalResponse: response.data
        };
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('File upload error:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Failed to process files. Please try again.');
      }
    }
  },
  
  /**
   * Generate PDF forms
   * @param {Object} formData - Form data for both forms
   * @returns {Promise} - Resolved with download links
   */
  generateForms: async (formData) => {
    try {
      const response = await api.post('/generate-forms', {
        formData: formData
      });
      
      if (response.data.status === 'success') {
        return {
          status: 'success',
          message: response.data.message,
          downloadLinks: response.data.downloadLinks
        };
      } else {
        throw new Error(response.data.error || 'Form generation failed');
      }
    } catch (error) {
      console.error('Form generation error:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Failed to generate forms. Please try again.');
      }
    }
  },
  
  /**
   * Download a form
   * @param {String} url - Form download URL
   */
  downloadForm: async (url) => {
    try {
      // Check if URL is relative or absolute
      const downloadUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      
      // Open the URL in a new tab for download
      window.open(downloadUrl, '_blank');
      
      return true;
    } catch (error) {
      console.error('Form download error:', error);
      throw new Error('Failed to download form');
    }
  },
  
  /**
   * Save form draft
   * @param {String} formType - Type of form (ibhs or communityCare)
   * @param {Object} formData - Form data
   */
  saveDraft: async (formType, formData) => {
    try {
      const response = await api.post('/save-draft', {
        formType,
        formData
      });
      
      if (response.data.status === 'success') {
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Save draft error:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Failed to save draft. Please try again.');
      }
    }
  }
};

export default apiService;