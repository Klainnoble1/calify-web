'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { requestPremiumTestAccess } from '@/lib/premium-test-client';
import { Video, Calendar, Phone, Clock, ArrowRight, PhoneCall, Bot, Zap, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, minutes: 0 });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const [profileRes, callsRes, logsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('scheduled_calls').select('*').eq('user_id', user.id).order('scheduled_at', { ascending: false }).limit(5),
        supabase.from('call_logs').select('duration_seconds, cost_cents').eq('user_id', user.id),
      ]);

      if (profileRes.data) {
        if (profileRes.data.subscription_tier !== 'premium' && await requestPremiumTestAccess()) {
          setProfile({ ...profileRes.data, subscription_tier: 'premium' });
        } else {
          setProfile(profileRes.data);
        }
      }
      if (callsRes.data) setRecentCalls(callsRes.data);
      if (logsRes.data) {
        const logs = logsRes.data;
        const totalMinutes = Math.round(logs.reduce((s: number, l: any) => s + (l.duration_seconds || 0), 0) / 60);
        setStats({
          total: logs.length,
          completed: callsRes.data?.filter((c: any) => c.status === 'completed').length || 0,
          pending: callsRes.data?.filter((c: any) => c.status === 'pending').length || 0,
          minutes: totalMinutes,
        });
      }
    });
  }, []);

  const isPremium = profile?.subscription_tier === 'premium';

  const statCards = [
    { label: 'Total Calls', value: stats.total, icon: <Phone size={20} />, color: '#1a73e8' },
    { label: 'Pending', value: stats.pending, icon: <Clock size={20} />, color: '#fbbc04' },
    { label: 'Completed', value: stats.completed, icon: <PhoneCall size={20} />, color: '#34a853' },
    { label: 'Minutes Used', value: stats.minutes, icon: <Clock size={20} />, color: '#9c27b0' },
  ];

  const statusColor: Record<string, string> = {
    pending: '#fbbc04', calling: '#1a73e8', completed: '#34a853',
    failed: '#ea4335', cancelled: '#9aa0a6',
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>
          Welcome back{profile?.email ? `, ${profile.email.split('@')[0]}` : ''} 👋
        </h1>
        <p style={{ color: 'var(--calify-text-secondary)', fontSize: '14px' }}>
          Here&apos;s a summary of your Calify activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <div key={s.label} style={{ background: 'var(--calify-surface)', border: '1px solid var(--calify-border)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--calify-text-secondary)', fontWeight: 500 }}>{s.label}</span>
              <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-action-grid">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div className="calify-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(26,115,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Video size={22} color="#1a73e8" />
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: '2px' }}>New Video Meeting</p>
              <p style={{ fontSize: '12px', color: 'var(--calify-text-secondary)' }}>Start an instant video call</p>
            </div>
            <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--calify-text-secondary)' }} />
          </div>
        </Link>

        <Link href="/dashboard/scheduler" style={{ textDecoration: 'none' }}>
          <div className="calify-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52,168,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={22} color="#34a853" />
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: '2px' }}>Schedule a Call</p>
              <p style={{ fontSize: '12px', color: 'var(--calify-text-secondary)' }}>Schedule phone calls</p>
            </div>
            <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--calify-text-secondary)' }} />
          </div>
        </Link>

        <Link href="/dashboard/contacts" style={{ textDecoration: 'none' }}>
          <div className="calify-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251,188,4,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={22} color="#fbbc04" />
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: '2px' }}>Add Contact</p>
              <p style={{ fontSize: '12px', color: 'var(--calify-text-secondary)' }}>Invite someone to join Calify</p>
            </div>
            <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--calify-text-secondary)' }} />
          </div>
        </Link>
      </div>

      {/* Premium Upsell (only for basic) */}
      {!isPremium && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(26,115,232,0.08) 0%, rgba(156,39,176,0.08) 100%)',
          border: '1px solid rgba(26,115,232,0.2)', borderRadius: '16px', padding: '24px',
          display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(251,188,4,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={26} color="#fbbc04" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, marginBottom: '4px', fontSize: '15px' }}>Unlock Premium features</p>
            <p style={{ fontSize: '13px', color: 'var(--calify-text-secondary)', lineHeight: '1.5' }}>
              Get Custom Caller ID, AI Call Agents, prerecorded voice notes, and 50% cheaper call rates.
            </p>
          </div>
          <Link href="/dashboard/settings#upgrade" className="calify-btn calify-btn-primary" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            Upgrade — $29/mo
          </Link>
        </div>
      )}

      {/* Recent Scheduled Calls */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Recent Scheduled Calls</h2>
          <Link href="/dashboard/scheduler" style={{ fontSize: '13px', color: '#1a73e8', textDecoration: 'none', fontWeight: 500 }}>
            View all →
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <div className="calify-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--calify-text-secondary)' }}>
            <Calendar size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '14px' }}>No calls scheduled yet.</p>
            <Link href="/dashboard/scheduler" className="calify-btn calify-btn-secondary" style={{ marginTop: '16px', display: 'inline-flex' }}>
              Schedule your first call
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentCalls.map((call) => (
              <div key={call.id} className="calify-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--calify-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {call.use_ai_agent ? <Bot size={16} color="#9c27b0" /> : <Phone size={16} color="#1a73e8" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{call.recipient_number}</p>
                  <p style={{ fontSize: '12px', color: 'var(--calify-text-secondary)' }}>
                    {new Date(call.scheduled_at).toLocaleString()}
                  </p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: `${statusColor[call.status]}15`, color: statusColor[call.status], border: `1px solid ${statusColor[call.status]}30`, textTransform: 'capitalize' }}>
                  {call.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
