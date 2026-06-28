'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { userAPI } from '@/lib/api';
import { getProfileUrl } from '@/lib/auth';

interface SearchUser {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  followers_count: number;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await userAPI.searchUsers(q);
      setResults(res.data.slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (userId: number) => {
    router.push(`/profile/${userId}`);
    setQuery('');
    setResults([]);
    setFocused(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={`flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 transition-all ${focused ? 'bg-white ring-2 ring-primary-300 shadow-sm' : ''}`}>
        <Search size={16} className={`flex-shrink-0 transition-colors ${focused ? 'text-primary-500' : 'text-gray-400'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          placeholder="Search users by name..."
          className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 min-w-0"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0" />
        )}
        {query && !loading && (
          <button onClick={handleClear} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {focused && (results.length > 0 || (query && !loading)) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-card-hover border border-gray-100 overflow-hidden z-50 animate-slide-down">
          {results.length === 0 && query ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No users found for "{query}"
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(u.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-brand">
                  <img
                    src={u.profile_picture || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=667eea&color=fff`}
                    alt={u.first_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=667eea&color=fff`; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-gray-400">{u.followers_count} followers</p>
                </div>
                <Search size={12} className="text-gray-300 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
