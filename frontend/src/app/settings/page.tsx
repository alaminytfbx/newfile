'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { userAPI } from '@/lib/api';
import { getUser, isAuthenticated, setAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', bio: '',
    location: '', hobbies: '', education: '',
    date_of_birth: '', age: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const u = getUser();
    setUser(u);
    if (u) {
      setFormData({
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        bio: u.bio || '',
        location: u.location || '',
        hobbies: u.hobbies || '',
        education: u.education || '',
        date_of_birth: u.date_of_birth || '',
        age: u.age?.toString() || '',
      });
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await userAPI.updateMe({
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
      });
      const currentToken = localStorage.getItem('token') || '';
      setAuth(currentToken, { ...user, ...res.data });
      setUser({ ...user, ...res.data });
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="h-28" />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Account Settings</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">First Name</label>
                <input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Last Name</label>
                <input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="input-field" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Bio</label>
              <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="input-field" rows={3} placeholder="Tell the world about yourself..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Location</label>
                <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="input-field" placeholder="City, Country" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Education</label>
                <input value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} className="input-field" placeholder="University / School" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Hobbies</label>
              <input value={formData.hobbies} onChange={e => setFormData({...formData, hobbies: e.target.value})} className="input-field" placeholder="Reading, Photography..." />
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
