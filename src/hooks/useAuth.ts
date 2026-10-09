/**
 * useAuth — Custom hook untuk mengakses auth state
 * Menyediakan user aktif, status login, dan fungsi logout
 */
import { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { User } from '../types/database';

export interface UseAuthReturn {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGuru: boolean;
  isWaliKelas: boolean;
  sessionId: string | null;
  logout: () => Promise<void>;
  refreshSession: () => void;
}

export function useAuth(): UseAuthReturn {
  const [currentUser, setCurrentUser] = useState<User | null>(
    authService.getCurrentUser()
  );

  useEffect(() => {
    const unsubscribe = authService.subscribe(user => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'ADMIN',
    isGuru: currentUser?.role === 'GURU' || currentUser?.role === 'ADMIN',
    isWaliKelas: currentUser?.role === 'WALI_KELAS' || currentUser?.role === 'ADMIN',
    sessionId: authService.getSessionId(),
    logout: () => authService.logout(),
    refreshSession: () => authService.refreshSession(),
  };
}
