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
          <span className="text-xl font-semibold mb-2">Upload Documents</span>
          <span className="text-sm text-center">
            Upload evaluation reports to extract patient data
          </span>
        </Link>
        
        <Link
          to="/form-templates"
          className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors flex flex-col items-center justify-center"
        >
          <FaFileAlt className="text-3xl mb-3" />
          <span className="text-xl font-semibold mb-2">Form Templates</span>
          <span className="text-sm text-center">
            View and manage available form templates
          </span>
        </Link>
      </div>
      
      {/* Recent Forms Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Recent Forms</h2>
          
          {/* Only show refresh button if we've already tried loading once */}
          {hasAttemptedLoad && !loading && (
            <button
              onClick={() => {
                setLoading(true);
                setHasAttemptedLoad(false); // Reset to allow another load attempt
              }}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <FaHistory className="mr-1" /> Refresh
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <FaSpinner className="animate-spin text-gray-500 text-3xl mx-auto mb-3" />
            <p className="text-gray-500">Loading recent forms...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <FaExclamationTriangle className="text-red-500 text-3xl mx-auto mb-3" />
            <p>{error}</p>
          </div>
        ) : recentForms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent forms found</p>
            <p className="text-sm text-gray-400 mt-2">
              Upload documents to generate forms
            </p>
            <Link
              to="/upload"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Upload Documents
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentForms.map((form) => (
              <div key={form.id} className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {form.type} - {form.patientName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Generated on {new Date(form.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-x-3">
                    <Link
                      to={`/forms/${form.id}`}
                      className="px-3 py-1 bg-blue-100 text-blue-600 rounded-md text-sm hover:bg-blue-200 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDownload(form)}
                      className="px-3 py-1 bg-green-100 text-green-600 rounded-md text-sm hover:bg-green-200 transition-colors"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;