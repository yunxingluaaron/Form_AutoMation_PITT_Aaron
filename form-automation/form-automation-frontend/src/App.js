// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import components
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import FormUpload from './pages/FormUpload';
import FormEditor from './pages/FormEditor';
import FormPreview from './pages/FormPreview';
import FormsHistory from './pages/FormsHistory';
import Settings from './pages/Settings';

// Import context
import { FormProvider } from './context/FormContext';

function App() {
  return (
    <FormProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<FormUpload />} />
              <Route path="/editor" element={<FormEditor />} />
              <Route path="/preview" element={<FormPreview />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <ToastContainer position="bottom-right" />
        </div>
      </Router>
    </FormProvider>
  );
}

export default App;