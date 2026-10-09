import React from 'react';
import { LoginPage } from './LoginPage';
import { User } from '../types/database';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  onLoginSuccess?: (user: User) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onLoginSuccess }) => {
  return (
    <LoginPage
      onLoginSuccess={onLoginSuccess || (() => {})}
      onNavigate={onNavigate}
    />
  );
};
