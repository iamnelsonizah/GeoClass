'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, User } from './auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (params: { email: string; password: string }) => {
    success: boolean;
    message: string;
    user?: User;
    requiresVerification?: boolean;
    otpCode?: string;
  };
  register: (params: {
    fullName: string;
    email: string;
    password: string;
    role?: string;
    organization?: string;
  }) => { success: boolean; message: string; otpCode?: string };
  verifyOTP: (email: string, code: string) => { success: boolean; message: string; user?: User };
  resendOTP: (email: string) => { success: boolean; message: string; otpCode?: string; cooldownSeconds?: number };
  requestPasswordReset: (email: string) => { success: boolean; message: string; otpCode?: string };
  resetPassword: (email: string, code: string, newPassword: string) => { success: boolean; message: string };
  logout: () => void;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = () => {
    const current = authService.getCurrentUser();
    setUser(current);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = (params: { email: string; password: string }) => {
    const res = authService.login(params);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const register = (params: {
    fullName: string;
    email: string;
    password: string;
    role?: string;
    organization?: string;
  }) => {
    return authService.register(params);
  };

  const verifyOTP = (email: string, code: string) => {
    const res = authService.verifyOTP(email, code);
    if (res.success && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const resendOTP = (email: string) => {
    return authService.resendOTP(email);
  };

  const requestPasswordReset = (email: string) => {
    return authService.requestPasswordReset(email);
  };

  const resetPassword = (email: string, code: string, newPassword: string) => {
    return authService.resetPassword(email, code, newPassword);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.isVerified,
        isLoading,
        login,
        register,
        verifyOTP,
        resendOTP,
        requestPasswordReset,
        resetPassword,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
