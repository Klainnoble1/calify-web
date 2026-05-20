'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Zap, Shield, Phone, Key, Bell, ChevronRight, Check, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ivrNumber, setIvrNumber] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setIvrNumber(data.ivr_number || '');
        setFullName(data.full_name || '');
      }
    });
  }, []);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('users').update({ full_name: fullName, ivr_number: ivrNumber }).eq('id', user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleUpgrade = async () => {
    const resp = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, email: user?.email }),
    });
    const data = await resp.json();
    if (data.url) window.location.href = data.url;
  };

  const isPremium = profile?.subscription_tier === 'premium';

  return (
    <div style={{ padding: '32px', maxWidth: '700px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: 'var(--calify-text-secondary)', fontSize: '14px' }}>Manage your account, subscription, and calling preferences.</p>
      </div>

      {/* Subscription */}
      <div id="upgrade" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '12px', color: 'var(--calify-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subscription</h2>
        <div style={{
          background: isPremium ? 'rgba(251,188,4,0.04)' : 'var(--calify-surface)',
          border: isPremium ? '1px solid rgba(251,188,4,0.25)' : '1px solid var(--calify-border)',
          borderRadius: '16px', padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isPremium ? 'rgba(251,188,4,0.1)' : 'var(--calify-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPremium ? <Zap size={22} color="#fbbc04" /> : <Shield size={22} color="var(--calify-text-secondary)" />}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>
                {isPremium ? 'Premium Plan' : 'Basic Plan'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--calify-text-secondary)' }}>
                {isPremium ? 'You have access to all Premium features.' : 'Upgrade to unlock AI Agents, custom Caller ID, and more.'}
              </p>
            </div>
          </div>

          {isPremium ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {['Custom Caller ID', 'AI Call Agent', 'Prerecorded Voice', '$0.01/min rate'].map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--calify-text-secondary)' }}>
                  <Check size={14} color="#34a853" /> {f}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                {[
                  { f: 'Custom Caller ID', locked: true },
                  { f: 'AI Call Agent', locked: true },
                  { f: 'Prerecorded Voice', locked: true },
                  { f: '$0.01/min rate', locked: true },
                  { f: 'Standard video meetings', locked: false },
                  { f: '$0.02/min call rate', locked: false },
                ].map(({ f, locked }) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: locked ? 'var(--calify-text-secondary)' : '#e8eaed', opacity: locked ? 0.5 : 1 }}>
                    <Check size={14} color={locked ? '#9aa0a6' : '#34a853'} /> {f}
                  </div>
                ))}
              </div>
              <button onClick={handleUpgrade} className="calify-btn calify-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', borderRadius: '10px' }}>
                <Zap size={16} /> Upgrade to Premium — $29/month
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '12px', color: 'var(--calify-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profile</h2>
        <div style={{ background: 'var(--calify-surface)', border: '1px solid var(--calify-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--calify-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Display Name</label>
            <input className="calify-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--calify-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
            <input className="calify-input" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <button onClick={saveProfile} disabled={saving} className="calify-btn calify-btn-secondary" style={{ alignSelf: 'flex-start', minWidth: '120px' }}>
            {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : saved ? <><Check size={14} color="#34a853" /> Saved!</> : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Calling Preferences */}
      <div>
        <h2 style={{ fontSize: '11px', fontWeight: '600', marginBottom: '12px', color: 'var(--calify-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VoIP / Calling</h2>
        <div style={{ background: 'var(--calify-surface)', border: '1px solid var(--calify-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--calify-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your IVR Number</label>
              {!isPremium && <span style={{ fontSize: '10px', color: '#fbbc04', fontWeight: 700 }}>Basic</span>}
            </div>
            <input className="calify-input" value={ivrNumber} onChange={(e) => setIvrNumber(e.target.value)} placeholder="+1 234 567 8900 (assigned by Calify)" />
            <p style={{ fontSize: '11px', color: 'var(--calify-text-secondary)', marginTop: '6px' }}>
              {isPremium ? 'Premium users can override this with a custom Caller ID per call.' : 'Basic users always call from this number. Upgrade to use a custom Caller ID.'}
            </p>
          </div>
          <div style={{ padding: '14px', background: 'var(--calify-surface-2)', borderRadius: '10px', border: '1px solid var(--calify-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>SIP Trunking</p>
                <p style={{ fontSize: '12px', color: 'var(--calify-text-secondary)' }}>
                  Connected to <code style={{ fontSize: '11px', background: 'var(--calify-surface-3)', padding: '1px 6px', borderRadius: '4px' }}>sip:1xds14kbhxr.sip.livekit.cloud</code>
                </p>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(52,168,83,0.1)', color: '#34a853', border: '1px solid rgba(52,168,83,0.2)', fontWeight: 600 }}>Active</span>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="calify-btn calify-btn-secondary" style={{ alignSelf: 'flex-start', minWidth: '120px' }}>
            {saving ? 'Saving…' : saved ? <><Check size={14} color="#34a853" /> Saved!</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
