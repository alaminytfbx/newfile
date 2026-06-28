'use client';
import Link from 'next/link';
import { MapPin, Calendar, BookOpen, Heart, Eye, Users } from 'lucide-react';
import { getUser, getProfileUrl, User } from '@/lib/auth';

interface Props {
  user: User | null;
}

export default function ProfileSidebar({ user }: Props) {
  if (!user) return (
    <div className="card text-center py-8">
      <div className="w-16 h-16 rounded-full bg-gradient-brand mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Please log in to see your profile</p>
      <Link href="/login" className="btn-primary mt-3 inline-block text-sm">Sign In</Link>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Profile Card */}
      <div className="card overflow-hidden p-0">
        {/* Cover mini */}
        <div className="h-20 bg-gradient-brand relative">
          {user.cover_photo && (
            <img src={`http://localhost:8000${user.cover_photo}`} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-end gap-3 -mt-8 mb-3">
            <Link href={`/profile/${user.id}`}>
              <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-white shadow-lg">
                <img
                  src={getProfileUrl(user)}
                  alt={user.first_name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=667eea&color=fff`; }}
                />
              </div>
            </Link>
            <div className="flex-1 min-w-0 pb-1">
              <Link href={`/profile/${user.id}`}>
                <h3 className="font-bold text-gray-800 text-base hover:text-primary-600 transition-colors truncate">
                  {user.first_name} {user.last_name}
                </h3>
              </Link>
              {user.bio && <p className="text-xs text-gray-500 line-clamp-1">{user.bio}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold gradient-text">{user.followers_count ?? 0}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Followers</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-lg font-bold gradient-text">{user.following_count ?? 0}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Following</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold gradient-text">{user.likes_count ?? 0}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Likes</p>
            </div>
          </div>

          {/* Details */}
          <div className="mt-3 space-y-2">
            {user.location && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin size={12} className="text-primary-400 flex-shrink-0" />
                <span className="truncate">{user.location}</span>
              </div>
            )}
            {user.date_of_birth && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={12} className="text-primary-400 flex-shrink-0" />
                <span>{user.date_of_birth}</span>
              </div>
            )}
            {user.education && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <BookOpen size={12} className="text-primary-400 flex-shrink-0" />
                <span className="truncate">{user.education}</span>
              </div>
            )}
            {user.hobbies && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Heart size={12} className="text-primary-400 flex-shrink-0" />
                <span className="truncate">{user.hobbies}</span>
              </div>
            )}
          </div>

          <Link href={`/profile/${user.id}`} className="btn-secondary w-full text-center text-sm mt-4 block">
            View Profile
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card space-y-1 p-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Quick Links</p>
        {[
          { href: '/messages', label: '💬 Messages' },
          { href: `/profile/${user.id}`, label: '👤 My Profile' },
          { href: '/settings', label: '⚙️ Settings' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center px-2 py-2 rounded-xl text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
