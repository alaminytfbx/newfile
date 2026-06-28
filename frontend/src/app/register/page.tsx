'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, Loader2, Mail, Phone, User, Calendar, UserCheck } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

type Step = 'details' | 'verify-email' | 'set-password' | 'done';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);

  // Step 1
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    date_of_birth: '', age: '', gender: ''
  });

  // Step 2
  const [emailCode, setEmailCode] = useState('');

  // Step 3
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone || !formData.date_of_birth || !formData.age || !formData.gender) {
      toast.error('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await authAPI.registerInitiate({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        age: parseInt(formData.age),
        gender: formData.gender,
      });
      toast.success('Verification code sent to your email!');
      setStep('verify-email');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailCode.length !== 6) { toast.error('Enter 6-digit code'); return; }
    setLoading(true);
    try {
      await authAPI.verifyCode({
        identifier: formData.email,
        code: emailCode,
        purpose: 'registration',
      });
      toast.success('Email verified!');
      setStep('set-password');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid code');
    }
    setLoading(false);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await authAPI.registerFinalize({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        age: parseInt(formData.age),
        gender: formData.gender,
        password,
      });
      setAuth(res.data.access_token, res.data.user);
      toast.success('Account created! Welcome to SocialConnect!');
      setStep('done');
      setTimeout(() => router.push('/'), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create account');
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    try {
      await authAPI.sendCode(formData.email, 'registration');
      toast.success('Code resent!');
    } catch {
      toast.error('Failed to resend code');
    }
  };

  const steps = [
    { key: 'details', label: 'Details' },
    { key: 'verify-email', label: 'Verify' },
    { key: 'set-password', label: 'Password' },
  ];

  const currentStepIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-3 shadow-button">
            <span className="text-white text-3xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join SocialConnect today</p>
        </div>

        {/* Progress Steps */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
                  idx < currentStepIdx ? 'bg-green-500 text-white' :
                  idx === currentStepIdx ? 'bg-gradient-brand text-white shadow-button' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {idx < currentStepIdx ? <Check size={14} /> : idx + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${idx === currentStepIdx ? 'text-primary-600' : 'text-gray-400'}`}>{s.label}</span>
                {idx < steps.length - 1 && <div className={`w-8 h-0.5 rounded ${idx < currentStepIdx ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="card shadow-card-hover">
          {/* Step 1: Personal Details */}
          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4 animate-fade-in">
              <h2 className="font-bold text-gray-800 text-lg">Personal Information</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">First Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="John" value={formData.first_name}
                      onChange={e => setFormData({...formData, first_name: e.target.value})}
                      className="input-field pl-9 text-sm" required />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Last Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Doe" value={formData.last_name}
                      onChange={e => setFormData({...formData, last_name: e.target.value})}
                      className="input-field pl-9 text-sm" required />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="john@example.com" value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="input-field pl-9" required />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone Number</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" placeholder="+1 234 567 8900" value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="input-field pl-9" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Date of Birth</label>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="date" value={formData.date_of_birth}
                      onChange={e => setFormData({...formData, date_of_birth: e.target.value})}
                      className="input-field pl-9 text-sm" required />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Age</label>
                  <input type="number" placeholder="25" min="13" max="120" value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                    className="input-field text-sm" required />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Gender</label>
                <div className="relative">
                  <UserCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                    className="input-field pl-9 appearance-none" required>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? 'Sending code...' : 'Continue'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {/* Step 2: Verify Email */}
          {step === 'verify-email' && (
            <form onSubmit={handleVerifyEmail} className="space-y-5 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Mail size={28} className="text-primary-500" />
                </div>
                <h2 className="font-bold text-gray-800 text-lg">Check Your Email</h2>
                <p className="text-sm text-gray-500 mt-1">
                  We sent a 6-digit code to<br />
                  <strong className="text-gray-700">{formData.email}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block text-center">Enter Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center text-2xl font-bold tracking-[0.5em] py-4"
                />
                <p className="text-xs text-gray-400 text-center mt-1">Code valid for 15 minutes</p>
              </div>

              <button type="submit" disabled={loading || emailCode.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setStep('details')} className="btn-ghost text-sm flex items-center gap-1">
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" onClick={handleResendCode} className="text-sm text-primary-600 hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Set Password */}
          {step === 'set-password' && (
            <form onSubmit={handleSetPassword} className="space-y-4 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Check size={28} className="text-green-500" />
                </div>
                <h2 className="font-bold text-gray-800 text-lg">Set Your Password</h2>
                <p className="text-sm text-gray-500 mt-1">Create a strong password for your account</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-10"
                    required minLength={8}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5 flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                        password.length >= i * 2 + 4
                          ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-yellow-400' : i <= 3 ? 'bg-blue-400' : 'bg-green-400'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`input-field pr-10 ${confirmPassword && password !== confirmPassword ? 'ring-2 ring-red-300 border-red-300' : ''}`}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={loading || !password || password !== confirmPassword} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <button type="button" onClick={() => setStep('verify-email')} className="btn-ghost w-full text-sm flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
            </form>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="text-center space-y-4 animate-fade-in py-4">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <Check size={40} className="text-green-500" />
              </div>
              <h2 className="font-bold text-gray-800 text-xl">Welcome to SocialConnect!</h2>
              <p className="text-gray-500 text-sm">Your account has been created successfully.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                Redirecting you to the feed...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
