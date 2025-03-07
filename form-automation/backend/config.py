# config.py
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-for-testing-only'
    UPLOAD_FOLDER = './uploads'
    GENERATED_FORMS_FOLDER = './generated_forms'
    FORM_DATA_FOLDER = './form_data'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
    mistral_api_key = os.environ.get('MISTRAL_API_KEY')
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    DEBUG = False
    TESTING = False

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    # Make sure to set these environment variables in production
    SECRET_KEY = os.environ.get('SECRET_KEY')
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', './uploads')
    GENERATED_FORMS_FOLDER = os.environ.get('GENERATED_FORMS_FOLDER', './generated_forms')
    FORM_DATA_FOLDER = os.environ.get('FORM_DATA_FOLDER', './form_data')

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get the current configuration based on environment"""
    env = os.environ.get('FLASK_ENV', 'default')
    return config.get(env, config['default'])