'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, BarChart2, Search, Trash2, UserX, UserCheck,
  LogOut, Loader2, Eye, MessageCircle, Heart
} from 'lucide-react';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'stats'>('users');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsLoggedIn(true);
      loadData(savedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await adminAPI.login(username, password);
      setAdminToken(res.data.access_token);
      sessionStorage.setItem('admin_token', res.data.access_token);
      setIsLoggedIn(true);
      toast.success('Welcome, Admin!');
      loadData(res.data.access_token);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid credentials');
    }
    setLoginLoading(false);
  };

  const loadData = async (token: string) => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminAPI.getUsers(token),
        adminAPI.getStats(token),
      ]);
      setUsers(usersRes.data.users);
      setTotal(usersRes.data.total);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers(adminToken, 0, 50, searchQuery);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const res = await adminAPI.toggleUserActive(adminToken, userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await adminAPI.deleteUser(adminToken, userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setAdminToken('');
    setIsLoggedIn(false);
    setUsers([]);
    setStats(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-button">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 mt-1">SocialConnect Administration</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">Admin Username</label>
              <input
                type="text"
                placeholder="hbbelalr"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/30 transition-all"
                required
              />
            </div>
            <button type="submit" disabled={loginLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loginLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              {loginLoading ? 'Signing in...' : 'Access Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-gradient-to-r from-gray-900 to-primary-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg">Admin Panel</h1>
            <p className="text-xs text-white/60">SocialConnect Administration</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors">
          <LogOut size={15} /> Logout
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Users size={20} className="text-blue-500" />, label: 'Total Users', value: stats.total_users, bg: 'bg-blue-50' },
              { icon: <UserCheck size={20} className="text-green-500" />, label: 'Active Users', value: stats.active_users, bg: 'bg-green-50' },
              { icon: <Heart size={20} className="text-red-500" />, label: 'Total Posts', value: stats.total_posts, bg: 'bg-red-50' },
              { icon: <MessageCircle size={20} className="text-purple-500" />, label: 'Messages', value: stats.total_messages, bg: 'bg-purple-50' },
            ].map(item => (
              <div key={item.label} className="card flex items-center gap-3">
                <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{item.value?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Post Type Breakdown */}
        {stats?.post_types && (
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-3">Content Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.post_types).map(([type, count]) => (
                <div key={type} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold gradient-text">{count as number}</p>
                  <p className="text-xs text-gray-500 capitalize">{type} posts</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Users size={18} className="text-primary-500" />
              Users Management
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{total}</span>
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-200"
              />
              <button onClick={handleSearch} className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors">
                <Search size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">User</th>
                    <th className="px-5 py-3 text-left">Contact</th>
                    <th className="px-5 py-3 text-left hidden md:table-cell">Details</th>
                    <th className="px-5 py-3 text-left hidden lg:table-cell">Activity</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-brand flex-shrink-0">
                            <img
                              src={user.profile_picture
                                ? `http://localhost:8000${user.profile_picture}`
                                : `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=667eea&color=fff&size=36`
                              }
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.first_name}&background=667eea&color=fff`; }}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-gray-400">ID: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-400">{user.phone}</p>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <p className="text-xs text-gray-500 capitalize">{user.gender?.replace(/_/g, ' ') || '—'}</p>
                        <p className="text-xs text-gray-400">{user.date_of_birth || '—'}</p>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <p className="text-xs text-gray-500">{user.posts_count} posts</p>
                        <p className="text-xs text-gray-400">{user.followers_count} followers</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${user.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <br />
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${user.is_email_verified ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            {user.is_email_verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${user.is_active ? 'hover:bg-red-50 text-red-400 hover:text-red-600' : 'hover:bg-green-50 text-green-400 hover:text-green-600'}`}
                          >
                            {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete user"
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">No users found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
