# form_mapping.py

def map_to_ibhs_form(patient_data):
    """
    Map extracted patient data to WRITTEN ORDER FOR IBHS form fields
    
    Args:
        patient_data (dict): Extracted patient information
        
    Returns:
        dict: Mapped data for the IBHS form
    """
    # Define form field mapping
    ibhs_form = {
        "child_name": patient_data.get("name"),
        "dob": patient_data.get("dob"),
        "parent_guardian": patient_data.get("guardian", {}).get("name"),
        "current_diagnoses": format_diagnoses(patient_data.get("diagnoses", [])),
        "measurable_goals": format_goals(patient_data.get("goals", [])),
        "clinical_information": format_symptoms(patient_data.get("symptoms", [])),
        "treatment_history": patient_data.get("treatment_history"),
        # Add more form fields as needed
    }
    
    return ibhs_form

def map_to_community_care_form(patient_data):
    """
    Map extracted patient data to COMMUNITY CARE IBHS Written Order Letter form fields
    
    Args:
        patient_data (dict): Extracted patient information
        
    Returns:
        dict: Mapped data for the Community Care form
    """
    # Define form field mapping
    community_care_form = {
        "recipient_name": patient_data.get("name"),
        "dob": patient_data.get("dob"),
        "age": patient_data.get("age"),
        "diagnoses": format_diagnoses(patient_data.get("diagnoses", [])),
        "symptoms": format_symptoms(patient_data.get("symptoms", [])),
        "treatment_recommendations": generate_treatment_recommendations(patient_data),
        "medical_necessity": generate_medical_necessity(patient_data),
        # Add more form fields as needed
    }
    
    return community_care_form

def format_diagnoses(diagnoses):
    """Format the diagnoses list for form display"""
    if not diagnoses:
        return "No diagnoses available"
    
    formatted = []
    for dx in diagnoses:
        if dx.get("name") and dx.get("code"):
            formatted.append(f"{dx['name']} ({dx['code']})")
        elif dx.get("name"):
            formatted.append(dx['name'])
        elif dx.get("code"):
            formatted.append(dx['code'])
    
    return "\n".join(formatted) if formatted else "No diagnoses available"

def format_goals(goals):
    """Format treatment goals for form display"""
    if not goals or (isinstance(goals, str) and goals.lower() == "none"):
        return "Goals to be determined"
    
    if isinstance(goals, str):
        return goals
    
    if isinstance(goals, list):
        # Add numbering to goals
        return "\n".join([f"{i+1}. {goal}" for i, goal in enumerate(goals)])
    
    return "Goals to be determined"

def format_symptoms(symptoms):
    """Format symptoms for form display"""
    if not symptoms or (isinstance(symptoms, str) and symptoms.lower() == "none"):
        return "No symptoms documented"
    
    if isinstance(symptoms, str):
        return symptoms
    
    if isinstance(symptoms, list):
        return "\n".join([f"• {symptom}" for symptom in symptoms])
    
    return "No symptoms documented"

def generate_treatment_recommendations(patient_data):
    """Generate treatment recommendations based on patient data"""
    # This is a placeholder - in a real implementation, this would use 
    # more sophisticated logic or even an LLM to generate recommendations
    
    diagnoses = patient_data.get("diagnoses", [])
    symptoms = patient_data.get("symptoms", [])
    
    if not diagnoses and not symptoms:
        return "Treatment recommendations to be determined following comprehensive assessment."
    
    # Basic recommendation based on diagnostic categories
    has_autism = any("autism" in dx.get("name", "").lower() for dx in diagnoses)
    has_adhd = any("attention" in dx.get("name", "").lower() for dx in diagnoses)
    
    recommendations = []
    
    if has_autism:
        recommendations.append("Applied Behavior Analysis (ABA) therapy recommended for Autism Spectrum Disorder.")
    
    if has_adhd:
        recommendations.append("Behavior management strategies recommended for attention-related concerns.")
    
    # Generic recommendations if nothing specific was identified
    if not recommendations:
        recommendations.append("Individual therapy sessions recommended to address identified behavioral health concerns.")
        recommendations.append("Family involvement in treatment process is recommended.")
    
    return "\n".join(recommendations)

def generate_medical_necessity(patient_data):
    """Generate medical necessity statement based on patient data"""
    # Placeholder function - would be more sophisticated in real implementation
    
    diagnoses = patient_data.get("diagnoses", [])
    symptoms = patient_data.get("symptoms", [])
    
    if not diagnoses and not symptoms:
        return "Medical necessity to be determined following comprehensive assessment."
    
    necessity = ["Treatment is medically necessary based on:"]
    
    if diagnoses:
        necessity.append("• Presence of behavioral health diagnosis requiring intervention")
    
    if symptoms and isinstance(symptoms, list) and len(symptoms) > 0:
        necessity.append("• Presence of symptoms impacting daily functioning")
        
        # Add specific symptom impacts if available
        if len(symptoms) >= 3:
            necessity.append("• Multiple areas of functioning impacted by symptoms")
    
    necessity.append("• Treatment is expected to improve functioning and prevent deterioration")
    
    return "\n".join(necessity)