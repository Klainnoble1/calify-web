'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { generateRoomId } from '@/lib/client-utils';
import { createClient } from '@/utils/supabase/client';
import {
  Bot,
  Calendar,
  Check,
  ChevronRight,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Mic,
  Phone,
  PhoneCall,
  Shield,
  Video,
  Zap,
} from 'lucide-react';

function HomeContent() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, [supabase]);

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
      <nav className="calify-nav">
        <Link href="/" className="calify-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#1a73e8" />
            <path d="M8 10h8v2H8v-2zm0 4h8v2H8v-2zm10-6v12l4-3V7l-4-3z" fill="white" />
          </svg>
          Cali<span>fy</span>
        </Link>

        <div className="calify-nav-actions">
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
              <a href="/dashboard" className="calify-btn calify-btn-ghost" style={{ padding: '8px 14px', fontSize: '13px' }}>
                <LayoutDashboard size={15} /> Dashboard
              </a>
              <div className="calify-avatar" title={user.email}>
                {userInitial}
              </div>
              <button onClick={signOut} className="calify-btn calify-btn-ghost" style={{ padding: '8px' }}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="calify-btn calify-btn-ghost" style={{ fontSize: '13px' }}>
                Sign in
              </a>
              <a href="/login" className="calify-btn calify-btn-primary" style={{ fontSize: '13px' }}>
                Get started free
              </a>
            </>
          )}
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <div className="home-hero">
          <div className="animate-fade-in home-copy">
            <h1 className="home-title">
              Premium video calls &<br />
              <span style={{ color: 'var(--calify-blue)' }}>VoIP calling</span> for everyone
            </h1>
            <p className="home-subtitle">
              Schedule outbound calls, use AI agents, play prerecorded messages, and call any phone number worldwide - all from one platform.
            </p>

            <div className="home-actions">
              <button
                id="new-meeting-btn"
                onClick={startMeeting}
                disabled={loading}
                className="calify-btn calify-btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '15px', borderRadius: '10px' }}
              >
                <Video size={18} />
                {loading ? 'Starting...' : 'New meeting'}
              </button>

              <form onSubmit={joinMeeting} className="home-join-form">
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

          <div className="home-feature-list">
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
            ].map((feature) => (
              <div key={feature.title} className="calify-card home-feature-card">
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--calify-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {feature.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{feature.title}</span>
                    {feature.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: `${feature.badgeColor}18`,
                          color: feature.badgeColor,
                          border: `1px solid ${feature.badgeColor}30`,
                        }}
                      >
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--calify-text-secondary)', lineHeight: '1.5' }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="home-pricing-section">
          <div className="home-pricing-inner">
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Simple, transparent pricing</h2>
            <p style={{ color: 'var(--calify-text-secondary)', marginBottom: '36px', fontSize: '14px' }}>
              Calls billed per minute. No hidden fees.
            </p>

            <div className="home-pricing-grid">
              {[
                {
                  tier: 'Basic',
                  icon: <Shield size={20} />,
                  color: 'var(--calify-text-secondary)',
                  price: '$0',
                  sub: 'Free forever',
                  features: ['Outbound calls from IVR number', '$0.02/min call rate', 'Standard video meetings', 'Up to 100 participants'],
                  cta: 'Get started',
                  ctaStyle: 'calify-btn-secondary',
                  href: '/login',
                },
                {
                  tier: 'Premium',
                  icon: <Zap size={20} />,
                  color: '#fbbc04',
                  price: '$29',
                  sub: '/month',
                  features: ['Custom Caller ID (spoofing)', '$0.01/min call rate', 'Prerecorded voice notes', 'AI Call Agent', 'Priority support'],
                  cta: 'Upgrade now',
                  ctaStyle: 'calify-btn-primary',
                  href: '/login',
                },
              ].map((plan) => (
                <div
                  key={plan.tier}
                  className="calify-card home-plan-card"
                  style={{
                    border: plan.tier === 'Premium' ? '1px solid rgba(251,188,4,0.3)' : '1px solid var(--calify-border)',
                    background: plan.tier === 'Premium' ? 'rgba(251,188,4,0.03)' : 'var(--calify-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: plan.color }}>
                    {plan.icon}
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>{plan.tier}</span>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '800' }}>{plan.price}</span>
                    <span style={{ color: 'var(--calify-text-secondary)', fontSize: '14px' }}>{plan.sub}</span>
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {plan.features.map((feature) => (
                      <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--calify-text-secondary)' }}>
                        <Check size={15} style={{ color: '#34a853', flexShrink: 0 }} /> {feature}
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

      <footer>
        <span>(c) 2025 Calify - Powered by LiveKit - All rights reserved</span>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: 'var(--calify-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--calify-text-secondary)' }}>Loading Calify...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
