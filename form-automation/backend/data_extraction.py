# data_extraction.py
import re
from mistralai import Mistral
import os
import json

# Initialize Mistral client for NLP tasks
api_key = os.environ.get("MISTRAL_API_KEY")
mistral_client = Mistral(api_key=api_key)

def extract_patient_data(text):
    """
    Extract patient data from OCR text using a combination of rule-based parsing
    and LLM-assisted extraction.
    
    Args:
        text (str): The OCR-extracted text from medical documents
        
    Returns:
        dict: Structured patient data
    """
    # First attempt rule-based extraction for common patterns
    patient_data = {
        "name": extract_name(text),
        "age": extract_age(text),
        "dob": extract_dob(text),
        "diagnoses": extract_diagnoses(text),
        "guardian": extract_guardian_info(text),
        "symptoms": [],
        "goals": [],
        "treatment_history": None
    }
    
    # Use LLM to extract more complex information
    patient_data = enhance_with_llm(text, patient_data)
    
    return patient_data

def extract_name(text):
    """Extract patient name using regex patterns"""
    # Try common formats
    patterns = [
        r"(?:Patient|Client|Child)'?s?\s+Name:?\s+([A-Za-z\s.-]+)",
        r"Name:?\s+([A-Za-z\s.-]+)",
        r"(?:Patient|Client|Child):?\s+([A-Za-z\s.-]+)"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    
    return None

def extract_age(text):
    """Extract patient age"""
    patterns = [
        r"Age:?\s+(\d+)\s*(?:years|yrs|y\.o\.)?",
        r"(\d+)\s*(?:years|yrs|year|yr)(?:\s+old)?"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    
    return None

def extract_dob(text):
    """Extract date of birth"""
    # Match common date formats (MM/DD/YYYY, MM-DD-YYYY, etc.)
    patterns = [
        r"(?:DOB|Date\s+of\s+Birth):?\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        r"(?:DOB|Date\s+of\s+Birth):?\s+(\w+\s+\d{1,2},?\s+\d{2,4})"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    
    return None

def extract_diagnoses(text):
    """Extract diagnoses including ICD codes"""
    diagnoses = []
    
    # Look for diagnosis patterns including ICD-10 codes
    patterns = [
        r"(?:Diagnosis|Dx):?\s+([A-Za-z\s]+)\s+\(?(F\d+\.\d+)\)?",
        r"(F\d+\.\d+)\s+([A-Za-z\s]+)",
        r"([A-Za-z\s]+)\s+(?:Disorder|Syndrome)\s+\(?(F\d+\.\d+)\)?"
    ]
    
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            if len(match.groups()) == 2:
                # If we have both diagnosis name and code
                if match.group(1).startswith('F'):
                    code, name = match.group(1), match.group(2)
                else:
                    name, code = match.group(1), match.group(2)
                
                diagnoses.append({
                    "name": name.strip(),
                    "code": code.strip()
                })
    
    return diagnoses

def extract_guardian_info(text):
    """Extract guardian information"""
    patterns = [
        r"(?:Parent|Guardian):?\s+([A-Za-z\s.-]+)",
        r"(?:Parent|Guardian)'?s?\s+Name:?\s+([A-Za-z\s.-]+)"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return {"name": match.group(1).strip()}
    
    return {"name": None}

def enhance_with_llm(text, partial_data):
    """
    Use Mistral LLM to extract additional information and enhance extraction
    
    Args:
        text (str): OCR text
        partial_data (dict): Partially extracted data from rule-based methods
        
    Returns:
        dict: Enhanced patient data
    """
    # Prepare a prompt for the LLM
    prompt = f"""Extract the following information from this medical document about a patient:
1. Symptoms or behavioral issues described
2. Treatment goals
3. Treatment history (if mentioned)

For any field where information is not available, respond with "None".
Format the response as JSON with keys: "symptoms", "goals", "treatment_history".

Document text:
{text[:4000]}  # Limiting text length to avoid token limits
"""

    # Call the LLM
    response = mistral_client.chat.complete(
        model="mistral-small-latest",  # Using a smaller model for efficiency
        messages=[{"role": "user", "content": prompt}]
    )
    
    print(f"starting to use LLM to extract the data")
    # Parse the response
    try:
        # Try to extract JSON from the response
        content = response.choices[0].message.content
        
        # Find JSON in response (handle potential text before/after JSON)
        json_text = extract_json_from_text(content)
        if json_text:
            llm_extracted = json.loads(json_text)
            
            # Update partial data with LLM extracted fields
            if llm_extracted.get("symptoms"):
                partial_data["symptoms"] = llm_extracted["symptoms"]
            
            if llm_extracted.get("goals"):
                partial_data["goals"] = llm_extracted["goals"]
            
            if llm_extracted.get("treatment_history"):
                partial_data["treatment_history"] = llm_extracted["treatment_history"]
    
    except Exception as e:
        print(f"Error parsing LLM response: {e}")
    
    return partial_data

def extract_json_from_text(text):
    """Extract JSON object from text that may contain other content"""
    try:
        # Try to find JSON object in the text
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            return text[start_idx:end_idx+1]
        return None
    except:
        return None