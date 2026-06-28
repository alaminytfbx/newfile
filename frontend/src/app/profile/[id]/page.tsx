'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Calendar, BookOpen, Heart, Edit2, Camera, Plus,
  Users, Grid, Film, Image as ImageIcon, UserPlus, UserMinus,
  MessageCircle, Eye, Loader2
} from 'lucide-react';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import { userAPI, postAPI, storyAPI } from '@/lib/api';
import { getUser, isAuthenticated, getProfileUrl } from '@/lib/auth';
import toast from 'react-hot-toast';

type TabType = 'posts' | 'photos' | 'videos' | 'reels';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const currentUser = getUser();
  const isOwnProfile = currentUser?.id === parseInt(id);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    fetchProfile();
  }, [id]);

  useEffect(() => {
    if (profileUser) {
      fetchPosts(activeTab);
    }
  }, [activeTab, profileUser]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [userRes, followersRes] = await Promise.all([
        userAPI.getUser(parseInt(id)),
        userAPI.getFollowers(parseInt(id)),
      ]);
      setProfileUser(userRes.data);
      setFollowing(userRes.data.is_following || false);
      setFollowers(followersRes.data);
      setEditData({
        first_name: userRes.data.first_name,
        last_name: userRes.data.last_name,
        bio: userRes.data.bio || '',
        location: userRes.data.location || '',
        hobbies: userRes.data.hobbies || '',
        education: userRes.data.education || '',
        date_of_birth: userRes.data.date_of_birth || '',
        age: userRes.data.age || '',
      });
    } catch {
      toast.error('Failed to load profile');
    }
    setLoading(false);
  };

  const fetchPosts = async (tab: TabType) => {
    const typeMap: Record<TabType, string | undefined> = {
      posts: undefined, photos: 'photo', videos: 'video', reels: 'reel'
    };
    try {
      const res = await postAPI.getUserPosts(parseInt(id), typeMap[tab]);
      setPosts(res.data);
    } catch {}
  };

  const handleFollow = async () => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    try {
      const res = await userAPI.followUser(parseInt(id));
      setFollowing(res.data.is_following);
      setProfileUser((prev: any) => ({
        ...prev,
        followers_count: res.data.is_following
          ? (prev.followers_count || 0) + 1
          : Math.max(0, (prev.followers_count || 0) - 1),
      }));
      toast.success(res.data.is_following ? 'Following!' : 'Unfollowed');
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await userAPI.uploadProfilePicture(file);
      setProfileUser((prev: any) => ({ ...prev, profile_picture: res.data.profile_picture }));
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Failed to upload');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await userAPI.uploadCoverPhoto(file);
      setProfileUser((prev: any) => ({ ...prev, cover_photo: res.data.cover_photo }));
      toast.success('Cover photo updated!');
    } catch {
      toast.error('Failed to upload');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await userAPI.updateMe({
        ...editData,
        age: editData.age ? parseInt(editData.age) : undefined,
      });
      setProfileUser((prev: any) => ({ ...prev, ...res.data }));
      setEditMode(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    }
    setSavingProfile(false);
  };

  const handleDeletePost = (postId: number) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleAddStory = async () => {
    toast('Story feature: Add to story coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="h-28" />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card animate-pulse">
            <div className="h-48 bg-gray-200 rounded-xl mb-4" />
            <div className="flex gap-4 items-end px-4 -mt-12 mb-4">
              <div className="w-24 h-24 rounded-full bg-gray-200 ring-4 ring-white" />
              <div className="flex-1 space-y-2 pb-2">
                <div className="h-5 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  const mutualFollowers = followers.filter(f => f.is_following).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="h-28" />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Profile Header Card */}
        <div className="card p-0 overflow-hidden">
          {/* Cover Photo */}
          <div className="relative h-56 bg-gradient-brand">
            {profileUser.cover_photo && (
              <img
                src={`http://localhost:8000${profileUser.cover_photo}`}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 cover-overlay" />
            {isOwnProfile && (
              <label className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                <Camera size={13} /> Change Cover
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Profile info row */}
          <div className="px-6 pb-5">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end -mt-12 mb-4">
              {/* Profile Picture (circular, on the left) */}
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-xl bg-gradient-brand">
                  <img
                    src={profileUser.profile_picture
                      ? `http://localhost:8000${profileUser.profile_picture}`
                      : `https://ui-avatars.com/api/?name=${profileUser.first_name}+${profileUser.last_name}&background=667eea&color=fff&size=112`
                    }
                    alt={profileUser.first_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${profileUser.first_name}&background=667eea&color=fff`; }}
                  />
                </div>
                {isOwnProfile && (
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors">
                    <Camera size={14} className="text-white" />
                    <input type="file" accept="image/*" onChange={handleProfilePicUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex-1 pt-2 sm:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {profileUser.first_name} {profileUser.last_name}
                    </h1>
                    {profileUser.bio && <p className="text-gray-500 text-sm mt-0.5">{profileUser.bio}</p>}
                  </div>
                  <div className="flex gap-2">
                    {isOwnProfile ? (
                      <>
                        <button onClick={handleAddStory} className="btn-secondary text-sm flex items-center gap-1.5 py-2">
                          <Plus size={14} /> Add to Story
                        </button>
                        <button onClick={() => setEditMode(!editMode)} className="btn-primary text-sm flex items-center gap-1.5 py-2">
                          <Edit2 size={14} /> {editMode ? 'Cancel' : 'Edit Profile'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleFollow} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${following ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500' : 'btn-primary'}`}>
                          {following ? <><UserMinus size={14} /> Unfollow</> : <><UserPlus size={14} /> Follow</>}
                        </button>
                        <Link href="/messages" className="btn-secondary text-sm flex items-center gap-1.5 py-2">
                          <MessageCircle size={14} /> Message
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 mt-3">
                  {[
                    { label: 'Posts', value: posts.length },
                    { label: 'Followers', value: profileUser.followers_count || 0 },
                    { label: 'Following', value: profileUser.following_count || 0 },
                    { label: 'Views', value: profileUser.views_count || 0 },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <p className="font-bold text-gray-800">{stat.value.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            {editMode && isOwnProfile && (
              <div className="mt-4 p-4 bg-gray-50 rounded-2xl space-y-3 animate-slide-down">
                <h3 className="font-semibold text-gray-700 text-sm">Edit Profile</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">First Name</label>
                    <input value={editData.first_name} onChange={e => setEditData({...editData, first_name: e.target.value})} className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Last Name</label>
                    <input value={editData.last_name} onChange={e => setEditData({...editData, last_name: e.target.value})} className="input-field text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Bio</label>
                  <textarea value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} className="input-field text-sm" rows={2} placeholder="Tell the world about yourself..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Location</label>
                    <input value={editData.location} onChange={e => setEditData({...editData, location: e.target.value})} className="input-field text-sm" placeholder="City, Country" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Education</label>
                    <input value={editData.education} onChange={e => setEditData({...editData, education: e.target.value})} className="input-field text-sm" placeholder="University / School" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Hobbies</label>
                  <input value={editData.hobbies} onChange={e => setEditData({...editData, hobbies: e.target.value})} className="input-field text-sm" placeholder="Reading, Photography, Hiking..." />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2">
                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : null}
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid: About + Friends on left, Posts on right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: About + Friends */}
          <div className="md:col-span-4 space-y-4">
            {/* About */}
            <div className="card space-y-3">
              <h3 className="font-bold text-gray-800">About</h3>
              {[
                { icon: <MapPin size={14} className="text-primary-400" />, value: profileUser.location, label: 'Lives in' },
                { icon: <Calendar size={14} className="text-primary-400" />, value: profileUser.date_of_birth, label: 'Born' },
                { icon: <BookOpen size={14} className="text-primary-400" />, value: profileUser.education, label: 'Studied at' },
                { icon: <Heart size={14} className="text-primary-400" />, value: profileUser.hobbies, label: 'Hobbies' },
              ].map(item => item.value && (
                <div key={item.label} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm text-gray-700">{item.value}</p>
                  </div>
                </div>
              ))}
              {profileUser.gender && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="capitalize">👤 {profileUser.gender.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>

            {/* Friends / Followers */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Friends & Followers</h3>
                <span className="text-xs text-gray-400">{profileUser.followers_count || 0}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {followers.slice(0, 9).map(f => (
                  <Link key={f.id} href={`/profile/${f.id}`} className="text-center group">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 mb-1">
                      <img
                        src={f.profile_picture
                          ? `http://localhost:8000${f.profile_picture}`
                          : `https://ui-avatars.com/api/?name=${f.first_name}+${f.last_name}&background=667eea&color=fff`
                        }
                        alt={f.first_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${f.first_name}&background=667eea&color=fff`; }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{f.first_name}</p>
                    {f.mutual && <p className="text-[9px] text-primary-400">Mutual</p>}
                  </Link>
                ))}
              </div>
              {followers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No followers yet</p>
              )}
            </div>

            {/* Dashboard */}
            {isOwnProfile && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-3">Dashboard</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '👁️', label: 'Profile Views', value: profileUser.views_count || 0 },
                    { icon: '❤️', label: 'Total Likes', value: profileUser.likes_count || 0 },
                    { icon: '👥', label: 'Followers', value: profileUser.followers_count || 0 },
                    { icon: '📝', label: 'Posts', value: posts.length },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-xl mb-1">{item.icon}</div>
                      <p className="font-bold text-gray-800 text-lg">{item.value.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Posts */}
          <div className="md:col-span-8">
            {/* Tabs */}
            <div className="card p-1.5 flex gap-1 mb-4">
              {([
                { key: 'posts', icon: <Grid size={14} />, label: 'Posts' },
                { key: 'photos', icon: <ImageIcon size={14} />, label: 'Photos' },
                { key: 'videos', icon: <Film size={14} />, label: 'Videos' },
                { key: 'reels', icon: <Film size={14} />, label: 'Reels' },
              ] as { key: TabType; icon: any; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-primary-500 text-white shadow-button'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Grid size={22} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm">No {activeTab} yet</p>
                </div>
              ) : (
                posts.map(post => (
                  <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
