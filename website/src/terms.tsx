import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TermsOfService } from './components/TermsOfService';
import { Footer } from './components/Footer';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TermsOfService />
    <Footer />
  </StrictMode>,
);
