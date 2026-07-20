import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import Login from './Login.tsx';
import { LoadingProvider } from './context/LoadingContext.tsx';
import GlobalLoader from './components/ui/GlobalLoader.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoadingProvider>
      {/* Fullscreen overlay — auto-shows for critical loading keys */}
      <GlobalLoader />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </LoadingProvider>
  </StrictMode>,
);
