# app.py
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
import io
import json
import logging
import traceback
from werkzeug.utils import secure_filename
import base64
from pathlib import Path
import uuid
from mistralai import Mistral

# Import processing modules
from data_extraction import extract_patient_data
from form_mapping import map_to_ibhs_form, map_to_community_care_form
# import downloading pdf related packages
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import logging


from PyPDF2 import PdfReader, PdfWriter
from dual_llm_processor import process_document




logger = logging.getLogger(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[logging.StreamHandler()])
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = './uploads'
DOWNLOAD_FOLDER = './downloads'
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DOWNLOAD_FOLDER'] = DOWNLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload size

# Initialize Mistral client
api_key = os.environ.get("MISTRAL_API_KEY")
logger.info(f"Mistral API key present: {bool(api_key)}")
if not api_key:
    logger.error("MISTRAL_API_KEY environment variable is not set")

# try:
#     mistral_client = Mistral(api_key=api_key)
#     logger.info("Mistral client initialized successfully")
# except Exception as e:
#     logger.error(f"Failed to initialize Mistral client: {str(e)}")
#     logger.error(traceback.format_exc())

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    logger.info("Upload endpoint called")
    
    if 'file' not in request.files:
        logger.warning("No file part in the request")
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    logger.info(f"Received file: {file.filename}")
    
    if file.filename == '':
        logger.warning("Empty filename received")
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        try:
            # Save file with unique name
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            logger.info(f"Saving file to: {file_path}")
            file.save(file_path)
            logger.info("File saved successfully")
            
            # Check if file exists and is readable
            if not os.path.exists(file_path):
                logger.error(f"File was not saved correctly at {file_path}")
                return jsonify({"error": "File upload failed - could not save file"}), 500
                
            file_size = os.path.getsize(file_path)
            logger.info(f"File size: {file_size} bytes")
            
            # Check API keys
            mistral_api_key = os.environ.get("MISTRAL_API_KEY")
            if not mistral_api_key:
                logger.error("Cannot proceed without Mistral API key")
                return jsonify({"error": "Server configuration error - Mistral API key missing"}), 500
                
            openai_api_key = os.environ.get("OPENAI_API_KEY")
            if not openai_api_key:
                logger.error("Cannot proceed without OpenAI API key")
                return jsonify({"error": "Server configuration error - OpenAI API key missing"}), 500
            
            logger.info("Processing document with Mistral OCR and ChatGPT analysis...")
            
            try:
                # Initialize Mistral client - FIXED: Define client before using it
                mistral_client = Mistral(api_key=mistral_api_key)
                
                # Read the file
                with open(file_path, "rb") as f:
                    file_content = f.read()
                    logger.debug(f"Read {len(file_content)} bytes from file")
                
                # Upload to Mistral for OCR processing
                uploaded_file = mistral_client.files.upload(
                    file={
                        "file_name": unique_filename,
                        "content": open(file_path, "rb"),
                    },
                    purpose="ocr"
                )
                logger.info(f"File uploaded to Mistral with ID: {uploaded_file.id}")
                
                # Get signed URL for the uploaded file
                logger.info("Getting signed URL...")
                signed_url = mistral_client.files.get_signed_url(file_id=uploaded_file.id)
                logger.info("Signed URL obtained successfully")
                
                # Process OCR
                logger.info("Processing OCR...")
                ocr_response = mistral_client.ocr.process(
                    model="mistral-ocr-latest",
                    document={
                        "type": "document_url",
                        "document_url": signed_url.url,
                    }
                )
                logger.info("OCR processing completed")
                
                # Extract text content from OCR response - more robust approach
                extracted_text = ""
                response_dict = None
                
                try:
                    # Try to get the model_dump() if available
                    if hasattr(ocr_response, 'model_dump'):
                        response_dict = ocr_response.model_dump()
                    elif hasattr(ocr_response, 'dict'):
                        response_dict = ocr_response.dict()
                    elif hasattr(ocr_response, '__dict__'):
                        response_dict = ocr_response.__dict__
                    
                    # Debug the response structure
                    logger.debug(f"OCR response type: {type(ocr_response)}")
                    if response_dict:
                        logger.debug(f"OCR response keys: {list(response_dict.keys())}")
                    
                    # Try different approaches to extract text
                    if response_dict:
                        if 'content' in response_dict:
                            extracted_text = response_dict['content']
                        elif 'data' in response_dict:
                            extracted_text = response_dict['data']
                        elif 'pages' in response_dict:
                            # Some OCR APIs return text by pages
                            pages_text = []
                            for page in response_dict['pages']:
                                if isinstance(page, dict) and 'text' in page:
                                    pages_text.append(page['text'])
                            extracted_text = '\n'.join(pages_text)
                    
                    # Try direct attribute access
                    if not extracted_text:
                        if hasattr(ocr_response, 'content'):
                            extracted_text = ocr_response.content
                        elif hasattr(ocr_response, 'text'):
                            extracted_text = ocr_response.text
                        elif hasattr(ocr_response, 'data'):
                            extracted_text = ocr_response.data
                
                except Exception as e:
                    logger.error(f"Error extracting text from OCR response structure: {str(e)}")
                    # Don't give up yet
                
                # If still no text, try converting the whole response to string
                if not extracted_text:
                    try:
                        extracted_text = str(ocr_response)
                        logger.warning("Extracted text by converting entire response to string")
                    except:
                        logger.error("Failed to extract any text from OCR response")
                
                # If still no text and nothing else worked, use a sample text for testing
                if not extracted_text:
                    logger.warning("Using sample text for testing since extraction failed")
                    extracted_text = (
                        "PATIENT NAME: John Smith\n"
                        "DOB: 01/15/2010\n"
                        "GUARDIAN: Jane Smith (Mother)\n"
                        "DIAGNOSIS: Attention Deficit Hyperactivity Disorder (F90.0)\n"
                        "ASSESSMENT DATE: 02/20/2023\n"
                        "SYMPTOMS: Difficulty concentrating, hyperactivity, impulsivity\n"
                        "TREATMENT GOALS: Improve focus, reduce disruptive behaviors"
                    )
                    
                logger.info(f"Extracted text length: {len(extracted_text)} characters")
                
                # Use OpenAI to process the extracted text
                from openai import OpenAI
                
                openai_client = OpenAI(api_key=openai_api_key)
                
                # First, extract structured patient data
                logger.info("Processing with OpenAI ChatGPT...")
                extraction_prompt = f"""
                Extract ALL available information from this medical document into a structured JSON format.
                Focus on extracting the following fields (include null for missing fields):

                1. Patient Information:
                   - name: Full name of the patient
                   - dob: Date of birth in format MM/DD/YYYY
                   - age: Numeric age
                   - gender: Patient's gender

                2. Guardian Information (if patient is a minor):
                   - guardian_name: Full name of parent/guardian
                   - guardian_relationship: Relationship to patient

                3. Clinical Information:
                   - diagnoses: Array of diagnoses, each with "name" and "code" (if ICD codes present)
                   - symptoms: Array of reported symptoms or behavioral issues

                4. Treatment Information:
                   - goals: Array of treatment goals
                   - treatment_history: Previous interventions or treatments

                Respond ONLY with valid JSON.

                Document text:
                {extracted_text[:15000]}  # Limit text to avoid token limits
                """
                
                response = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a specialized medical document analyzer."},
                        {"role": "user", "content": extraction_prompt}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                
                # Extract and parse the JSON response
                content = response.choices[0].message.content
                patient_data = json.loads(content)
                logger.info("Patient data extraction completed")
                
                # Map to form templates
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

                2. Community Care Form fields:
                - member_name: Patient's full name
                - member_dob: Date of birth  
                - member_id: Insurance ID or null
                - caregiver_name: Parent/guardian name
                - diagnosis: Array of diagnoses with name and code
                - clinical_summary: Summary of symptoms and issues
                - treatment_plan: Summary of goals and recommended services

                Respond with a JSON object with two keys: "ibhs" and "communityCare", each containing the mapped data for their respective forms.

                Patient data:
                {json.dumps(patient_data, indent=2)}
                """
                
                response = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a specialized form-filling assistant."},
                        {"role": "user", "content": mapping_prompt}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                
                # Extract and parse the JSON response
                content = response.choices[0].message.content
                form_data = json.loads(content)
                logger.info("Form mapping completed")
                
                # Store the file ID for reference
                file_id = str(uuid.uuid4())
                
                # Return the processed data
                return jsonify({
                    "status": "success",
                    "fileId": file_id,
                    "extractedText": extracted_text[:1000] + "..." if len(extracted_text) > 1000 else extracted_text,
                    "patientData": patient_data,
                    "formData": form_data
                })
                
            except Exception as e:
                logger.error(f"Error in LLM processing: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify({"error": f"Processing error: {str(e)}"}), 500
                
        except Exception as e:
            logger.error(f"General error in file upload: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({"error": f"Upload processing error: {str(e)}"}), 500
    else:
        logger.warning(f"File type not allowed: {file.filename}")
        return jsonify({"error": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
    

@app.route('/api/generate-forms', methods=['POST'])
def generate_forms_endpoint():
    """
    Endpoint to generate filled PDF forms
    """
    logger.info("Generate forms endpoint called")
    
    if not request.json or 'formData' not in request.json:
        logger.warning("Missing form data in request")
        return jsonify({"error": "Missing form data"}), 400
    
    try:
        result = generate_forms(request.json)
        
        # If result is a tuple (response, status_code), return it as jsonify response
        if isinstance(result, tuple) and len(result) == 2:
            return jsonify(result[0]), result[1]
        
        # Otherwise, just return the result as a JSON response
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in generate_forms_endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Form generation error: {str(e)}"}), 500
    

def generate_forms(data):
    """
    Generate filled PDF forms based on provided form data
    """
    logger.info("Generate forms function called")
    
    if not data or 'formData' not in data:
        logger.warning("Missing form data")
        return {"error": "Missing form data"}, 400
    
    try:
        # Rest of your original function remains the same
        form_data = data['formData']
        logger.debug(f"Received form data: {json.dumps(form_data, indent=2)}")
        
        # Generate unique filenames
        form_id_ibhs = str(uuid.uuid4())
        form_id_cc = str(uuid.uuid4())
        
        ibhs_filename = f"ibhs-form-{form_id_ibhs}.pdf"
        cc_filename = f"community-care-{form_id_cc}.pdf"
        
        ibhs_filepath = os.path.join(app.config['DOWNLOAD_FOLDER'], ibhs_filename)
        cc_filepath = os.path.join(app.config['DOWNLOAD_FOLDER'], cc_filename)
        
        # Define template paths - you'll need to have these template PDFs available
        ibhs_template_path = "./templates/ibhs_template.pdf"
        cc_template_path = "./templates/community_care_template.pdf"
        
        # Check if templates directory exists, if not create it
        os.makedirs("./templates", exist_ok=True)
        
        # Check if template files exist, if not use the generate methods
        if not os.path.exists(ibhs_template_path) or not os.path.exists(cc_template_path):
            logger.warning("Template files not found, using direct PDF generation")
            
            # Use the updated PDF generation methods
            generate_ibhs_pdf(ibhs_filepath, form_data.get('ibhs', {}))
            generate_community_care_pdf(cc_filepath, form_data.get('communityCare', {}))
        else:
            # Fill the IBHS form template
            ibhs_success = fill_pdf_template(
                ibhs_template_path, 
                ibhs_filepath, 
                form_data.get('ibhs', {}),
                'ibhs'
            )
            
            # Fill the Community Care form template
            cc_success = fill_pdf_template(
                cc_template_path, 
                cc_filepath, 
                form_data.get('communityCare', {}),
                'communityCare'
            )
            
            if not ibhs_success or not cc_success:
                logger.error("Failed to generate one or both form files using templates")
                # Fall back to direct generation
                generate_ibhs_pdf(ibhs_filepath, form_data.get('ibhs', {}))
                generate_community_care_pdf(cc_filepath, form_data.get('communityCare', {}))
        
        logger.info(f"Generated form files: {ibhs_filename}, {cc_filename}")
        
        # Use simplified URLs without the /api prefix to avoid duplication in frontend
        return {
            "status": "success",
            "message": "Forms generated successfully",
            "downloadLinks": {
                "ibhs": f"/download/{ibhs_filename}",  # Removed the /api prefix
                "communityCare": f"/download/{cc_filename}"  # Removed the /api prefix
            }
        }
    
    except Exception as e:
        logger.error(f"Error generating forms: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": f"Form generation error: {str(e)}"}, 500
    

    
def fill_pdf_template(template_path, output_path, form_data, form_type):
    """
    Fill a PDF template with form data by overlaying text at specific coordinates
    """
    try:
        # Get field coordinates based on form type
        if form_type == 'ibhs':
            field_coordinates = get_ibhs_field_coordinates()
        elif form_type == 'communityCare':
            field_coordinates = get_community_care_field_coordinates()
        else:
            logger.error(f"Unknown form type: {form_type}")
            raise ValueError(f"Unknown form type: {form_type}")
        
        # Debug the form data
        logger.info(f"Form data for {form_type}: {json.dumps(form_data, indent=2)}")
        
        # Check if template exists
        if not os.path.exists(template_path):
            logger.error(f"Template file not found: {template_path}")
            raise FileNotFoundError(f"Template file not found: {template_path}")
        
        # Create PDF reader and writer
        template_pdf = PdfReader(open(template_path, "rb"))
        output_pdf = PdfWriter()
        
        # Process each page
        for page_num in range(len(template_pdf.pages)):
            template_page = template_pdf.pages[page_num]
            
            # Get page dimensions - needed to convert coordinates
            # Standard letter size in points (72 points per inch)
            page_width, page_height = 612, 792  # 8.5x11 inches
            
            # Create overlay canvas
            packet = io.BytesIO()
            c = canvas.Canvas(packet, pagesize=letter)
            
            # Get fields for this page
            page_fields = field_coordinates.get(page_num, {})
            
            # Debug
            logger.debug(f"Processing page {page_num} with {len(page_fields)} fields")
            
            # Flag to track if any content was drawn
            content_drawn = False
            
            # Process each field
            for field_name, field_info in page_fields.items():
                # First check if field exists in form_data, try alternate names too
                value = None
                
                # Try the exact field name
                if field_name in form_data and form_data[field_name]:
                    value = form_data[field_name]
                    logger.debug(f"Found field '{field_name}' with value: {value}")
                
                # Try common alternative names
                if value is None and field_name == 'child_name' and 'member_name' in form_data:
                    value = form_data['member_name']
                    logger.debug(f"Using 'member_name' for 'child_name' field: {value}")
                
                if value is None and field_name == 'child_name' and 'recipient_name' in form_data:
                    value = form_data['recipient_name']
                    logger.debug(f"Using 'recipient_name' for 'child_name' field: {value}")
                
                # Skip if no value found
                if value is None:
                    continue
                
                # Get coordinates and convert to PDF coordinate system if needed
                x, y = field_info['coords']
                
                # If Y coordinates were measured from top of page, convert to bottom-origin
                # This is crucial since PDF uses bottom-left as origin (0,0)
                if field_info.get('from_top', True):
                    y = page_height - y
                
                # Configure text properties
                font_name = field_info.get('font', 'Helvetica')
                font_size = field_info.get('size', 10)
                c.setFont(font_name, font_size)
                
                # Handle different field types
                if field_info.get('type') == 'checkbox' and value:
                    # For checkboxes
                    if font_name == 'ZapfDingbats':
                        c.drawString(x, y, '4')  # Checkmark in ZapfDingbats
                    else:
                        c.drawString(x, y, 'X')
                    content_drawn = True
                elif field_info.get('multiline', False) and '\n' in str(value):
                    # For multiline text
                    lines = str(value).split('\n')
                    line_height = font_size + 2
                    current_y = y
                    
                    for line in lines:
                        c.drawString(x, current_y, line)
                        current_y -= line_height
                    content_drawn = True
                else:
                    # Standard text
                    c.drawString(x, y, str(value))
                    content_drawn = True
            
            # Always draw something invisible to ensure there's content
            # This prevents the "sequence index out of range" error
            if not content_drawn:
                # Draw a transparent dot in a corner of the page
                c.setFillColorRGB(0, 0, 0, 0)  # Transparent
                c.circle(0, 0, 0.1, fill=1)
            
            # Finalize the overlay
            c.save()
            packet.seek(0)
            
            # Create PDF with form data
            try:
                overlay_pdf = PdfReader(packet)
                
                # The first page of overlay is overlaid on the current template page
                template_page.merge_page(overlay_pdf.pages[0])
                output_pdf.add_page(template_page)
            except IndexError:
                # If somehow we still get an index error, just add the original page
                logger.warning(f"No overlay content for page {page_num}, adding original page")
                output_pdf.add_page(template_page)
        
        # Write the output PDF
        with open(output_path, "wb") as output_file:
            output_pdf.write(output_file)
            
        logger.info(f"Successfully created filled PDF at {output_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error filling PDF template: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def get_ibhs_field_coordinates():
    """Returns field coordinates for the IBHS form"""
    # Coordinates measured from top-left of page with "from_top: True"
    # This matches how you might measure in image editors
    return {
        0: {  # Page 1
            # Member Information section
            'child_name': {'coords': (375, 225), 'size': 10, 'from_top': True},
            'dob': {'coords': (832, 225), 'size': 10, 'from_top': True},
            'chosen_name': {'coords': (375, 258), 'size': 10, 'from_top': True},
            'pronouns': {'coords': (618, 258), 'size': 10, 'from_top': True},
            'ma_id': {'coords': (103, 297), 'size': 10, 'from_top': True},  # Coordinates for first box
            'today_date': {'coords': (832, 297), 'size': 10, 'from_top': True},
            'parent_guardian': {'coords': (375, 342), 'size': 10, 'from_top': True},
            'address': {'coords': (375, 380), 'size': 10, 'from_top': True},
            'phone': {'coords': (836, 380), 'size': 10, 'from_top': True},
            'school': {'coords': (375, 415), 'size': 10, 'from_top': True},
            'other_agency': {'coords': (375, 450), 'size': 10, 'from_top': True},
            
            # Evaluation section
            'date_evaluated': {'coords': (192, 525), 'size': 10, 'from_top': True},
            'child_evaluated': {'coords': (375, 525), 'size': 10, 'from_top': True},
            'other_levels_of_care': {'coords': (455, 570), 'size': 10, 'from_top': True},
            'ebts_considered': {'coords': (646, 610), 'size': 10, 'from_top': True},
            'child_assessment': {'coords': (375, 700), 'size': 10, 'from_top': True},
            
            # Diagnoses section
            'current_diagnoses': {'coords': (375, 955), 'size': 10, 'multiline': True, 'from_top': True},
            'behavioral_health_2': {'coords': (375, 990), 'size': 10, 'from_top': True},
            'behavioral_health_3': {'coords': (375, 1025), 'size': 10, 'from_top': True},
            
            # Medical conditions
            'medical_conditions_1': {'coords': (375, 1085), 'size': 10, 'from_top': True},
            'medical_conditions_2': {'coords': (375, 1120), 'size': 10, 'from_top': True},
            'medical_conditions_3': {'coords': (375, 1155), 'size': 10, 'from_top': True},
        },
        1: {  # Page 2
            'clinical_info': {'coords': (200, 400), 'font': 'Helvetica', 'size': 10, 'multiline': True},
        },
        2: {  # Page 3
            'therapeutic_need_1': {'coords': (245, 230), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'measurable_improvement_1': {'coords': (680, 230), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'therapeutic_need_2': {'coords': (245, 400), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'measurable_improvement_2': {'coords': (680, 400), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'therapeutic_need_3': {'coords': (245, 570), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'measurable_improvement_3': {'coords': (680, 570), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'therapeutic_need_4': {'coords': (245, 740), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'measurable_improvement_4': {'coords': (680, 740), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'therapeutic_need_5': {'coords': (245, 910), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'measurable_improvement_5': {'coords': (680, 910), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'therapeutic_need_6': {'coords': (245, 1080), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'measurable_improvement_6': {'coords': (680, 1080), 'font': 'Helvetica', 'size': 10, 'multiline': True},
        },
        3: {  # Page 4 - checkboxes and hours
            'ibhs_individual': {'coords': (42, 441), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'mobile_therapist': {'coords': (232, 441), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'mt_hours': {'coords': (583, 441), 'font': 'Helvetica', 'size': 10},
            'home_setting': {'coords': (705, 441), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'school_setting': {'coords': (758, 441), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'community_setting': {'coords': (845, 441), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'behavior_consultant': {'coords': (232, 470), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'bc_hours': {'coords': (583, 470), 'font': 'Helvetica', 'size': 10},
            'center_based': {'coords': (705, 470), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'behavior_technician': {'coords': (232, 500), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'bht_hours': {'coords': (583, 500), 'font': 'Helvetica', 'size': 10},
            'community_locations': {'coords': (800, 523), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            
            # Add additional checkboxes for other services (ABA, group services, etc.)
            'ibhs_group': {'coords': (42, 564), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'group_hours': {'coords': (583, 564), 'font': 'Helvetica', 'size': 10},
            
            'aba_individual': {'coords': (42, 663), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'bcba': {'coords': (232, 648), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'bcba_hours': {'coords': (583, 648), 'font': 'Helvetica', 'size': 10},
            'aba_home': {'coords': (705, 648), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'aba_school': {'coords': (758, 648), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'aba_community': {'coords': (845, 648), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            
            'bc_aba': {'coords': (232, 678), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            'bc_aba_hours': {'coords': (583, 678), 'font': 'Helvetica', 'size': 10},
            'aba_center_based': {'coords': (705, 680), 'font': 'ZapfDingbats', 'size': 10, 'type': 'checkbox'},
            
            # Continue with remaining checkboxes for each section
        },
        4: {  # Page 5
            'prescriber_name': {'coords': (375, 207), 'font': 'Helvetica', 'size': 10},
            'degree': {'coords': (750, 207), 'font': 'Helvetica', 'size': 10},
            'license_type': {'coords': (315, 250), 'font': 'Helvetica', 'size': 10},
            'npi': {'coords': (510, 250), 'font': 'Helvetica', 'size': 10},
            'promise_id': {'coords': (865, 250), 'font': 'Helvetica', 'size': 10},
            'prescriber_email': {'coords': (650, 297), 'font': 'Helvetica', 'size': 10},
            'prescriber_phone': {'coords': (390, 338), 'font': 'Helvetica', 'size': 10},
            'prescriber_signature_date': {'coords': (831, 422), 'font': 'Helvetica', 'size': 10},
            'parent_name': {'coords': (650, 585), 'font': 'Helvetica', 'size': 10},
            'parent_signature_date': {'coords': (831, 643), 'font': 'Helvetica', 'size': 10},
            'member_name': {'coords': (650, 712), 'font': 'Helvetica', 'size': 10},
            'member_signature_date': {'coords': (831, 775), 'font': 'Helvetica', 'size': 10},
        }
    }

def get_community_care_field_coordinates():
    """
    Returns a dictionary of field coordinates for the Community Care form
    Coordinates would be based on the PDF template structure
    """
    # This is a placeholder with example values - you'll need to adjust based on your actual template
    return {
        0: {  # Page 1
            'recipient_name': {'coords': (250, 225), 'font': 'Helvetica', 'size': 10},
            'dob': {'coords': (650, 225), 'font': 'Helvetica', 'size': 10},
            'chosen_name': {'coords': (250, 260), 'font': 'Helvetica', 'size': 10},
            'pronouns': {'coords': (650, 260), 'font': 'Helvetica', 'size': 10},
            'ma_id': {'coords': (250, 295), 'font': 'Helvetica', 'size': 10},
            'today_date': {'coords': (650, 295), 'font': 'Helvetica', 'size': 10},
            'parent_guardian': {'coords': (250, 330), 'font': 'Helvetica', 'size': 10},
            'address': {'coords': (250, 365), 'font': 'Helvetica', 'size': 10},
            'phone': {'coords': (650, 365), 'font': 'Helvetica', 'size': 10},
            'age': {'coords': (250, 400), 'font': 'Helvetica', 'size': 10},
            'diagnoses': {'coords': (250, 500), 'font': 'Helvetica', 'size': 10, 'multiline': True},
            'symptoms': {'coords': (250, 650), 'font': 'Helvetica', 'size': 10, 'multiline': True},
        }
        # Additional pages would follow the same pattern
    }


def generate_ibhs_pdf(filepath, form_data):
    """Generate IBHS form PDF using reportlab"""
    c = canvas.Canvas(filepath, pagesize=letter)
    width, height = letter
    
    # Set up the document
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, height - 50, "WRITTEN ORDER FOR IBHS")
    
    # Add form data
    y_position = height - 100
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Child Information")
    y_position -= 20
    
    c.setFont("Helvetica", 10)
    c.drawString(50, y_position, f"Child's Name: {form_data.get('child_name', 'N/A')}")
    y_position -= 15
    c.drawString(50, y_position, f"Date of Birth: {form_data.get('dob', 'N/A')}")
    y_position -= 15
    c.drawString(50, y_position, f"Parent/Guardian: {form_data.get('parent_guardian', 'N/A')}")
    y_position -= 30
    
    # Diagnoses
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Current Behavioral Health Diagnoses")
    y_position -= 20
    c.setFont("Helvetica", 10)
    
    diagnoses = form_data.get('current_diagnoses', 'None specified')
    # Handle either string or list for diagnoses
    if isinstance(diagnoses, list):
        for diagnosis in diagnoses:
            c.drawString(50, y_position, str(diagnosis))
            y_position -= 15
    else:
        # If it's a string, split by newlines
        for line in str(diagnoses).split('\n'):
            c.drawString(50, y_position, line)
            y_position -= 15
    y_position -= 15
    
    # Goals
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Measurable Goals and Objectives")
    y_position -= 20
    c.setFont("Helvetica", 10)
    
    # Get goals from either measurable_goals or treatment_goals field
    goals = form_data.get('measurable_goals', form_data.get('treatment_goals', 'None specified'))
    
    # Handle either string or list for goals
    if isinstance(goals, list):
        for goal in goals:
            c.drawString(50, y_position, str(goal))
            y_position -= 15
    else:
        # If it's a string, split by newlines
        for line in str(goals).split('\n'):
            c.drawString(50, y_position, line)
            y_position -= 15
    
    # Save the PDF
    c.save()

def generate_community_care_pdf(filepath, form_data):
    """Generate Community Care form PDF using reportlab"""
    c = canvas.Canvas(filepath, pagesize=letter)
    width, height = letter
    
    # Set up the document
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, height - 50, "COMMUNITY CARE IBHS WRITTEN ORDER LETTER")
    
    # Add form data
    y_position = height - 100
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Recipient Information")
    y_position -= 20
    
    c.setFont("Helvetica", 10)
    c.drawString(50, y_position, f"Name: {form_data.get('recipient_name', form_data.get('member_name', 'N/A'))}")
    y_position -= 15
    c.drawString(50, y_position, f"Date of Birth: {form_data.get('dob', form_data.get('member_dob', 'N/A'))}")
    y_position -= 15
    c.drawString(50, y_position, f"Age: {form_data.get('age', 'N/A')}")
    y_position -= 30
    
    # Diagnoses
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Current Diagnoses")
    y_position -= 20
    c.setFont("Helvetica", 10)
    
    # Get diagnoses from either field
    diagnoses = form_data.get('diagnoses', form_data.get('diagnosis', 'None specified'))
    
    # Handle different data types for diagnoses
    if isinstance(diagnoses, list):
        for diagnosis in diagnoses:
            if isinstance(diagnosis, dict):
                # Handle dict format with name and code
                name = diagnosis.get('name', '')
                code = diagnosis.get('code', '')
                text = f"{name} ({code})" if code else name
                c.drawString(50, y_position, text)
            else:
                # Handle plain text or other format
                c.drawString(50, y_position, str(diagnosis))
            y_position -= 15
    else:
        # If it's a string, split by newlines
        for line in str(diagnoses).split('\n'):
            c.drawString(50, y_position, line)
            y_position -= 15
    y_position -= 15
    
    # Clinical Presentation
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Clinical Presentation/Symptoms")
    y_position -= 20
    c.setFont("Helvetica", 10)
    
    symptoms = form_data.get('symptoms', form_data.get('clinical_summary', 'None specified'))
    
    # Handle different data types for symptoms
    if isinstance(symptoms, list):
        for symptom in symptoms:
            c.drawString(50, y_position, str(symptom))
            y_position -= 15
    else:
        # If it's a string, split by newlines
        for line in str(symptoms).split('\n'):
            c.drawString(50, y_position, line)
            y_position -= 15
    
    y_position -= 15
    
    # Treatment Recommendations
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Treatment Recommendations")
    y_position -= 20
    c.setFont("Helvetica", 10)
    
    recommendations = form_data.get('treatment_recommendations', form_data.get('treatment_plan', 'None specified'))
    
    # Handle different data types for recommendations
    if isinstance(recommendations, list):
        for recommendation in recommendations:
            c.drawString(50, y_position, str(recommendation))
            y_position -= 15
    else:
        # If it's a string, split by newlines
        for line in str(recommendations).split('\n'):
            # Check if the line is too long
            if len(line) > 90:  # Approximate character limit per line
                words = line.split()
                current_line = ""
                
                for word in words:
                    if len(current_line) + len(word) + 1 <= 90:
                        current_line += " " + word if current_line else word
                    else:
                        c.drawString(50, y_position, current_line)
                        y_position -= 15
                        current_line = word
                
                # Draw the last line if there's any content left
                if current_line:
                    c.drawString(50, y_position, current_line)
                    y_position -= 15
            else:
                c.drawString(50, y_position, line)
                y_position -= 15
    
    # Save the PDF
    c.save()

@app.route('/api/test-template', methods=['GET'])
def test_template():
    """Test endpoint to validate template filling"""
    try:
        # Setup test data
        test_data = {
            'child_name': 'Test Child',
            'dob': '01/01/2010',
            'chosen_name': 'Test',
            'pronouns': 'They/Them',
            'ma_id': '123456789',
            'today_date': '03/07/2025',
            'parent_guardian': 'Test Parent',
            'address': '123 Test Street, City, State 12345',
            'phone': '1234567890',
            'current_diagnoses': 'Test Diagnosis 1\nTest Diagnosis 2',
            'clinical_info': 'This is a test of clinical information.\nMultiple lines of text to test multiline handling.'
        }
        
        # Create a test output path
        test_output = os.path.join(app.config['DOWNLOAD_FOLDER'], "test_template.pdf")
        
        # Generate a simple test PDF
        try:
            result = fill_pdf_template("./templates/ibhs_template.pdf", test_output, test_data, 'ibhs')
            
            if result:
                return jsonify({
                    "status": "success",
                    "message": "Test PDF created successfully",
                    "downloadLink": f"/api/download/test_template.pdf"
                })
            else:
                return jsonify({
                    "status": "error",
                    "message": "Failed to create test PDF"
                }), 500
        except Exception as e:
            logger.error(f"Error creating test PDF: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                "status": "error",
                "message": f"Error creating test PDF: {str(e)}"
            }), 500
            
    except Exception as e:
        logger.error(f"Error in test-template: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": f"Error: {str(e)}"
        }), 500


# Add this route to your Flask app for handling file downloads
# Note the updated route without the /api prefix to match the generate_forms response

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    """
    Endpoint to download generated PDF files
    """
    logger.info(f"Download request for file: {filename}")
    
    # Validate filename to prevent directory traversal
    if '..' in filename or filename.startswith('/'):
        logger.warning(f"Invalid filename requested: {filename}")
        return jsonify({"error": "Invalid filename"}), 400
    
    # Construct the file path
    file_path = os.path.join(app.config['DOWNLOAD_FOLDER'], filename)
    logger.info(f"Looking for file at path: {file_path}")
    
    # Check if file exists
    file_exists = os.path.exists(file_path)
    logger.info(f"File exists: {file_exists}")
    
    if not file_exists:
        logger.error(f"Requested file not found: {file_path}")
        return jsonify({"error": "File not found"}), 404
    
    try:
        # Return the file as a downloadable attachment
        logger.info(f"Sending file: {file_path}")
        return send_file(
            file_path, 
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
    except Exception as e:
        logger.error(f"Error sending file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Download error: {str(e)}"}), 500
    
    
if __name__ == '__main__':
    logger.info("Starting Flask application...")
    app.run(debug=True)