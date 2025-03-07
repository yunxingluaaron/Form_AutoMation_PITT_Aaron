# dual_llm_processor.py
import os
import json
import logging
import traceback
from mistralai import Mistral
from openai import OpenAI

# Configure logging
logger = logging.getLogger(__name__)

class DocumentProcessor:
    """
    Document processor using Mistral for OCR and OpenAI (ChatGPT) for data analysis.
    """
    
    def __init__(self, mistral_api_key=None, openai_api_key=None):
        """
        Initialize the document processor with Mistral and OpenAI clients.
        
        Args:
            mistral_api_key (str, optional): Mistral API key
            openai_api_key (str, optional): OpenAI API key
        """
        # Initialize Mistral client
        self.mistral_api_key = mistral_api_key or os.environ.get("MISTRAL_API_KEY")
        if not self.mistral_api_key:
            raise ValueError("Mistral API key is required")
        
        self.mistral_client = Mistral(api_key=self.mistral_api_key)
        
        # Initialize OpenAI client
        self.openai_api_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OpenAI API key is required")
        
        self.openai_client = OpenAI(api_key=self.openai_api_key)
        
        logger.info("DocumentProcessor initialized with both Mistral and OpenAI clients")
    
    def process_document_file(self, file_path):
        """
        Process a document file through Mistral OCR and then analyze with ChatGPT.
        
        Args:
            file_path (str): Path to the document file
            
        Returns:
            tuple: (extracted_text, structured_data, form_mappings)
        """
        logger.info(f"Processing document file at: {file_path}")
        
        # Step 1: Upload file to Mistral for OCR
        try:
            with open(file_path, "rb") as f:
                file_content = f.read()
                logger.debug(f"Read {len(file_content)} bytes from file")
            
            # Get filename from path
            filename = os.path.basename(file_path)
            
            uploaded_file = self.mistral_client.files.upload(
                file={
                    "file_name": filename,
                    "content": open(file_path, "rb"),
                },
                purpose="ocr"
            )
            logger.info(f"File uploaded to Mistral with ID: {uploaded_file.id}")
            
            # Get signed URL for the uploaded file
            signed_url = self.mistral_client.files.get_signed_url(file_id=uploaded_file.id)
            logger.info("Signed URL obtained successfully")
            
            # Process OCR
            ocr_response = self.mistral_client.ocr.process(
                model="mistral-ocr-latest",
                document={
                    "type": "document_url",
                    "document_url": signed_url.url,
                }
            )
            logger.info("OCR processing completed with Mistral")
            
            # Extract text from OCR response
            extracted_text = self._extract_text_from_ocr_response(ocr_response)
            
            # Step 2: Analyze extracted text with ChatGPT
            structured_data = self._analyze_with_chatgpt(extracted_text)
            
            # Step 3: Map to form templates
            form_mappings = self._map_to_forms(structured_data)
            
            return extracted_text, structured_data, form_mappings
            
        except Exception as e:
            logger.error(f"Error in document processing: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def _extract_text_from_ocr_response(self, ocr_response):
        """
        Extract text content from Mistral OCR response.
        
        Args:
            ocr_response: Mistral OCR response object
            
        Returns:
            str: Extracted text
        """
        try:
            # Try different methods to extract text from response
            if hasattr(ocr_response, 'model_dump'):
                response_dict = ocr_response.model_dump()
                
                # Try to find text content in response dictionary
                if 'content' in response_dict:
                    return response_dict['content']
                    
                elif 'data' in response_dict:
                    return response_dict['data']
                    
                elif 'pages' in response_dict:
                    # Some OCR APIs return text by pages
                    pages_text = []
                    for page in response_dict['pages']:
                        if isinstance(page, dict) and 'text' in page:
                            pages_text.append(page['text'])
                    return '\n'.join(pages_text)
            
            # Try direct attribute access
            if hasattr(ocr_response, 'content'):
                return ocr_response.content
                
            elif hasattr(ocr_response, 'text'):
                return ocr_response.text
                
            elif hasattr(ocr_response, 'data'):
                return ocr_response.data
            
            # Last resort: convert whole response to string
            return str(ocr_response)
            
        except Exception as e:
            logger.error(f"Error extracting text from OCR response: {str(e)}")
            logger.error(traceback.format_exc())
            return str(ocr_response)
    
    def _analyze_with_chatgpt(self, text):
        """
        Use ChatGPT (OpenAI) to analyze and structure the extracted text.
        
        Args:
            text (str): Text extracted from document
            
        Returns:
            dict: Structured patient data
        """
        logger.info(f"Analyzing extracted text with ChatGPT ({len(text)} chars)")
        
        # Create a system prompt
        system_prompt = """You are a specialized medical document analyzer. Extract structured information from medical documents
with precision and accuracy. Focus on patient details, diagnoses, symptoms, and treatment information.
Always return data in properly formatted JSON."""

        # Create extraction prompt for the user
        user_prompt = self._create_extraction_prompt(text)
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",  # Using GPT-4o for best accuracy
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,  # Low temperature for consistent results
                response_format={"type": "json_object"}  # Ensure JSON response
            )
            
            # Extract and parse the JSON response
            content = response.choices[0].message.content
            structured_data = json.loads(content)
            
            logger.info(f"Successfully extracted structured data with {len(structured_data)} fields using ChatGPT")
            return structured_data
            
        except Exception as e:
            logger.error(f"Error in ChatGPT analysis: {str(e)}")
            logger.error(traceback.format_exc())
            # Return a basic structure if analysis fails
            return {
                "name": None,
                "dob": None,
                "age": None,
                "diagnoses": [],
                "symptoms": [],
                "goals": []
            }
    
    def _create_extraction_prompt(self, text):
        """
        Create a detailed extraction prompt for ChatGPT.
        
        Args:
            text (str): OCR text
            
        Returns:
            str: Formatted prompt
        """
        prompt = """
Extract ALL available information from this medical document into a structured JSON format.
Focus on extracting the following fields (include null for missing fields):

1. Patient Information:
   - name: Full name of the patient
   - dob: Date of birth in format MM/DD/YYYY
   - age: Numeric age
   - gender: Patient's gender
   - address: Full address if available
   - phone: Phone number if available
   - insurance_id: Insurance ID number if available

2. Guardian Information (if patient is a minor):
   - guardian_name: Full name of parent/guardian
   - guardian_relationship: Relationship to patient
   - guardian_phone: Contact number
   - guardian_address: Address if different from patient

3. Clinical Information:
   - diagnoses: Array of diagnoses, each with "name" and "code" (if ICD codes present)
   - symptoms: Array of reported symptoms or behavioral issues
   - onset_date: When symptoms began (if available)
   - severity: Severity indicators
   - frequency: How often symptoms occur

4. Treatment Information:
   - goals: Array of treatment goals
   - treatment_history: Previous interventions or treatments
   - medications: Array of current medications
   - recommended_services: Recommended therapeutic services
   - service_frequency: How often services should occur

5. Provider Information:
   - provider_name: Name of referring provider
   - provider_credentials: Credentials (MD, PhD, etc.)
   - provider_npi: Provider NPI number if available
   - facility: Facility or practice name

Respond ONLY with valid JSON.

Document text:
"""
        # Limit text to avoid token limits while keeping as much as possible
        max_chars = 15000
        if len(text) > max_chars:
            truncated_text = text[:max_chars]
            logger.info(f"Truncating OCR text from {len(text)} to {len(truncated_text)} chars")
            return prompt + truncated_text
        else:
            return prompt + text
    
    def _map_to_forms(self, extracted_data):
        """
        Map the extracted data to form templates using ChatGPT.
        
        Args:
            extracted_data (dict): Extracted structured data
            
        Returns:
            dict: Data mapped to form templates
        """
        logger.info("Mapping extracted data to form templates with ChatGPT")
        
        # Create system prompt
        system_prompt = """You are a specialized form-filling assistant that maps extracted patient data
to medical form templates with precision and accuracy."""

        # Create mapping prompt
        mapping_prompt = f"""
Map this patient data to the following two form formats:

1. IBHS Form fields:
- recipient_name: Patient's full name
- recipient_dob: Date of birth
- recipient_id: Insurance ID or null
- guardian_name: Parent/guardian name
- diagnosis_primary: Primary diagnosis name
- diagnosis_code_primary: Primary diagnosis ICD-10 code
- presenting_problems: Summary of symptoms/issues
- treatment_goals: List of goals
- requested_services: Recommended services
- service_frequency: How often services should occur

2. Community Care Form fields:
- member_name: Patient's full name
- member_dob: Date of birth  
- member_id: Insurance ID or null
- caregiver_name: Parent/guardian name
- diagnosis: Array of diagnoses with name and code
- clinical_summary: Summary of symptoms and issues
- treatment_plan: Summary of goals and recommended services
- service_needs: Specific services needed

Respond with a JSON object with two keys: "ibhs" and "communityCare", each containing the mapped data for their respective forms.

Patient data:
{json.dumps(extracted_data, indent=2)}
"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": mapping_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            # Extract and parse the JSON response
            content = response.choices[0].message.content
            mapped_data = json.loads(content)
            
            logger.info("Successfully mapped data to form templates")
            return mapped_data
            
        except Exception as e:
            logger.error(f"Error mapping data to forms: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Perform basic mapping as fallback
            return self._basic_form_mapping(extracted_data)
    
    def _basic_form_mapping(self, data):
        """
        Basic mapping function as fallback.
        
        Args:
            data (dict): Extracted data
            
        Returns:
            dict: Mapped form data
        """
        logger.info("Using basic form mapping as fallback")
        
        # Create basic mappings manually
        ibhs_form = {
            "recipient_name": data.get("name"),
            "recipient_dob": data.get("dob"),
            "recipient_id": data.get("insurance_id"),
            "guardian_name": data.get("guardian_name"),
            "diagnosis_primary": data.get("diagnoses")[0].get("name") if data.get("diagnoses") and len(data.get("diagnoses")) > 0 else None,
            "diagnosis_code_primary": data.get("diagnoses")[0].get("code") if data.get("diagnoses") and len(data.get("diagnoses")) > 0 else None,
            "presenting_problems": ", ".join(data.get("symptoms", [])) if isinstance(data.get("symptoms"), list) else data.get("symptoms"),
            "treatment_goals": ", ".join(data.get("goals", [])) if isinstance(data.get("goals"), list) else data.get("goals"),
            "requested_services": None,
            "service_frequency": None
        }
        
        community_care_form = {
            "member_name": data.get("name"),
            "member_dob": data.get("dob"),
            "member_id": data.get("insurance_id"),
            "caregiver_name": data.get("guardian_name"),
            "diagnosis": data.get("diagnoses", []),
            "clinical_summary": ", ".join(data.get("symptoms", [])) if isinstance(data.get("symptoms"), list) else data.get("symptoms"),
            "treatment_plan": ", ".join(data.get("goals", [])) if isinstance(data.get("goals"), list) else data.get("goals"),
            "service_needs": None
        }
        
        return {
            "ibhs": ibhs_form,
            "communityCare": community_care_form
        }


# Helper function for easy use in endpoints
def process_document(file_path, mistral_api_key=None, openai_api_key=None):
    """
    Process a document file and return extracted and structured data.
    
    Args:
        file_path (str): Path to the document file
        mistral_api_key (str, optional): Mistral API key
        openai_api_key (str, optional): OpenAI API key
        
    Returns:
        tuple: (extracted_text, structured_data, form_mappings)
    """
    try:
        processor = DocumentProcessor(
            mistral_api_key=mistral_api_key,
            openai_api_key=openai_api_key
        )
        
        return processor.process_document_file(file_path)
        
    except Exception as e:
        logger.error(f"Error in document processing: {str(e)}")
        logger.error(traceback.format_exc())
        return None, None, None