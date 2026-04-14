import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/base.css'
import './styles/components.css'

// Global interceptor to route /api traffic to a remote backend if hosted externally
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    if (typeof resource === 'string' && resource.startsWith('/api')) {
      resource = apiUrl + resource;
    }
    return originalFetch(resource, config);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
