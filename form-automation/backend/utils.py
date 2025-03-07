# utils.py
import json
import os
import re
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def sanitize_filename(filename):
    """
    Sanitize a filename to ensure it is valid across operating systems
    
    Args:
        filename (str): The original filename
        
    Returns:
        str: Sanitized filename
    """
    # Replace invalid characters with underscores
    return re.sub(r'[\\/*?:"<>|]', "_", filename)

def save_form_data(form_data, form_type, output_dir='./form_data'):
    """
    Save form data to a JSON file for later use or reference
    
    Args:
        form_data (dict): Form data to save
        form_type (str): Type of form ('ibhs' or 'community_care')
        output_dir (str): Directory to save the file in
        
    Returns:
        str: Path to the saved file
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    patient_name = form_data.get("child_name", form_data.get("recipient_name", "unknown"))
    safe_name = "".join(c if c.isalnum() else "_" for c in patient_name)
    
    filename = f"{form_type}_{safe_name}_{timestamp}.json"
    file_path = os.path.join(output_dir, filename)
    
    # Save the data to a JSON file
    try:
        with open(file_path, 'w') as f:
            json.dump(form_data, f, indent=2)
        logger.info(f"Form data saved to {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"Error saving form data: {e}")
        return None

def load_form_data(file_path):
    """
    Load form data from a JSON file
    
    Args:
        file_path (str): Path to the JSON file
        
    Returns:
        dict: Form data
    """
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        logger.info(f"Form data loaded from {file_path}")
        return data
    except Exception as e:
        logger.error(f"Error loading form data: {e}")
        return None

def get_form_templates():
    """
    Returns information about available form templates
    
    Returns:
        list: List of form template information
    """
    return [
        {
            "id": "ibhs",
            "name": "WRITTEN ORDER FOR IBHS",
            "description": "Standard form for ordering Intensive Behavioral Health Services"
        },
        {
            "id": "community_care",
            "name": "COMMUNITY CARE IBHS Written Order Letter",
            "description": "Community Care specific IBHS order form"
        }
    ]

def validate_form_data(form_data, form_type):
    """
    Validate required fields in form data
    
    Args:
        form_data (dict): Form data to validate
        form_type (str): Type of form ('ibhs' or 'community_care')
        
    Returns:
        tuple: (is_valid: bool, errors: list)
    """
    errors = []
    
    if form_type == 'ibhs':
        # Required fields for IBHS form
        required_fields = ["child_name", "dob", "current_diagnoses"]
        field_names = {
            "child_name": "Child's Name",
            "dob": "Date of Birth",
            "current_diagnoses": "Current Diagnoses"
        }
    elif form_type == 'community_care':
        # Required fields for Community Care form
        required_fields = ["recipient_name", "dob", "diagnoses"]
        field_names = {
            "recipient_name": "Recipient Name",
            "dob": "Date of Birth",
            "diagnoses": "Current Diagnoses"
        }
    else:
        errors.append(f"Unknown form type: {form_type}")
        return False, errors
    
    # Check for required fields
    for field in required_fields:
        if field not in form_data or not form_data[field]:
            errors.append(f"Missing required field: {field_names.get(field, field)}")
    
    return len(errors) == 0, errors

def merge_patient_data(existing_data, new_data):
    """
    Merge new patient data with existing data, prioritizing non-empty values
    
    Args:
        existing_data (dict): Existing patient data
        new_data (dict): New patient data to merge
        
    Returns:
        dict: Merged patient data
    """
    merged = existing_data.copy()
    
    for key, value in new_data.items():
        # If the key doesn't exist in the existing data, or the existing value is empty
        # but the new value is not, use the new value
        if key not in merged or (not merged[key] and value):
            merged[key] = value
        
        # Special handling for nested dictionaries
        elif isinstance(value, dict) and isinstance(merged[key], dict):
            merged[key] = merge_patient_data(merged[key], value)
        
        # Special handling for lists - append new items
        elif isinstance(value, list) and isinstance(merged[key], list):
            # For diagnoses, symptoms, etc. - check for duplicates
            if key in ['diagnoses', 'symptoms', 'goals']:
                # Convert existing items to set of strings for comparison
                existing_items = set(str(item) for item in merged[key])
                
                # Add new items that don't exist in the set
                for item in value:
                    if str(item) not in existing_items:
                        merged[key].append(item)
            else:
                # For other lists, just append
                merged[key].extend(value)
    
    return merged