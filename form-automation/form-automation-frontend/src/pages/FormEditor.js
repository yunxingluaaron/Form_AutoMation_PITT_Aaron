// src/pages/FormEditor.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaSave, 
  FaEye, 
  FaFilePdf, 
  FaArrowLeft, 
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

import { useFormContext } from '../context/FormContext';
import apiService from '../services/api';

// Import form components
import IBHSFormFields from '../components/forms/IBHSFormFields';
import CommunityCareFormFields from '../components/forms/CommunityCareFormFields';

const FormEditor = () => {
  const navigate = useNavigate();
  const {
    patientData,
    formData,
    updateFormData,
    activeForm,
    setActiveForm,
    startFormGeneration,
    completeFormGeneration
  } = useFormContext();
  
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [editedFormData, setEditedFormData] = useState({
    ibhs: {},
    communityCare: {}
  });
  
  // Initialize edited form data when form data is available
  useEffect(() => {
    if (formData) {
      // Convert from backend field names to frontend field names if needed
      console.log("Setting edited form data from backend:", formData);
      
      const mappedIBHSData = mapBackendToFrontendFields(formData.ibhs, 'ibhs');
      const mappedCCData = mapBackendToFrontendFields(formData.communityCare, 'communityCare');
      
      setEditedFormData({
        ibhs: mappedIBHSData,
        communityCare: mappedCCData
      });
      
      // Set active form if not already set
      if (!activeForm) {
        setActiveForm('ibhs');
      }
    }
  }, [formData, activeForm, setActiveForm]);
  
  // Map backend field names to frontend field names if necessary
  const mapBackendToFrontendFields = (data, formType) => {
    if (!data) return {};
    
    const mappedData = {...data};
    
    // Handle field mapping for IBHS form
    if (formType === 'ibhs') {
      // Map recipient_name to child_name if needed
      if (data.recipient_name && !data.child_name) {
        mappedData.child_name = data.recipient_name;
      }
      
      // Map recipient_dob to dob if needed
      if (data.recipient_dob && !data.dob) {
        mappedData.dob = data.recipient_dob;
      }
      
      // Map guardian_name to parent_guardian if needed
      if (data.guardian_name && !data.parent_guardian) {
        mappedData.parent_guardian = data.guardian_name;
      }
      
      // Map diagnosis_primary to part of current_diagnoses if needed
      if (data.diagnosis_primary && !data.current_diagnoses) {
        const code = data.diagnosis_code_primary ? ` (${data.diagnosis_code_primary})` : '';
        mappedData.current_diagnoses = `${data.diagnosis_primary}${code}`;
      }
      
      // Map presenting_problems to clinical_information if needed
      if (data.presenting_problems && !data.clinical_information) {
        mappedData.clinical_information = data.presenting_problems;
      }
      
      // Map treatment_goals to measurable_goals if needed
      if (data.treatment_goals && !data.measurable_goals) {
        mappedData.measurable_goals = data.treatment_goals;
      }
    }
    
    // Handle field mapping for Community Care form
    if (formType === 'communityCare') {
      // Map member_name to recipient_name if needed
      if (data.member_name && !data.recipient_name) {
        mappedData.recipient_name = data.member_name;
      }
      
      // Map member_dob to dob if needed
      if (data.member_dob && !data.dob) {
        mappedData.dob = data.member_dob;
      }
      
      // Map caregiver_name to guardian_name if needed
      if (data.caregiver_name && !data.guardian_name) {
        mappedData.guardian_name = data.caregiver_name;
      }
      
      // Format diagnoses array to string if needed
      if (data.diagnosis && Array.isArray(data.diagnosis) && !data.diagnoses) {
        mappedData.diagnoses = data.diagnosis.map(d => {
          if (typeof d === 'object') {
            const name = d.name || '';
            const code = d.code ? ` (${d.code})` : '';
            return `${name}${code}`;
          }
          return d;
        }).join('\n');
      }
      
      // Map clinical_summary to symptoms if needed
      if (data.clinical_summary && !data.symptoms) {
        mappedData.symptoms = data.clinical_summary;
      }
      
      // Map treatment_plan to treatment_recommendations if needed
      if (data.treatment_plan && !data.treatment_recommendations) {
        mappedData.treatment_recommendations = data.treatment_plan;
      }
    }
    
    return mappedData;
  };
  
  // Handle tab change
  const handleTabChange = (formType) => {
    // Save current form data first
    handleFormDataChange(editedFormData[activeForm], activeForm);
    
    // Change active tab
    setActiveForm(formType);
    
    // Clear validation errors when switching tabs
    setValidationErrors({});
  };
  
  // Handle form field changes
  const handleFieldChange = (fieldName, value) => {
    setEditedFormData(prev => ({
      ...prev,
      [activeForm]: {
        ...prev[activeForm],
        [fieldName]: value
      }
    }));
    
    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: null
      }));
    }
  };
  
  // Save form data
  const handleFormDataChange = (newFormData, formType) => {
    updateFormData(formType, newFormData);
  };
  
  // Save current form
  const saveForm = async () => {
    // Save current form data to context
    handleFormDataChange(editedFormData[activeForm], activeForm);
    
    try {
      setIsSaving(true);
      await apiService.saveDraft(activeForm, editedFormData[activeForm]);
      toast.success(`${activeForm === 'ibhs' ? 'IBHS' : 'Community Care'} form saved successfully`);
    } catch (error) {
      toast.error(`Failed to save form: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Validate form data
  const validateForm = (formType) => {
    const errors = {};
    const data = editedFormData[formType];
    
    console.log(`Validating ${formType} form with data:`, data);
    
    // Debugging: Confirm the data structure
    if (!data) {
      console.error(`No data found for ${formType} form`);
      return { general: 'Form data is missing' };
    }
    
    // Using field names that match the actual form data structure
    // These should match exactly what's available in your form state
    const requiredFields = {};
    
    if (formType === 'ibhs') {
      requiredFields.child_name = 'Child Name';
      requiredFields.dob = 'Date of Birth';
      requiredFields.current_diagnoses = 'Current Diagnoses';
    } else if (formType === 'communityCare') {
      requiredFields.recipient_name = 'Recipient Name';
      requiredFields.dob = 'Date of Birth';
      requiredFields.diagnoses = 'Diagnoses';
    }
    
    // Check each required field
    Object.entries(requiredFields).forEach(([field, label]) => {
      console.log(`Checking field '${field}':`, data[field]);
      
      // Handle different data types (string, number, null, undefined)
      const value = data[field];
      const isEmpty = 
        value === undefined || 
        value === null || 
        (typeof value === 'string' && value.trim() === '');
      
      if (isEmpty) {
        errors[field] = `${label} is required`;
      }
    });
    
    console.log(`Validation errors for ${formType}:`, errors);
    return errors;
  };
  
  // Generate forms
  const handleGenerateForms = async () => {
    // Save current form data
    handleFormDataChange(editedFormData[activeForm], activeForm);
    
    try {
      // Validate both forms
      const ibhsErrors = validateForm('ibhs');
      const communityCareErrors = validateForm('communityCare');
      
      // If there are validation errors, show them and return
      if (Object.keys(ibhsErrors).length > 0 || Object.keys(communityCareErrors).length > 0) {
        // Set the active form to the one with errors
        if (Object.keys(ibhsErrors).length > 0) {
          setActiveForm('ibhs');
          setValidationErrors(ibhsErrors);
          toast.error('Please fix the IBHS form validation errors');
        } else {
          setActiveForm('communityCare');
          setValidationErrors(communityCareErrors);
          toast.error('Please fix the Community Care form validation errors');
        }
        return;
      }
      
      // If we get here, forms are valid
      startFormGeneration();
      
      // Call API to generate forms
      const response = await apiService.generateForms(editedFormData);
      
      if (response.status === 'success') {
        // Update generation status for both forms
        completeFormGeneration('ibhs', response.downloadLinks.ibhs);
        completeFormGeneration('communityCare', response.downloadLinks.communityCare);
        
        toast.success('Forms generated successfully!');
        
        // Navigate to preview
        navigate('/preview');
      } else {
        toast.error('Form generation completed but with errors');
      }
    } catch (error) {
      toast.error(`Failed to generate forms: ${error.message || 'Unknown error'}`);
      console.error('Form generation error:', error);
    }
  };
  
  // Go back to upload page
  const goBack = () => {
    navigate('/upload');
  };
  
  // Go to preview page
  const goToPreview = () => {
    // Save current form data
    handleFormDataChange(editedFormData[activeForm], activeForm);
    
    // Navigate to preview
    navigate('/preview');
  };
  
  // If no form data is available, redirect to upload
  if (!formData || !editedFormData.ibhs || !editedFormData.communityCare) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No Form Data Available</h2>
        <p className="text-gray-600 mb-6">
          Please upload and process documents before editing forms.
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
        <h1 className="text-3xl font-bold text-gray-800">Edit Form Data</h1>
        <div className="flex space-x-3">
          <button
            onClick={goBack}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>
          
          <button
            onClick={saveForm}
            disabled={isSaving}
            className={`
              flex items-center px-4 py-2 rounded-lg text-white
              ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
              transition-colors
            `}
          >
            {isSaving ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Save Draft
              </>
            )}
          </button>
          
          <button
            onClick={goToPreview}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FaEye className="mr-2" />
            Preview
          </button>
          
          <button
            onClick={handleGenerateForms}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FaFilePdf className="mr-2" />
            Generate Forms
          </button>
        </div>
      </div>
      
      {/* Patient Summary */}
      {patientData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Patient Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{patientData.name || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">{patientData.dob || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Age</p>
              <p className="font-medium">{patientData.age || 'Not specified'}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Form Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => handleTabChange('ibhs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeForm === 'ibhs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            WRITTEN ORDER FOR IBHS
          </button>
          <button
            onClick={() => handleTabChange('communityCare')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeForm === 'communityCare'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            COMMUNITY CARE IBHS Form
          </button>
        </nav>
      </div>
      
      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeForm === 'ibhs' && editedFormData.ibhs && (
          <IBHSFormFields
            formData={editedFormData.ibhs}
            onFieldChange={handleFieldChange}
            errors={validationErrors}
          />
        )}
        
        {activeForm === 'communityCare' && editedFormData.communityCare && (
          <CommunityCareFormFields
            formData={editedFormData.communityCare}
            onFieldChange={handleFieldChange}
            errors={validationErrors}
          />
        )}
      </div>
    </div>
  );
};

export default FormEditor;