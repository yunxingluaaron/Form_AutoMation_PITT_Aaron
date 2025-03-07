// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

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
      console.log(`Uploading file to ${API_BASE_URL}/upload`);
      
      // Create form data
      const formData = new FormData();
      
      // Use the first file (backend currently processes only one file)
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
        // Extract patientData and formData from the response
        return {
          patientData: {
            ...response.data.patientData,
            extractedText: response.data.extractedText // Include extracted OCR text
          },
          formData: response.data.formData || {
            ibhs: {},
            communityCare: {}
          }
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
      // If the URL already starts with /api, don't prepend API_BASE_URL
      // Instead, extract the path portion and append to the base URL
      let downloadUrl;
      
      if (url.startsWith('/api/')) {
        // Extract the path after /api/ and append to base URL
        const path = url.replace('/api/', '');
        downloadUrl = `${API_BASE_URL.replace(/\/api\/?$/, '')}/${path}`;
      } else {
        // Regular case - just prepend base URL if needed
        downloadUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      }
      
      console.log(`Downloading form from: ${downloadUrl}`);
      
      // For direct download, use window.open
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