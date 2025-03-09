// src/components/TextExtractionPreview.js
import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

/**
 * Component to display extracted text with toggle option
 */
const TextExtractionPreview = ({ extractedText }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!extractedText) {
    return null;
  }
  
  // Truncate the text for preview
  const previewText = isExpanded 
    ? extractedText 
    : (extractedText.length > 500 
        ? extractedText.substring(0, 500) + '...' 
        : extractedText);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-medium text-gray-800">OCR Extracted Text</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          {isExpanded ? (
            <>
              <FaEyeSlash className="mr-1" />
              Show Less
            </>
          ) : (
            <>
              <FaEye className="mr-1" />
              Show Full Text
            </>
          )}
        </button>
      </div>
      
      <div className={`bg-gray-50 p-3 rounded overflow-auto ${isExpanded ? 'max-h-96' : 'max-h-32'}`}>
        <pre className="text-sm whitespace-pre-wrap text-gray-700 font-mono">
          {previewText}
        </pre>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        This is the raw text extracted from your document using Mistral OCR.
        ChatGPT analyzed this text to extract structured patient data.
      </p>
    </div>
  );
};

export default TextExtractionPreview;