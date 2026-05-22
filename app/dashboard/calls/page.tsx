'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Phone, Clock, PhoneOff, Bot, Mic, DollarSign, Filter } from 'lucide-react';

interface CallLog {
  id: string;
  recipient_number: string;
  caller_id_used: string | null;
  duration_seconds: number;
  cost_cents: number;
  ai_agent_used: boolean;
  started_at: string;
  ended_at: string | null;
}

export default function CallLogsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (data) {
        setLogs(data);
        setTotalCost(data.reduce((s, l) => s + (l.cost_cents || 0), 0));
        setTotalMinutes(Math.round(data.reduce((s, l) => s + (l.duration_seconds || 0), 0) / 60));
      }
      setLoading(false);
    });
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Call Logs</h1>
        <p style={{ color: 'var(--calify-text-secondary)', fontSize: '14px' }}>Full history of your phone calls and billing.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Calls', value: logs.length, icon: <Phone size={18} />, color: '#1a73e8' },
          { label: 'Total Minutes', value: `${totalMinutes} min`, icon: <Clock size={18} />, color: '#34a853' },
          { label: 'Total Spent', value: `$${(totalCost / 100).toFixed(2)}`, icon: <DollarSign size={18} />, color: '#fbbc04' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--calify-surface)', border: '1px solid var(--calify-border)', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--calify-text-secondary)', marginBottom: '2px' }}>{s.label}</p>
              <p style={{ fontSize: '22px', fontWeight: '700' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Logs table */}
      <div style={{ background: 'var(--calify-surface)', border: '1px solid var(--calify-border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--calify-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>All Calls ({logs.length})</span>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--calify-text-secondary)' }}>Loading call logs…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--calify-text-secondary)' }}>
            <PhoneOff size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '14px' }}>No calls yet. Schedule your first outbound call.</p>
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', padding: '10px 20px', background: 'var(--calify-surface-2)', fontSize: '11px', fontWeight: 600, color: 'var(--calify-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>Number</span><span>Date</span><span>Duration</span><span>Cost</span><span>Flags</span>
            </div>
            {logs.map((log) => (
              <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr', padding: '14px 20px', borderTop: '1px solid var(--calify-border)', alignItems: 'center', fontSize: '13px' }}>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: '2px' }}>{log.recipient_number}</p>
                  {log.caller_id_used && <p style={{ fontSize: '11px', color: 'var(--calify-text-secondary)' }}>ID: {log.caller_id_used}</p>}
                </div>
                <span style={{ color: 'var(--calify-text-secondary)', fontSize: '12px' }}>{new Date(log.started_at).toLocaleString()}</span>
                <span style={{ color: '#34a853', fontWeight: 500 }}>{formatDuration(log.duration_seconds || 0)}</span>
                <span style={{ color: '#fbbc04', fontWeight: 600 }}>${(log.cost_cents / 100).toFixed(3)}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {log.ai_agent_used && (
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(156,39,176,0.1)', color: '#9c27b0', border: '1px solid rgba(156,39,176,0.2)' }}>AI</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
