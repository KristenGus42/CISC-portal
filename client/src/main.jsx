import { StrictMode } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css' 
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './auth/AuthProvider.jsx'

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyADNdwf_eraJtHEz6sI5FAWq_DPW4UbfF8",
  authDomain: "cisc-portal.firebaseapp.com",
  databaseURL: "https://cisc-portal-default-rtdb.firebaseio.com",
  projectId: "cisc-portal",
  storageBucket: "cisc-portal.firebasestorage.app",
  messagingSenderId: "789232261204",
  appId: "1:789232261204:web:3f8203a777e3218e3a35c1",
  measurementId: "G-N9VMCVB51E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);




createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)
