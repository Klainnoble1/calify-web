'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { Suspense, useState, useEffect } from 'react';
import { generateRoomId, encodePassphrase, randomString } from '@/lib/client-utils';
import { createClient } from '@/utils/supabase/client';
import {
  Video, Phone, Calendar, ChevronRight, LogOut,
  Shield, Zap, Mic, Users, Clock, PhoneCall,
  Plus, Link as LinkIcon, Bot, Star
} from 'lucide-react';

function HomeContent() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from('users').select('*').eq('id', user.id).single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, []);

  const startMeeting = () => {
    setLoading(true);
    router.push(`/rooms/${generateRoomId()}`);
  };

  const joinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) router.push(`/rooms/${joinCode.trim()}`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isPremium = profile?.subscription_tier === 'premium';
  const userInitial = (user?.email?.[0] || 'G').toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--calify-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top Navigation */}
      <nav className="calify-nav">
        <Link href="/" className="calify-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#1a73e8"/>
            <path d="M8 10h8v2H8v-2zm0 4h8v2H8v-2zm10-6v12l4-3V7l-4-3z" fill="white"/>
          </svg>
          Cali<span>fy</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              {isPremium && (
                <span className="calify-badge calify-badge-premium">
                  <Zap size={11} /> Premium
                </span>
              )}
              <a href="/dashboard/scheduler" className="calify-btn calify-btn-ghost" style={{ padding: '8px 14px', fontSize: '13px' }}>
                <Calendar size={15} /> Scheduler
              </a>
              <div className="calify-avatar" title={user.email}>{userInitial}</div>
              <button onClick={signOut} className="calify-btn calify-btn-ghost" style={{ padding: '8px' }}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="calify-btn calify-btn-ghost" style={{ fontSize: '13px' }}>Sign in</a>
              <a href="/login" className="calify-btn calify-btn-primary" style={{ fontSize: '13px' }}>Get started free</a>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto', padding: '60px 24px 40px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center'
        }}>

          {/* Left: Hero Text + Actions */}
          <div className="animate-fade-in">
            <h1 style={{
              fontSize: '48px', fontWeight: '800', lineHeight: '1.1',
              letterSpacing: '-1.5px', marginBottom: '20px', color: 'var(--calify-text)'
            }}>
              Premium video calls &<br />
              <span style={{ color: 'var(--calify-blue)' }}>VoIP calling</span> for everyone
            </h1>
            <p style={{
              fontSize: '17px', color: 'var(--calify-text-secondary)', lineHeight: '1.6',
              marginBottom: '36px', maxWidth: '440px'
            }}>
              Schedule outbound calls, use AI agents, play prerecorded messages, and call
              any phone number worldwide — all from one platform.
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
              <button
                id="new-meeting-btn"
                onClick={startMeeting}
                disabled={loading}
                className="calify-btn calify-btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '15px', borderRadius: '10px' }}
              >
                <Video size={18} />
                {loading ? 'Starting…' : 'New meeting'}
              </button>

              <form onSubmit={joinMeeting} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <LinkIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--calify-text-secondary)' }} />
                  <input
                    id="join-code-input"
                    className="calify-input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="Enter a code or link"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                </div>
                <button
                  id="join-meeting-btn"
                  type="submit"
                  className="calify-btn calify-btn-secondary"
                  disabled={!joinCode.trim()}
                  style={{ opacity: joinCode.trim() ? 1 : 0.4 }}
                >
                  Join
                </button>
              </form>

              <div style={{ height: '1px', background: 'var(--calify-border)', margin: '4px 0' }} />

              <a
                href="/dashboard/scheduler"
                id="scheduler-link"
                className="calify-btn calify-btn-secondary"
                style={{ justifyContent: 'center', padding: '13px 20px', fontSize: '14px', borderRadius: '10px' }}
              >
                <PhoneCall size={16} />
                Schedule a PSTN call
                <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--calify-text-secondary)' }} />
              </a>
            </div>
          </div>

          {/* Right: Feature cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                icon: <Bot size={22} style={{ color: '#1a73e8' }} />,
                title: 'AI Call Agent',
                desc: 'Let an AI handle your outbound calls with natural conversation.',
                badge: 'Premium',
                badgeColor: '#fbbc04',
              },
              {
                icon: <Phone size={22} style={{ color: '#34a853' }} />,
                title: 'PSTN Outbound',
                desc: 'Call any mobile or landline from your browser. Internet to any phone.',
                badge: null,
              },
              {
                icon: <Mic size={22} style={{ color: '#9c27b0' }} />,
                title: 'Prerecorded Voice',
                desc: 'Upload a voice note and broadcast it to hundreds of numbers.',
                badge: 'Premium',
                badgeColor: '#fbbc04',
              },
              {
                icon: <Shield size={22} style={{ color: '#ea4335' }} />,
                title: 'Custom Caller ID',
                desc: 'Choose what number recipients see when you call.',
                badge: 'Premium',
                badgeColor: '#fbbc04',
              },
            ].map((f, i) => (
              <div key={i} className="calify-card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '18px 20px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'var(--calify-surface-2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {f.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{f.title}</span>
                    {f.badge && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                        borderRadius: '999px', background: `${f.badgeColor}18`,
                        color: f.badgeColor, border: `1px solid ${f.badgeColor}30`
                      }}>{f.badge}</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--calify-text-secondary)', lineHeight: '1.5' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Banner */}
        <div style={{ background: 'var(--calify-surface)', borderTop: '1px solid var(--calify-border)', padding: '40px 24px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Simple, transparent pricing</h2>
            <p style={{ color: 'var(--calify-text-secondary)', marginBottom: '36px', fontSize: '14px' }}>Calls billed per minute. No hidden fees.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '640px', margin: '0 auto' }}>
              {[
                {
                  tier: 'Basic', icon: <Shield size={20} />, color: 'var(--calify-text-secondary)',
                  price: '$0', sub: 'Free forever',
                  features: ['Outbound calls from IVR number', '$0.02/min call rate', 'Standard video meetings', 'Up to 100 participants'],
                  cta: 'Get started', ctaStyle: 'calify-btn-secondary', href: '/login',
                },
                {
                  tier: 'Premium', icon: <Zap size={20} />, color: '#fbbc04',
                  price: '$29', sub: '/month',
                  features: ['Custom Caller ID (spoofing)', '$0.01/min call rate', 'Prerecorded voice notes', 'AI Call Agent', 'Priority support'],
                  cta: 'Upgrade now', ctaStyle: 'calify-btn-primary', href: '/login',
                },
              ].map((plan) => (
                <div key={plan.tier} className="calify-card" style={{
                  textAlign: 'left', padding: '28px',
                  border: plan.tier === 'Premium' ? '1px solid rgba(251,188,4,0.3)' : '1px solid var(--calify-border)',
                  background: plan.tier === 'Premium' ? 'rgba(251,188,4,0.03)' : 'var(--calify-surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: plan.color }}>
                    {plan.icon}
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>{plan.tier}</span>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '800' }}>{plan.price}</span>
                    <span style={{ color: 'var(--calify-text-secondary)', fontSize: '14px' }}>{plan.sub}</span>
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--calify-text-secondary)' }}>
                        <span style={{ color: '#34a853', fontSize: '16px', lineHeight: 1 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <a href={plan.href} className={`calify-btn ${plan.ctaStyle}`} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer>
        <span>© 2025 Calify · Powered by LiveKit · All rights reserved</span>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--calify-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--calify-text-secondary)' }}>Loading Calify…</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
