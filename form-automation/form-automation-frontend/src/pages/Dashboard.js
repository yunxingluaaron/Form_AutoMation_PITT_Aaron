// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaUpload, FaFileAlt, FaHistory, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import apiService from '../services/api';

const Dashboard = () => {
  const [recentForms, setRecentForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Track if we've already tried loading to prevent repeated calls
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Use useCallback to memoize the loadRecentForms function
  const loadRecentForms = useCallback(async () => {
    // Prevent multiple load attempts if we're already loading or have already tried
    if (!loading || hasAttemptedLoad) return;
    
    try {
      setLoading(true);
      const result = await apiService.getFormHistory();
      setRecentForms(result.forms || []);
      setError(null);
    } catch (error) {
      console.error("Error loading recent forms:", error);
      setError("Failed to retrieve form history");
      // Don't show toast on initial load to avoid spamming the user
      if (hasAttemptedLoad) {
        toast.error("Failed to load recent forms");
      }
    } finally {
      setLoading(false);
      setHasAttemptedLoad(true);
    }
  }, [loading, hasAttemptedLoad]);

  // Load form history only once when component mounts
  useEffect(() => {
    loadRecentForms();
    
    // No cleanup needed since we're not setting up any subscriptions
  }, [loadRecentForms]); // Include the memoized function in dependencies

  // Handle form download
  const handleDownload = async (form) => {
    try {
      await apiService.downloadForm(form.downloadUrl);
      toast.success(`${form.type} form downloaded successfully`);
    } catch (error) {
      toast.error(`Failed to download form: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      {/* Action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/upload"
          className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors flex flex-col items-center justify-center"
        >
          <FaUpload className="text-3xl mb-3" />
          <span className="text-xl font-semibold mb-4">Upload Your EHR or Any Patient Documents</span>
        </Link>
        
        <Link
          to="/form-templates"
          className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors flex flex-col items-center justify-center"
        >
          <FaFileAlt className="text-3xl mb-3" />
          <span className="text-xl font-semibold mb-2">IBHS Form Templates</span>

        </Link>
      </div>
    
    </div>
  );
};

export default Dashboard;