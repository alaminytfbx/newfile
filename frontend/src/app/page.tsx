'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Image as ImageIcon, Film, FileVideo, AlignLeft, X, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import ProfileSidebar from '@/components/ProfileSidebar';
import PostCard from '@/components/PostCard';
import { postAPI, storyAPI } from '@/lib/api';
import { getUser, isAuthenticated, User } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Post {
  id: number;
  user_id: number;
  content?: string;
  media_url?: string;
  post_type: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_liked: boolean;
  created_at: string;
  author?: any;
}

interface Story {
  id: number;
  user_id: number;
  media_url?: string;
  text_content?: string;
  expires_at: string;
  author?: any;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchPosts(0);
    fetchStories();
  }, []);

  const fetchPosts = async (skip: number) => {
    if (skip === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await postAPI.getFeed(skip, 10);
      if (skip === 0) {
        setPosts(res.data);
      } else {
        setPosts(prev => [...prev, ...res.data]);
      }
      setHasMore(res.data.length === 10);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchStories = async () => {
    try {
      const res = await storyAPI.getStories();
      setStories(res.data);
    } catch {}
  };

  const handleLoadMore = () => {
    const nextPage = page + 10;
    setPage(nextPage);
    fetchPosts(nextPage);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    if (file.type.startsWith('video/')) {
      setPostType('video');
    } else if (file.type.startsWith('image/')) {
      setPostType('photo');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !selectedFile) {
      toast.error('Please add content or media');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      if (postContent) form.append('content', postContent);
      form.append('post_type', postType);
      if (selectedFile) form.append('file', selectedFile);

      const res = await postAPI.createPost(form);
      setPosts(prev => [res.data, ...prev]);
      setPostContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setPostType('text');
      setShowCreatePost(false);
      toast.success('Post created!');
    } catch {
      toast.error('Failed to create post');
    }
    setSubmitting(false);
  };

  const handleDeletePost = (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const isVideo = (url: string) => url && (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm'));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Spacer for fixed header (header + search bar) */}
      <div className="h-28" />

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Left Sidebar: User Profile */}
          <aside className="lg:col-span-3">
            <div className="sticky top-32 space-y-4">
              <ProfileSidebar user={user} />
            </div>
          </aside>

          {/* Main Feed */}
          <main className="lg:col-span-9 space-y-4">

            {/* Stories Bar */}
            <div className="card p-3 overflow-hidden">
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {/* Add Story */}
                <div className="flex-shrink-0 text-center">
                  <label className="cursor-pointer">
                    <div className="story-ring w-16 h-16 mx-auto">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center ring-2 ring-white">
                        {user?.profile_picture ? (
                          <img src={`http://localhost:8000${user.profile_picture}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Plus size={20} className="text-primary-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 w-16 truncate">Your Story</p>
                  </label>
                </div>

                {stories.map((story) => (
                  <div key={story.id} className="flex-shrink-0 text-center">
                    <div className="story-ring w-16 h-16 mx-auto">
                      <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-white bg-gradient-brand">
                        {story.media_url ? (
                          <img src={`http://localhost:8000${story.media_url}`} alt="" className="w-full h-full object-cover" />
                        ) : story.author?.profile_picture ? (
                          <img src={`http://localhost:8000${story.author.profile_picture}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{story.author?.first_name?.[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 w-16 truncate">{story.author?.first_name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Post */}
            <div className="card">
              {!showCreatePost ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary-100 flex-shrink-0">
                    <img
                      src={user?.profile_picture ? `http://localhost:8000${user.profile_picture}` : `https://ui-avatars.com/api/?name=${user?.first_name || 'U'}+${user?.last_name || ''}&background=667eea&color=fff`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="flex-1 text-left bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl px-4 py-2.5 text-sm text-gray-400"
                  >
                    What's on your mind, {user?.first_name}?
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => { setShowCreatePost(true); setPostType('photo'); }} className="p-2 rounded-xl hover:bg-blue-50 text-blue-500 transition-colors">
                      <ImageIcon size={18} />
                    </button>
                    <button onClick={() => { setShowCreatePost(true); setPostType('video'); }} className="p-2 rounded-xl hover:bg-purple-50 text-purple-500 transition-colors">
                      <Film size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreatePost} className="animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full overflow-hidden">
                        <img
                          src={user?.profile_picture ? `http://localhost:8000${user.profile_picture}` : `https://ui-avatars.com/api/?name=${user?.first_name || 'U'}&background=667eea&color=fff`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{user?.first_name} {user?.last_name}</span>
                    </div>
                    <button type="button" onClick={() => setShowCreatePost(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Post type selector */}
                  <div className="flex gap-2 mb-3">
                    {[
                      { type: 'text', icon: <AlignLeft size={14} />, label: 'Text' },
                      { type: 'photo', icon: <ImageIcon size={14} />, label: 'Photo' },
                      { type: 'video', icon: <Film size={14} />, label: 'Video' },
                      { type: 'reel', icon: <FileVideo size={14} />, label: 'Reel' },
                    ].map(pt => (
                      <button
                        key={pt.type}
                        type="button"
                        onClick={() => setPostType(pt.type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          postType === pt.type
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {pt.icon} {pt.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder={`Share something${postType !== 'text' ? ` or add a caption` : ''}...`}
                    rows={3}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary-200 resize-none transition-all text-gray-700 placeholder-gray-400"
                  />

                  {/* File upload */}
                  {postType !== 'text' && (
                    <div className="mt-2">
                      <label className="block">
                        <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${selectedFile ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/50'}`}>
                          {previewUrl ? (
                            <div className="relative">
                              {postType === 'video' || postType === 'reel' ? (
                                <video src={previewUrl} className="max-h-48 mx-auto rounded-lg" controls />
                              ) : (
                                <img src={previewUrl} alt="" className="max-h-48 mx-auto rounded-lg object-contain" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setSelectedFile(null); setPreviewUrl(null); }}
                                className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">
                              {postType === 'video' || postType === 'reel' ? <Film size={24} className="mx-auto mb-1 text-purple-400" /> : <ImageIcon size={24} className="mx-auto mb-1 text-blue-400" />}
                              Click to upload {postType === 'video' || postType === 'reel' ? 'video' : 'image'}
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept={postType === 'video' || postType === 'reel' ? 'video/*' : 'image/*'}
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => setShowCreatePost(false)} className="btn-secondary flex-1 text-sm py-2">
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting || (!postContent.trim() && !selectedFile)} className="btn-primary flex-1 text-sm py-2 disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                      {submitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Posts Feed */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                        <div className="h-2 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-48 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="card text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Film size={28} className="text-gray-300" />
                </div>
                <h3 className="font-semibold text-gray-600 mb-1">No posts yet</h3>
                <p className="text-sm text-gray-400">Be the first to share something!</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                  ))}
                </div>

                {/* Diverse Content Section */}
                <div className="card">
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-brand rounded-full inline-block" />
                    Explore More Content
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {posts.filter(p => p.media_url).slice(0, 9).map(p => (
                      <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group cursor-pointer">
                        {isVideo(p.media_url || '') ? (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <Film size={20} className="text-white/60" />
                          </div>
                        ) : (
                          <img
                            src={`http://localhost:8000${p.media_url}`}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <span className="text-white text-xs flex items-center gap-1">❤️ {p.likes_count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {hasMore && (
                  <div className="text-center pb-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="btn-secondary text-sm flex items-center gap-2 mx-auto"
                    >
                      {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                      {loadingMore ? 'Loading...' : 'Load More Posts'}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
