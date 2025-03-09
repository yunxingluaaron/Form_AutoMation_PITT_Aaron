// src/components/forms/CommunityCareFormFields.js
import React from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

const CommunityCareFormFields = ({ formData, onFieldChange, errors = {} }) => {
  // Helper function to handle field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">COMMUNITY CARE IBHS Written Order Letter</h2>
      
      {/* Recipient Information Section */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recipient Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recipient Name */}
          <div>
            <label htmlFor="recipient_name" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="recipient_name"
                name="recipient_name"
                value={formData.recipient_name || ''}
                onChange={handleChange}
                className={`
                  block w-full rounded-md border-gray-300 shadow-sm 
                  focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                  ${errors.recipient_name ? 'border-red-300' : ''}
                `}
              />
              {errors.recipient_name && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FaExclamationCircle className="text-red-500" />
                </div>
              )}
            </div>
            {errors.recipient_name && (
              <p className="mt-1 text-sm text-red-600">{errors.recipient_name}</p>
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
          
        </div>
      </div>
      
      {/* Diagnoses Section */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Current Diagnoses
        </h3>
        
        <div className="relative">
          <textarea
            id="diagnoses"
            name="diagnoses"
            value={formData.diagnoses || ''}
            onChange={handleChange}
            rows={4}
            className={`
              block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.diagnoses ? 'border-red-300' : ''}
            `}
            placeholder="Enter current diagnoses (e.g., Autism Spectrum Disorder F84.0)"
          />
          {errors.diagnoses && (
            <p className="mt-1 text-sm text-red-600">{errors.diagnoses}</p>
          )}
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Include all current behavioral health diagnoses with their corresponding ICD-10 codes.
        </p>
      </div>
      
      {/* Symptoms Section */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Clinical Presentation/Symptoms
        </h3>
        
        <div>
          <textarea
            id="symptoms"
            name="symptoms"
            value={formData.symptoms || ''}
            onChange={handleChange}
            rows={6}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter clinical symptoms and behavioral presentation"
          />
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Describe the clinical presentation, symptoms, and behavioral issues observed.
        </p>
      </div>
      
      {/* Treatment Recommendations Section */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Measurable Goals and Objectives
        </h3>
        
        <div>
          <textarea
            id="treatment_recommendations"
            name="treatment_recommendations"
            value={formData.treatment_recommendations || ''}
            onChange={handleChange}
            rows={20}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter treatment recommendations"
          />
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Provide specific treatment recommendations, services, and interventions.
        </p>
      </div>
      
      {/* Medical Necessity Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
           Suggested Rationales
        </h3>
        
        <div className="relative">
          <textarea
            id="medical_necessity"
            name="medical_necessity"
            value={formData.additional || ''}
            onChange={handleChange}
            rows={15}
            className={`
              block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-blue-500 focus:ring-blue-500 sm:text-sm
              ${errors.medical_necessity ? 'border-red-300' : ''}
            `}
            placeholder="Enter medical necessity justification"
          />
          {errors.medical_necessity && (
            <p className="mt-1 text-sm text-red-600">{errors.medical_necessity}</p>
          )}
        </div>
        
        <p className="mt-2 text-sm text-gray-500">
          Explain why the recommended services are medically necessary based on the recipient's condition.
        </p>
      </div>
    </div>
  );
};

export default CommunityCareFormFields;