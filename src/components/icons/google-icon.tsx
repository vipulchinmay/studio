// src/components/icons/google-icon.tsx
import type React from 'react';

const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="1em" height="1em" {...props}>
    <path fill="#EA4335" d="M24 9.5c3.46 0 6.48 1.2 8.83 3.36l6.43-6.43C35.47 2.92 30.01 0 24 0 14.89 0 7.17 5.76 4.02 13.79l7.78 6.02C13.3 13.32 18.23 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.2 24.11c0-1.61-.15-3.17-.41-4.68H24v9.01h12.45c-.53 2.92-2.18 5.41-4.8 7.12l7.59 5.87c4.44-4.08 7.01-10.01 7.01-17.32z"/>
    <path fill="#34A853" d="M11.8 29.81C11.26 28.21 11 26.53 11 24.8s.26-3.41.8-4.99l-7.78-6.02C1.53 17.16 0 20.84 0 24.8s1.53 7.64 4.02 10.99l7.78-6.02z"/>
    <path fill="#FBBC05" d="M24 48c6.01 0 11.47-1.92 15.28-5.18l-7.59-5.87c-2.01 1.35-4.58 2.18-7.69 2.18-5.77 0-10.7-3.82-12.48-8.99l-7.78 6.02C7.17 42.24 14.89 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

export default GoogleIcon;
