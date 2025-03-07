// src/pages/FormPreview.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaEdit, 
  FaDownload, 
  FaFilePdf, 
  FaSpinner, 
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';

import { useFormContext } from '../context/FormContext';
import apiService from '../services/api';

const FormPreview = () => {
  const navigate = useNavigate();
  const {
    formData,
    generationStatus,
    setDownloadStatus,
    startFormGeneration,
    completeFormGeneration
  } = useFormContext();
  
  const [activeTab, setActiveTab] = useState('ibhs');
  
  // Generate forms if not already generated
  const handleGenerateForms = async () => {
    try {
      startFormGeneration();
      
      // Call API to generate forms
      const response = await apiService.generateForms(formData);
      
      if (response.status === 'success') {
        // Update generation status for both forms
        completeFormGeneration('ibhs', response.downloadLinks.ibhs);
        completeFormGeneration('communityCare', response.downloadLinks.communityCare);
        
        toast.success('Forms generated successfully');
      }
    } catch (error) {
      toast.error(`Failed to generate forms: ${error.message}`);
    }
  };
  
  // Download a form
  const handleDownload = async (formType) => {
    const url = generationStatus.forms[formType].url;
    
    if (!url) {
      toast.error('Form URL not available. Please generate the form first.');
      return;
    }
    
    try {
      setDownloadStatus(formType, true);
      await apiService.downloadForm(url);
      toast.success(`${formType === 'ibhs' ? 'IBHS' : 'Community Care'} form downloaded successfully`);
    } catch (error) {
      toast.error(`Failed to download form: ${error.message}`);
    } finally {
      setDownloadStatus(formType, false);
    }
  };
  
  // Go to editor
  const goToEditor = () => {
    navigate('/editor');
  };
  
  // Go back to dashboard
  const goToDashboard = () => {
    navigate('/');
  };
  
  // If no form data is available, redirect to upload
  if (!formData || !formData.ibhs || !formData.communityCare) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Form Data Available</h2>
        <p className="text-gray-600 mb-6">
          Please upload and process documents before previewing forms.
        </p>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Upload
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Form Preview</h1>
        <div className="flex space-x-3">
          <button
            onClick={goToDashboard}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Dashboard
          </button>
          
          <button
            onClick={goToEditor}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaEdit className="mr-2" />
            Edit Forms
          </button>
          
          {!generationStatus.forms.ibhs.generated && (
            <button
              onClick={handleGenerateForms}
              disabled={generationStatus.isGenerating}
              className={`
                flex items-center px-4 py-2 rounded-lg text-white
                ${generationStatus.isGenerating ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                transition-colors
              `}
            >
              {generationStatus.isGenerating ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FaFilePdf className="mr-2" />
                  Generate Forms
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Form Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('ibhs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ibhs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            WRITTEN ORDER FOR IBHS
          </button>
          <button
            onClick={() => setActiveTab('communityCare')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'communityCare'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            COMMUNITY CARE IBHS Form
          </button>
        </nav>
      </div>
      
      {/* Form Preview Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'ibhs' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">WRITTEN ORDER FOR IBHS</h2>
              
              <button
                onClick={() => handleDownload('ibhs')}
                disabled={!generationStatus.forms.ibhs.generated || generationStatus.forms.ibhs.downloading}
                className={`
                  flex items-center px-4 py-2 rounded-lg text-white
                  ${!generationStatus.forms.ibhs.generated ? 
                    'bg-gray-400 cursor-not-allowed' : 
                    generationStatus.forms.ibhs.downloading ? 
                      'bg-green-400 cursor-not-allowed' : 
                      'bg-green-600 hover:bg-green-700'
                  }
                  transition-colors
                `}
              >
                {generationStatus.forms.ibhs.downloading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FaDownload className="mr-2" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
            
            {/* Form Status */}
            {!generationStatus.forms.ibhs.generated ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-yellow-500 mr-3" />
                  <p className="text-yellow-700">
                    This form has not been generated yet. Click "Generate Forms" to create a PDF.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-3" />
                  <p className="text-green-700">
                    This form is ready for download!
                  </p>
                </div>
              </div>
            )}
            
            {/* IBHS Form Preview */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
              <h3 className="text-lg font-bold text-center mb-6">WRITTEN ORDER FOR IBHS</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-800">Child Information</h4>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Child's Name</p>
                      <p>{formData.ibhs.child_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p>{formData.ibhs.dob || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Parent/Guardian</p>
                      <p>{formData.ibhs.parent_guardian || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Current Behavioral Health Diagnoses</h4>
                  <div className="mt-2">
                    <p className="whitespace-pre-line">{formData.ibhs.current_diagnoses || 'None specified'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Measurable Goals and Objectives</h4>
                  <div className="mt-2">
                    <p className="whitespace-pre-line">{formData.ibhs.measurable_goals || 'None specified'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Clinical Information</h4>
                  <div className="mt-2">
                    <p className="whitespace-pre-line">{formData.ibhs.clinical_information || 'None specified'}</p>
                  </div>
                </div>
                
                {formData.ibhs.treatment_history && (
                  <div>
                    <h4 className="font-medium text-gray-800">Treatment History</h4>
                    <div className="mt-2">
                      <p className="whitespace-pre-line">{formData.ibhs.treatment_history}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'communityCare' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">COMMUNITY CARE IBHS Written Order Letter</h2>
              
              <button
                onClick={() => handleDownload('communityCare')}
                disabled={!generationStatus.forms.communityCare.generated || generationStatus.forms.communityCare.downloading}
                className={`
                  flex items-center px-4 py-2 rounded-lg text-white
                  ${!generationStatus.forms.communityCare.generated ? 
                    'bg-gray-400 cursor-not-allowed' : 
                    generationStatus.forms.communityCare.downloading ? 
                      'bg-green-400 cursor-not-allowed' : 
                      'bg-green-600 hover:bg-green-700'
                  }
                  transition-colors
                `}
              >
                {generationStatus.forms.communityCare.downloading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FaDownload className="mr-2" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
            
            {/* Form Status */}
            {!generationStatus.forms.communityCare.generated ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-yellow-500 mr-3" />
                  <p className="text-yellow-700">
                    This form has not been generated yet. Click "Generate Forms" to create a PDF.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-500 mr-3" />
                  <p className="text-green-700">
                    This form is ready for download!
                  </p>
                </div>
              </div>
            )}
            
            {/* Community Care Form Preview */}
            <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
              <h3 className="text-lg font-bold text-center mb-6">COMMUNITY CARE IBHS WRITTEN ORDER LETTER</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-800">Recipient Information</h4>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p>{formData.communityCare.recipient_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p>{formData.communityCare.dob || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Age</p>
                      <p>{formData.communityCare.age || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Current Diagnoses</h4>
                  <div className="mt-2">
                    <p className="whitespace-pre-line">{formData.communityCare.diagnoses || 'None specified'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Clinical Presentation/Symptoms</h4>
                  <div className="mt-2">
                    <p className="whitespace-pre-line">{formData.communityCare.symptoms || 'None specified'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Treatment Recommendations</h4>
                  <div className="mt-2">
                    <p className="whitespace-pre-line">{formData.communityCare.treatment_recommendations || 'None specified'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Medical Necessity</h4>
                  <div className="mt-2">
                    <p className="whitespace-pre-line">{formData.communityCare.medical_necessity || 'None specified'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormPreview;