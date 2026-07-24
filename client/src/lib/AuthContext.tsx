// في ملف AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { authService } from '../lib/auth';

interface AuthContextType {
  user: { token: string; userType: string } | null;
  login: (identifier: string, password: string, userType: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<{ token: string; userType: string } | null>(null);

  const login = async (identifier: string, password: string, userType: string) => {
    try {
      let result;
      
      if (userType === 'admin') {
        result = await authService.loginAdmin(identifier, password);
      } else if (userType === 'driver') {
        result = await authService.loginDriver(identifier, password);
      } else {
        return { success: false, message: 'نوع المستخدم غير صحيح' };
      }

      if (result.success && result.token && result.userType) {
        setUser({ token: result.token, userType: result.userType });
        localStorage.setItem('token', result.token);
        localStorage.setItem('userType', result.userType);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول' };
    }
  };

  const logout = () => {
    if (user) {
      authService.logout(user.token, user.userType);
    }
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
  };

  const value = {
    user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};