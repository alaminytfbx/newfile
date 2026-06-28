'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Trash2, Send, MoreHorizontal, Film, Image as ImageIcon, FileText } from 'lucide-react';
import { postAPI } from '@/lib/api';
import { getUser } from '@/lib/auth';
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
  author?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
}

interface Props {
  post: Post;
  onDelete?: (id: number) => void;
}

export default function PostCard({ post, onDelete }: Props) {
  const [liked, setLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const currentUser = getUser();

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleLike = async () => {
    if (!currentUser) { toast.error('Please login to like posts'); return; }
    try {
      const res = await postAPI.likePost(post.id);
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await postAPI.getComments(post.id);
        setComments(res.data);
      } catch {}
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    setSubmittingComment(true);
    try {
      const res = await postAPI.addComment(post.id, newComment.trim());
      setComments(prev => [...prev, res.data]);
      setCommentsCount(prev => prev + 1);
      setNewComment('');
    } catch {
      toast.error('Failed to add comment');
    }
    setSubmittingComment(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await postAPI.deletePost(post.id);
      onDelete?.(post.id);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const getPostTypeIcon = () => {
    if (post.post_type === 'video' || post.post_type === 'reel') return <Film size={12} className="text-purple-500" />;
    if (post.post_type === 'photo') return <ImageIcon size={12} className="text-blue-500" />;
    return <FileText size={12} className="text-gray-500" />;
  };

  const isVideo = post.media_url && (post.media_url.endsWith('.mp4') || post.media_url.endsWith('.mov') || post.media_url.endsWith('.webm') || post.post_type === 'video' || post.post_type === 'reel');

  return (
    <div className="card hover:shadow-card-hover transition-shadow animate-fade-in">
      {/* Post Header */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/profile/${post.author?.id}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary-200 transition-all">
            <img
              src={post.author?.profile_picture || `https://ui-avatars.com/api/?name=${post.author?.first_name}+${post.author?.last_name}&background=667eea&color=fff`}
              alt={post.author?.first_name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${post.author?.first_name}&background=667eea&color=fff`; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">
                {post.author?.first_name} {post.author?.last_name}
              </p>
              <div className="flex items-center gap-1 bg-gray-100 rounded-md px-1.5 py-0.5">
                {getPostTypeIcon()}
                <span className="text-[10px] text-gray-500 capitalize">{post.post_type}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {currentUser?.id === post.user_id && (
            <button onClick={handleDelete} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-gray-700 text-sm mb-3 leading-relaxed">{post.content}</p>
      )}

      {/* Media */}
      {post.media_url && (
        <div className="mb-3 rounded-xl overflow-hidden bg-gray-100">
          {isVideo ? (
            <video
              src={`http://localhost:8000${post.media_url}`}
              controls
              className="w-full max-h-[400px] object-contain"
              preload="metadata"
            />
          ) : (
            <img
              src={`http://localhost:8000${post.media_url}`}
              alt="Post media"
              className="w-full max-h-[400px] object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center justify-between py-2 border-y border-gray-100 my-2">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span className="bg-red-100 text-red-500 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">❤️</span>
          <span>{likesCount}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><MessageCircle size={12} /> {commentsCount}</span>
          <span className="flex items-center gap-1"><Eye size={12} /> {post.views_count}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${
            liked ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Heart size={16} className={liked ? 'fill-current' : ''} />
          {liked ? 'Liked' : 'Like'}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all"
        >
          <MessageCircle size={16} />
          Comment
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {loadingComments ? (
            <div className="flex justify-center py-3">
              <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={c.author?.profile_picture || `https://ui-avatars.com/api/?name=${c.author?.first_name}&background=667eea&color=fff&size=28`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${c.author?.first_name}&background=667eea&color=fff`; }}
                  />
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-gray-700">{c.author?.first_name} {c.author?.last_name}</p>
                  <p className="text-sm text-gray-600">{c.content}</p>
                </div>
              </div>
            ))
          )}

          {currentUser && (
            <form onSubmit={handleAddComment} className="flex gap-2 mt-2">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                <img
                  src={currentUser.profile_picture || `https://ui-avatars.com/api/?name=${currentUser.first_name}&background=667eea&color=fff&size=28`}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${currentUser.first_name}&background=667eea&color=fff`; }}
                />
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary-200 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="w-9 h-9 bg-primary-500 text-white rounded-xl flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
