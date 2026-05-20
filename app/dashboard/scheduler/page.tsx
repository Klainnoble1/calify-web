'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Calendar, Phone, Clock, Mic, UserCheck, Plus, Trash2,
  Send, ShieldCheck, LogOut, RefreshCw, AlertCircle, Zap
} from 'lucide-react';

interface ScheduledCall {
  id: string;
  recipient_number: string;
  scheduled_at: string;
  voice_note_url: string | null;
  use_ai_agent: boolean;
  caller_id: string | null;
  status: string;
}

interface UserProfile {
  email: string;
  subscription_tier: 'free' | 'premium';
}

export default function SchedulerPage() {
  const supabase = createClient();
  const router = useRouter();

  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newNumber, setNewNumber] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newCallerId, setNewCallerId] = useState('');
  const [useVoiceNote, setUseVoiceNote] = useState(false);
  const [useAIAgent, setUseAIAgent] = useState(false);

  const isPremium = profile?.subscription_tier === 'premium';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const [profileRes, callsRes] = await Promise.all([
      supabase.from('users').select('email, subscription_tier').eq('id', user.id).single(),
      fetch('/api/scheduler'),
    ]);

    if (profileRes.data) setProfile(profileRes.data as UserProfile);
    if (callsRes.ok) setCalls(await callsRes.json());
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addCall = async () => {
    if (!newNumber || !newTime) return;
    setSaving(true);
    setError(null);

    const resp = await fetch('/api/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_number: newNumber,
        scheduled_at: new Date(newTime).toISOString(),
        caller_id: isPremium ? newCallerId || null : null,
        voice_note_url: useVoiceNote ? 'placeholder-url' : null,
        use_ai_agent: useAIAgent,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      setError(data.error || 'Failed to schedule call');
    } else {
      setCalls((prev) => [...prev, data]);
      setNewNumber('');
      setNewTime('');
      setNewCallerId('');
      setUseVoiceNote(false);
      setUseAIAgent(false);
    }
    setSaving(false);
  };

  const removeCall = async (id: string) => {
    await fetch('/api/scheduler', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setCalls((prev) => prev.filter((c) => c.id !== id));
  };

  const statusColor: Record<string, string> = {
    pending: '#fbbc04',
    calling: '#1a73e8',
    completed: '#34a853',
    failed: '#ea4335',
    cancelled: '#9aa0a6',
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>Call Scheduler</h1>
          <p style={{ color: 'var(--calify-text-secondary)', fontSize: '14px' }}>Queue up automated outbound PSTN calls.</p>
        </div>
        <button onClick={fetchData} className="calify-btn calify-btn-ghost" style={{ padding: '8px' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.2)', borderRadius: '12px', color: '#ea4335', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left Col: Add Form */}
        <div className="calify-card" style={{ alignSelf: 'flex-start' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#1a73e8" /> New Scheduled Call
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--calify-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recipient Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--calify-text-secondary)' }} />
                <input className="calify-input" style={{ paddingLeft: '40px' }} placeholder="+1 234 567 8900" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--calify-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schedule Time</label>
              <div style={{ position: 'relative' }}>
                <Clock size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--calify-text-secondary)' }} />
                <input type="datetime-local" className="calify-input" style={{ paddingLeft: '40px', colorScheme: 'dark' }} value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
            </div>

            {isPremium && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--calify-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Custom Caller ID <span style={{ color: '#fbbc04' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--calify-text-secondary)' }} />
                  <input className="calify-input" style={{ paddingLeft: '40px' }} placeholder="Optional (e.g. +1 000 000 0000)" value={newCallerId} onChange={(e) => setNewCallerId(e.target.value)} />
                </div>
              </div>
            )}

            <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--calify-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: isPremium ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mic size={16} color={useVoiceNote && isPremium ? "#1a73e8" : "var(--calify-text-secondary)"} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>Prerecorded Voice</p>
                    {!isPremium && <p style={{ fontSize: '10px', color: '#fbbc04', fontWeight: 700, margin: 0 }}>PREMIUM</p>}
                  </div>
                </div>
                <input type="checkbox" checked={useVoiceNote} disabled={!isPremium} onChange={(e) => setUseVoiceNote(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#1a73e8' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: isPremium ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color={useAIAgent && isPremium ? "#9c27b0" : "var(--calify-text-secondary)"} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>AI Call Agent</p>
                    {!isPremium && <p style={{ fontSize: '10px', color: '#fbbc04', fontWeight: 700, margin: 0 }}>PREMIUM</p>}
                  </div>
                </div>
                <input type="checkbox" checked={useAIAgent} disabled={!isPremium} onChange={(e) => setUseAIAgent(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#9c27b0' }} />
              </div>
            </div>

            <button onClick={addCall} disabled={saving || !newNumber || !newTime} className="calify-btn calify-btn-primary" style={{ marginTop: '16px', width: '100%', justifyContent: 'center', padding: '14px', opacity: (saving || !newNumber || !newTime) ? 0.6 : 1 }}>
              {saving ? 'Scheduling…' : <><Calendar size={16} /> Add to Queue</>}
            </button>
          </div>
        </div>

        {/* Right Col: Queue */}
        <div className="calify-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} color="#34a853" /> Call Queue
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--calify-text-secondary)', fontWeight: 500 }}>{calls.length} scheduled</span>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--calify-text-secondary)' }}>Loading calls…</div>
          ) : calls.length === 0 ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--calify-text-secondary)' }}>
              <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--calify-text)' }}>No calls scheduled yet</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Fill out the form to add a call to your queue.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
              {calls.map((call) => (
                <div key={call.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--calify-surface-2)', borderRadius: '12px', border: '1px solid var(--calify-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--calify-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Phone size={18} color="#1a73e8" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: 'var(--calify-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{call.recipient_number}</p>
                      <p style={{ fontSize: '12px', color: 'var(--calify-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {new Date(call.scheduled_at).toLocaleString()}
                        {call.caller_id && <span style={{ marginLeft: '6px', color: '#9aa0a6' }}>ID: {call.caller_id}</span>}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: `${statusColor[call.status]}15`, color: statusColor[call.status], border: `1px solid ${statusColor[call.status]}30`, textTransform: 'capitalize' }}>
                        {call.status}
                      </span>
                      {call.voice_note_url && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(26,115,232,0.1)', color: '#1a73e8', border: '1px solid rgba(26,115,232,0.2)' }}>VOICE</span>}
                      {call.use_ai_agent && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(156,39,176,0.1)', color: '#9c27b0', border: '1px solid rgba(156,39,176,0.2)' }}>AI</span>}
                    </div>
                    <button onClick={() => removeCall(call.id)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--calify-text-secondary)', display: 'flex', borderRadius: '6px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--calify-surface-2)', borderRadius: '12px', fontSize: '12px', color: 'var(--calify-text-secondary)', lineHeight: '1.5' }}>
            <strong style={{ color: 'var(--calify-text)' }}>Pricing:</strong> Basic calls cost $0.02/min. Premium calls cost $0.01/min. AI Agents add a $0.05 base fee per call. Calls are automatically executed at the scheduled time.
          </div>
        </div>
      </div>
    </div>
  );
}
