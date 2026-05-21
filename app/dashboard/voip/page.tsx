'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, CheckCircle2, Phone, RadioTower, RefreshCw, Shield, Zap } from 'lucide-react';

interface SipStatus {
  ready: boolean;
  missing: string[];
  defaultSipNumberConfigured: boolean;
}

export default function VoipPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<SipStatus | null>(null);
  const [recipientNumber, setRecipientNumber] = useState('');
  const [callerId, setCallerId] = useState('');
  const [useAiAgent, setUseAiAgent] = useState(false);
  const [calling, setCalling] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    const [{ data: { user } }, statusRes] = await Promise.all([
      supabase.auth.getUser(),
      fetch('/api/sip/status'),
    ]);

    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setCallerId(data.ivr_number || '');
      }
    }

    if (statusRes.ok) {
      setStatus(await statusRes.json());
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isPremium = profile?.subscription_tier === 'premium';

  const startCall = async () => {
    setCalling(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/sip/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientNumber,
          callerId,
          useAiAgent,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start VoIP call');
      }

      setRecipientNumber('');
      setMessage(`${data.message}. Room: ${data.roomName}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>VoIP Calling</h1>
          <p>Dial phone numbers through the configured LiveKit SIP trunk. Internet voice/video remains the default for Calify users.</p>
        </div>
        <button onClick={loadData} className="calify-btn calify-btn-ghost" style={{ padding: '8px' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {message && (
        <div className="notice notice-success">
          <CheckCircle2 size={18} /> {message}
        </div>
      )}
      {error && (
        <div className="notice notice-error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="voip-grid">
        <div className="calify-card contact-form-card">
          <h2>
            <Phone size={18} color="#1a73e8" /> Start phone call
          </h2>

          <label className="form-label">Recipient phone number</label>
          <input
            className="calify-input"
            value={recipientNumber}
            onChange={(event) => setRecipientNumber(event.target.value)}
            placeholder="+1 555 123 4567"
            type="tel"
          />

          <label className="form-label">Caller ID</label>
          <input
            className="calify-input"
            value={callerId}
            onChange={(event) => setCallerId(event.target.value)}
            placeholder="+1 234 567 8900"
            type="tel"
            disabled={!isPremium}
            style={{ opacity: isPremium ? 1 : 0.65 }}
          />
          <p className="form-help">
            {isPremium ? 'Premium users can set caller ID per call.' : 'Basic users call from their assigned IVR/default SIP number.'}
          </p>

          <label className={`bulk-contact-option ${!isPremium ? 'disabled' : ''}`} style={{ marginTop: 4 }}>
            <input
              type="checkbox"
              checked={useAiAgent}
              disabled={!isPremium}
              onChange={(event) => setUseAiAgent(event.target.checked)}
            />
            <span>
              <strong>AI call agent</strong>
              <small>Premium only. Adds an AI assistant to supported call flows.</small>
            </span>
          </label>

          <button
            onClick={startCall}
            disabled={calling || !recipientNumber.trim() || status?.ready === false}
            className="calify-btn calify-btn-primary"
            style={{ justifyContent: 'center', opacity: (calling || !recipientNumber.trim() || status?.ready === false) ? 0.6 : 1 }}
          >
            {calling ? 'Calling...' : <><Phone size={16} /> Start VoIP call</>}
          </button>
        </div>

        <div className="calify-card">
          <div className="card-title-row">
            <h2>
              <RadioTower size={18} color="#34a853" /> SIP readiness
            </h2>
            <span className={status?.ready ? 'sip-status-ready' : 'sip-status-missing'}>
              {status?.ready ? 'Ready' : 'Needs setup'}
            </span>
          </div>

          <div className="voip-status-list">
            <div>
              <Shield size={16} />
              <span>LiveKit URL, API key, API secret</span>
              <strong>{status?.missing.some((key) => ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'].includes(key)) ? 'Missing' : 'Configured'}</strong>
            </div>
            <div>
              <RadioTower size={16} />
              <span>SIP trunk ID</span>
              <strong>{status?.missing.includes('LIVEKIT_SIP_TRUNK_ID') ? 'Missing' : 'Configured'}</strong>
            </div>
            <div>
              <Phone size={16} />
              <span>Default caller number</span>
              <strong>{status?.defaultSipNumberConfigured ? 'Configured' : 'Optional'}</strong>
            </div>
            <div>
              <Zap size={16} />
              <span>Current plan</span>
              <strong>{isPremium ? 'Premium' : 'Basic'}</strong>
            </div>
          </div>

          {status && !status.ready && (
            <p className="form-help list-help">
              Missing env vars: {status.missing.join(', ')}. Add them to your deployment, then redeploy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
