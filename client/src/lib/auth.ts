const API_BASE = '/api/auth';

export const authService = {
  async loginAdmin(username: string, password: string) {
    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
  },

  async loginDriver(phone: string, password: string) {
    try {
      const response = await fetch(`${API_BASE}/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: 'خطأ في الاتصال بالخادم' };
    }
  },

  async logout(token: string, userType: string) {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userType }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
};
