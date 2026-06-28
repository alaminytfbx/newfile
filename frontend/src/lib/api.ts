import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  registerInitiate: (data: object) => api.post('/api/auth/register/initiate', data),
  verifyCode: (data: object) => api.post('/api/auth/register/verify', data),
  registerFinalize: (params: object) => api.post('/api/auth/register/finalize', null, { params }),
  login: (data: object) => api.post('/api/auth/login', data),
  loginVerify: (data: object) => api.post('/api/auth/login/verify', data),
  forgotPassword: (data: object) => api.post('/api/auth/forgot-password', data),
  resetPassword: (data: object) => api.post('/api/auth/reset-password', data),
  sendCode: (identifier: string, purpose: string) =>
    api.post('/api/auth/send-code', null, { params: { identifier, purpose } }),
};

// User APIs
export const userAPI = {
  getMe: () => api.get('/api/users/me'),
  updateMe: (data: object) => api.put('/api/users/me', data),
  uploadProfilePicture: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/users/me/profile-picture', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCoverPhoto: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/users/me/cover-photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  searchUsers: (q: string) => api.get('/api/users/search', { params: { q } }),
  getUser: (id: number) => api.get(`/api/users/${id}`),
  followUser: (id: number) => api.post(`/api/users/${id}/follow`),
  getFollowers: (id: number) => api.get(`/api/users/${id}/followers`),
  getFollowing: (id: number) => api.get(`/api/users/${id}/following`),
};

// Post APIs
export const postAPI = {
  getFeed: (skip = 0, limit = 20) => api.get('/api/posts/feed', { params: { skip, limit } }),
  getUserPosts: (userId: number, postType?: string) =>
    api.get(`/api/posts/user/${userId}`, { params: { post_type: postType } }),
  createPost: (form: FormData) =>
    api.post('/api/posts', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getPost: (id: number) => api.get(`/api/posts/${id}`),
  deletePost: (id: number) => api.delete(`/api/posts/${id}`),
  likePost: (id: number) => api.post(`/api/posts/${id}/like`),
  getComments: (id: number) => api.get(`/api/posts/${id}/comments`),
  addComment: (id: number, content: string) => api.post(`/api/posts/${id}/comments`, { content }),
};

// Message APIs
export const messageAPI = {
  getConversations: () => api.get('/api/messages/conversations'),
  getMessages: (userId: number) => api.get(`/api/messages/${userId}`),
  sendMessage: (receiverId: number, content: string) =>
    api.post('/api/messages/send', { receiver_id: receiverId, content }),
  getPinStatus: (deviceId: string) =>
    api.get('/api/messages/pin/status', { params: { device_id: deviceId } }),
  createPin: (pin: string, deviceId: string) =>
    api.post('/api/messages/pin/create', { pin, device_id: deviceId }),
  verifyPin: (pin: string, deviceId: string) =>
    api.post('/api/messages/pin/verify', { pin, device_id: deviceId }),
};

// Notification APIs
export const notificationAPI = {
  getNotifications: () => api.get('/api/notifications'),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  markAllRead: () => api.post('/api/notifications/read-all'),
  markRead: (id: number) => api.post(`/api/notifications/${id}/read`),
};

// Story APIs
export const storyAPI = {
  getStories: () => api.get('/api/stories'),
  createStory: (form: FormData) =>
    api.post('/api/stories', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteStory: (id: number) => api.delete(`/api/stories/${id}`),
};

// Admin APIs
export const adminAPI = {
  login: (username: string, password: string) =>
    api.post('/api/admin/login', null, { params: { username, password } }),
  getUsers: (token: string, skip = 0, limit = 50, search = '') =>
    api.get('/api/admin/users', { params: { token, skip, limit, search } }),
  getStats: (token: string) =>
    api.get('/api/admin/stats', { params: { token } }),
  toggleUserActive: (token: string, userId: number) =>
    api.put(`/api/admin/users/${userId}/toggle-active`, null, { params: { token } }),
  deleteUser: (token: string, userId: number) =>
    api.delete(`/api/admin/users/${userId}`, { params: { token } }),
};
