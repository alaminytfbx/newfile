'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, Loader2, Mail, Lock, KeyRound } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

type LoginStep = 'credentials' | 'verify' | 'forgot' | 'reset';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [loading, setLoading] = useState(false);

  // Step 1
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Step 2
  const [sessionToken, setSessionToken] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [code, setCode] = useState('');

  // Forgot password
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      const res = await authAPI.login({ identifier, password });
      setSessionToken(res.data.session_token);
      setVerifyEmail(res.data.email);
      toast.success(res.data.message);
      setStep('verify');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error('Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await authAPI.loginVerify({
        identifier: identifier.includes('@') ? identifier : identifier,
        code,
        session_token: sessionToken,
      });
      setAuth(res.data.access_token, res.data.user);
      toast.success('Welcome back!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid code');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier) { toast.error('Enter your email or phone'); return; }
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ identifier: forgotIdentifier });
      toast.success(res.data.message);
      setStep('reset');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({
        identifier: forgotIdentifier,
        code: resetCode,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success('Password reset! Please login.');
      setStep('credentials');
      setForgotIdentifier('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Reset failed');
    }
    setLoading(false);
  };

  const handleResendLoginCode = async () => {
    try {
      await authAPI.sendCode(identifier, 'login');
      toast.success('New code sent!');
    } catch {
      toast.error('Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-3 shadow-button">
            <span className="text-white text-3xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your SocialConnect account</p>
        </div>

        <div className="card shadow-card-hover">
          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
              <h2 className="font-bold text-gray-800 text-lg">Sign In</h2>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Email or Phone</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="email@example.com or +1234567890"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="input-field pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pl-9 pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setStep('forgot')} className="text-sm text-primary-600 hover:underline">
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <Link href="/register" className="text-primary-600 font-semibold hover:underline">Create one</Link>
              </p>
            </form>
          )}

          {/* Step 2: Verify login code */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-5 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound size={28} className="text-primary-500" />
                </div>
                <h2 className="font-bold text-gray-800 text-lg">Verify Your Identity</h2>
                <p className="text-sm text-gray-500 mt-1">
                  A 6-digit code was sent to<br />
                  <strong className="text-gray-700">{verifyEmail}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block text-center">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center text-2xl font-bold tracking-[0.5em] py-4"
                />
                <p className="text-xs text-gray-400 text-center mt-1">Code valid for 15 minutes</p>
              </div>

              <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setStep('credentials')} className="btn-ghost text-sm flex items-center gap-1">
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="button" onClick={handleResendLoginCode} className="text-sm text-primary-600 hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password */}
          {step === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Lock size={28} className="text-yellow-500" />
                </div>
                <h2 className="font-bold text-gray-800 text-lg">Reset Password</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your email or phone to receive a reset code</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Email or Phone</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="email@example.com or +1234567890"
                    value={forgotIdentifier}
                    onChange={e => setForgotIdentifier(e.target.value)}
                    className="input-field pl-9"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>

              <button type="button" onClick={() => setStep('credentials')} className="btn-ghost w-full text-sm flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </form>
          )}

          {/* Reset Password */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
              <div className="text-center">
                <h2 className="font-bold text-gray-800 text-lg">Create New Password</h2>
                <p className="text-sm text-gray-500 mt-1">Enter the reset code and your new password</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Reset Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center text-xl font-bold tracking-[0.4em] py-3"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input-field pr-10"
                    required minLength={8}
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`input-field ${confirmPassword && newPassword !== confirmPassword ? 'ring-2 ring-red-300' : ''}`}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button type="button" onClick={() => setStep('forgot')} className="btn-ghost w-full text-sm flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
