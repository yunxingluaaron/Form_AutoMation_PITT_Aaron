// src/components/forms/IBHSFormFields.js
import React from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

const IBHSFormFields = ({ formData, onFieldChange, errors = {} }) => {
  // Helper function to handle field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">WRITTEN ORDER FOR IBHS</h2>
      
      {/* Child Information Section */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Child Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Child's Name */}
          <div>
            <label htmlFor="child_name" className="block text-sm font-medium text-gray-700 mb-1">
              Child's Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="child_name"
                name="child_name"
                value={formData.child_name || ''}
                onChange={handleChange}
                className={`
                  block w-full rounded-md border-gray-300 shadow-sm 
                  focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                  ${errors.child_name ? 'border-red-300' : ''}
                `}
              />
              {errors.child_name && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FaExclamationCircle className="text-red-500" />
                </div>
              )}
            </div>
            {errors.child_name && (
              <p className="mt-1 text-sm text-red-600">{errors.child_name}</p>
            )}
          </div>
          
          {/* Date of Birth */}
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <div className="relative">
              <input
                type="text"
                id="dob"
                name="dob"
                value={formData.dob || ''}
                onChange={handleChange}
                placeholder="MM/DD/YYYY"
                className={`
                  block w-full rounded-md border-gray-300 shadow-sm 
                  focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                  ${errors.dob ? 'border-red-300' : ''}
                `}
              />
              {errors.dob && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FaExclamationCircle className="text-red-500" />
                </div>
              )}
            </div>
            {errors.dob && (
              <p className="mt-1 text-sm text-red-600">{errors.dob}</p>
            )}
          </div>
          
          {/* Parent/Guardian */}
          <div>
            <label htmlFor="parent_guardian" className="block text-sm font-medium text-gray-700 mb-1">
              Parent/Guardian Name
            </label>
            <input
              type="text"
              id="parent_guardian"
              name="parent_guardian"
              value={formData.parent_guardian || ''}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Diagnoses Section */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Current Behavioral Health Diagnosis
        </h3>
        
        <div className="relative">
          <textarea
            id="current_diagnoses"
            name="current_diagnoses"
            value={formData.current_diagnoses || ''}
            onChange={handleChange}
            rows={4}
            className={`
              block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.current_diagnoses ? 'border-red-300' : ''}
            `}
            placeholder="Enter current diagnoses (e.g., Autism Spectrum Disorder F84.0)"
          />
          {errors.current_diagnoses && (
            <p className="mt-1 text-sm text-red-600">{errors.current_diagnoses}</p>
          )}
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Include all current behavioral health diagnoses with their corresponding ICD-10 codes.
        </p>
      </div>
      
      {/* Measurable Goals Section */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Measurable Goals and Objectives
        </h3>
        
        <div className="relative">
          <textarea
            id="measurable_goals"
            name="measurable_goals"
            value={formData.measurable_goals || ''}
            onChange={handleChange}
            rows={6}
            className={`
              block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.measurable_goals ? 'border-red-300' : ''}
            `}
            placeholder="Enter measurable treatment goals and objectives"
          />
          {errors.measurable_goals && (
            <p className="mt-1 text-sm text-red-600">{errors.measurable_goals}</p>
          )}
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Goals should be specific, measurable, achievable, relevant, and time-bound (SMART).
        </p>
      </div>
      
      {/* Clinical Information Section */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Clinical Information
        </h3>
        
        <div>
          <textarea
            id="clinical_information"
            name="clinical_information"
            value={formData.clinical_information || ''}
            onChange={handleChange}
            rows={6}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter clinical information, symptoms, and behaviors"
          />
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Include relevant symptoms, behaviors, functional impairments, and other clinical observations.
        </p>
      </div>
      
      {/* Treatment History Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Treatment History (Optional)
        </h3>
        
        <div>
          <textarea
            id="treatment_history"
            name="treatment_history"
            value={formData.treatment_history || ''}
            onChange={handleChange}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter any relevant treatment history information"
          />
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Include previous treatments, services, or interventions and their outcomes if relevant.
        </p>
      </div>
    </div>
  );
};

export default IBHSFormFields;