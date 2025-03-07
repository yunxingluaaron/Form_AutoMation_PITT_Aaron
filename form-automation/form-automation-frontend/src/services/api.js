// src/services/api.js - Complete updated version
import axios from 'axios';

// Base URL for API calls
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// API service object
const apiService = {
  // Upload files for processing
  uploadFiles: async (files, onProgress) => {
    const formData = new FormData();
    
    // Append each file to form data
    files.forEach(file => {
      formData.append('file', file);
    });
    
    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(percentCompleted);
          }
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload error:', error.response?.data || error.message);
      throw new Error('File upload failed');
    }
  },
  
  // Generate forms based on extracted and mapped data
  generateForms: async (formData) => {
    try {
      const response = await api.post('/generate-forms', { formData });
      return response.data;
    } catch (error) {
      console.error('Form generation error:', error.response?.data || error.message);
      throw new Error('Form generation failed');
    }
  },
  
  // Update form data
  updateFormData: async (formType, formData) => {
    try {
      const response = await api.post(`/update-form/${formType}`, { formData });
      return response.data;
    } catch (error) {
      console.error('Form update error:', error.response?.data || error.message);
      throw new Error('Form update failed');
    }
  },
  
  // Save draft form
  saveDraft: async (formType, formData) => {
    try {
      const response = await api.post(`/save-draft/${formType}`, { formData });
      return response.data;
    } catch (error) {
      console.error('Save draft error:', error.response?.data || error.message);
      throw new Error('Failed to save draft');
    }
  },
  
  // Get form history - with retry limit
  getFormHistory: async (retryCount = 0) => {
    try {
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/form-history?_t=${timestamp}`);
      return response.data;
    } catch (error) {
      console.error('Form history error:', error);
      
      // Only retry network errors, not 4xx/5xx responses
      if (error.message === 'Network Error' && retryCount < 2) {
        console.log(`Retrying form history request (${retryCount + 1}/2)...`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        return apiService.getFormHistory(retryCount + 1);
      }
      
      throw new Error('Failed to retrieve form history');
    }
  },
  
  // Get a previously generated form
  getForm: async (formId) => {
    try {
      const response = await api.get(`/forms/${formId}`);
      return response.data;
    } catch (error) {
      console.error('Get form error:', error.response?.data || error.message);
      throw new Error('Failed to retrieve form');
    }
  },
  
  // Download a generated form
  downloadForm: async (formUrl) => {
    try {
      // Fix the URL to ensure it points to the backend server
      // Extract the path part if it's a full URL
      const urlPath = formUrl.startsWith('http') 
        ? new URL(formUrl).pathname 
        : formUrl;
      
      // Determine the base URL without the '/api' part since it might already be in the path
      const baseUrl = API_BASE_URL.endsWith('/api') 
        ? API_BASE_URL.substring(0, API_BASE_URL.length - 4) 
        : API_BASE_URL;
      
      // Construct the full URL
      // If urlPath already starts with /api, use it as is
      // Otherwise, ensure it has /api prefix
      const fullUrl = urlPath.startsWith('/api') 
        ? `${baseUrl}${urlPath}` 
        : `${baseUrl}/api${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
      
      console.log('Downloading from:', fullUrl);
      
      const response = await axios.get(fullUrl, {
        responseType: 'blob',
        // Add validation for proper PDF content
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Default
        }
      });
      
      // Check if we got a valid PDF (PDFs start with "%PDF")
      const blob = new Blob([response.data]);
      
      // Check file size - a valid PDF should be more than a few bytes
      if (blob.size < 100) {  // Tiny files are likely error responses
        throw new Error('The downloaded file appears to be invalid or empty');
      }
      
      // Use FileReader to check PDF header
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = function(e) {
          const arr = new Uint8Array(e.target.result);
          // Check for PDF signature in first few bytes
          const header = String.fromCharCode.apply(null, arr.slice(0, 5));
          
          if (header.indexOf('%PDF') !== 0) {
            // Not a valid PDF
            // Try to extract error message if it's text
            const textReader = new FileReader();
            textReader.onload = function() {
              try {
                const text = textReader.result;
                if (text.length < 100) {
                  reject(new Error(`Invalid PDF: ${text}`));
                } else {
                  reject(new Error('The downloaded file is not a valid PDF'));
                }
              } catch (e) {
                reject(new Error('Failed to download a valid PDF file'));
              }
            };
            textReader.readAsText(blob);
            return;
          }
          
          // If we got here, it's a valid PDF
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Extract filename from URL
          const urlParts = urlPath.split('/');
          const filename = urlParts[urlParts.length - 1];
          link.setAttribute('download', filename);
          
          // Append link and trigger click
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          resolve(true);
        };
        
        reader.onerror = function() {
          reject(new Error('Error reading the downloaded file'));
        };
        
        reader.readAsArrayBuffer(blob.slice(0, 8)); // Just need the header
      });
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }
};

export default apiService;