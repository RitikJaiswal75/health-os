import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { Footer } from './components/Footer';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivacyPolicy />
    <Footer />
  </StrictMode>,
);
