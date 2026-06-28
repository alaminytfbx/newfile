'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home, Bell, MessageCircle, LogOut, Settings,
  Eye, Users, Heart, X, Check, ChevronDown
} from 'lucide-react';
import { notificationAPI, userAPI } from '@/lib/api';
import { getUser, clearAuth, getProfileUrl, User } from '@/lib/auth';
import SearchBar from './SearchBar';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  actor?: { first_name: string; last_name: string; profile_picture?: string };
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) {
      fetchNotifications();
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (msgRef.current && !msgRef.current.contains(e.target as Node)) setShowMessages(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationAPI.getNotifications(),
        notificationAPI.getUnreadCount(),
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out');
    router.push('/login');
  };

  const getNotifIcon = (type: string) => {
    if (type === 'like') return '❤️';
    if (type === 'comment') return '💬';
    if (type === 'follow') return '👥';
    return '🔔';
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200 shadow-header">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Left: Home Button + Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-button group-hover:scale-105 transition-transform">
              <span className="text-white text-lg font-bold">S</span>
            </div>
            <span className="hidden sm:block font-bold text-lg gradient-text">SocialConnect</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors text-sm font-semibold"
          >
            <Home size={16} />
            <span className="hidden md:inline">Home</span>
          </Link>
        </div>

        {/* Center: Dashboard Stats */}
        <div className="hidden md:flex items-center gap-1 bg-gray-50 rounded-2xl px-2 py-1.5 border border-gray-100">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Eye size={14} className="text-blue-500" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 leading-none">Views</p>
              <p className="text-sm font-bold text-gray-800">{user?.views_count?.toLocaleString() ?? 0}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users size={14} className="text-purple-500" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 leading-none">Followers</p>
              <p className="text-sm font-bold text-gray-800">{user?.followers_count?.toLocaleString() ?? 0}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Heart size={14} className="text-red-500" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 leading-none">Likes</p>
              <p className="text-sm font-bold text-gray-800">{user?.likes_count?.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Right: Notifications + Messages + User Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowMessages(false); setShowUserMenu(false); }}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-card-hover border border-gray-100 overflow-hidden animate-slide-down z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Notifications</h3>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                        <Check size={12} /> Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-primary-50' : ''}`}>
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                          {n.actor?.profile_picture ? (
                            <img src={n.actor.profile_picture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">{getNotifIcon(n.type)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 leading-snug">{n.content}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="relative" ref={msgRef}>
            <Link
              href="/messages"
              className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <MessageCircle size={20} className="text-gray-600" />
            </Link>
          </div>

          {/* User Menu */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); setShowMessages(false); }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary-200">
                  <img
                    src={getProfileUrl(user)}
                    alt={user.first_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=667eea&color=fff`; }}
                  />
                </div>
                <span className="hidden sm:block text-sm font-semibold text-gray-700 max-w-[100px] truncate">{user.first_name}</span>
                <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-card-hover border border-gray-100 overflow-hidden animate-slide-down z-50 py-1">
                  <Link href={`/profile/${user.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-full overflow-hidden">
                      <img src={getProfileUrl(user)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-gray-400">View Profile</p>
                    </div>
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm text-gray-600">
                    <Settings size={15} /> Settings
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-sm text-red-500">
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm py-2 px-4">Sign In</Link>
          )}
        </div>
      </div>

      {/* Search Bar Row */}
      <div className="border-t border-gray-100 bg-white/60 backdrop-blur px-4 py-2">
        <div className="max-w-2xl mx-auto">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
