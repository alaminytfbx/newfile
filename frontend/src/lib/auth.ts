export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_picture?: string;
  cover_photo?: string;
  bio?: string;
  location?: string;
  gender?: string;
  date_of_birth?: string;
  age?: number;
  hobbies?: string;
  education?: string;
  is_email_verified: boolean;
  views_count: number;
  followers_count: number;
  following_count: number;
  likes_count: number;
  created_at: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

export function getProfileUrl(user: User | null): string {
  return user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || 'U') + '+' + (user?.last_name || ''))}&background=667eea&color=fff&size=128`;
}
