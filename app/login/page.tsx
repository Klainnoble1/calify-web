'use client';

import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--calify-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '36px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', background: '#1a73e8',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Video size={20} color="white" />
        </div>
        <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--calify-text)' }}>
          Cali<span style={{ color: 'var(--calify-blue)' }}>fy</span>
        </span>
      </Link>

      {/* Card */}
      <div style={{
        background: 'var(--calify-surface)', border: '1px solid var(--calify-border)',
        borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>
          {isSignUp ? 'Create your account' : 'Sign in to Calify'}
        </h1>
        <p style={{ color: 'var(--calify-text-secondary)', fontSize: '13px', marginBottom: '28px' }}>
          {isSignUp
            ? 'Start calling, scheduling, and connecting.'
            : 'Welcome back! Enter your details to continue.'}
        </p>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--calify-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--calify-text-secondary)' }} />
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="calify-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--calify-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--calify-text-secondary)' }} />
              <input
                id="password-input"
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="calify-input"
                style={{ paddingLeft: '40px', paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--calify-text-secondary)', display: 'flex' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{ background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.25)', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#ea4335' }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ background: 'rgba(52,168,83,0.1)', border: '1px solid rgba(52,168,83,0.25)', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#34a853' }}>
              {message}
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="calify-btn calify-btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', borderRadius: '10px', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--calify-border)' }}>
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--calify-blue)', fontSize: '13px', fontWeight: '500' }}
          >
            {isSignUp ? 'Already have an account? Sign in →' : "Don't have an account? Sign up free →"}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--calify-text-secondary)', fontSize: '12px', marginTop: '20px', textAlign: 'center', maxWidth: '380px', lineHeight: '1.6' }}>
        By continuing, you agree to Calify&apos;s Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
