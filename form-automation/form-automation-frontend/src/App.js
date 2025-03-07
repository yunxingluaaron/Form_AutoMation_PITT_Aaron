// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { FaFileMedical, FaGithub } from 'react-icons/fa';

// Import pages
import Dashboard from './pages/Dashboard';
import FormUpload from './pages/FormUpload';
import FormEditor from './pages/FormEditor';
import FormPreview from './pages/FormPreview';

// Import context provider
import { FormProvider } from './context/FormContext';

// Import CSS
import 'react-toastify/dist/ReactToastify.css';
import './styles/main.css';

function App() {
  return (
    <FormProvider>
      <Router>
        <div className="app-container">
          <header className="header">
            <div className="header-container">
              <Link to="/" className="logo">
                <FaFileMedical className="logo-icon" />
                Form Automation
              </Link>
              <nav>
                <ul className="nav-menu">
                  <li className="nav-item">
                    <Link to="/" className="nav-link">Dashboard</Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/upload" className="nav-link">Upload</Link>
                  </li>
                </ul>
              </nav>
            </div>
          </header>
          
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<FormUpload />} />
              <Route path="/editor" element={<FormEditor />} />
              <Route path="/preview" element={<FormPreview />} />
            </Routes>
          </main>
          
          <footer className="footer">
            <div className="footer-container">
              <p className="footer-text">
                Form Automation Tool - Powered by Mistral OCR and ChatGPT
              </p>
              <div className="footer-links">
                <a 
                  href="https://github.com/yourusername/form-automation" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  <FaGithub style={{ marginRight: '4px' }} />
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
        
        {/* Toast notifications container */}
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </Router>
    </FormProvider>
  );
}

export default App;