'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, CheckCircle2, Mail, Phone, Plus, RefreshCw, Send, UserPlus, Users } from 'lucide-react';

interface ContactInvite {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  status: 'invited' | 'already_registered' | 'accepted';
  created_at: string;
}

export default function ContactsPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<ContactInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('contact_invites')
      .select('id, full_name, email, phone_number, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setContacts((data || []) as ContactInvite[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const addContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/contacts/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: cleanEmail,
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite contact');
      }

      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setMessage(
        result.status === 'already_registered'
          ? 'This contact is already on Calify and was added to your list.'
          : 'Contact added. Calify sent an invite email with a login link.',
      );
      await loadContacts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const statusText: Record<ContactInvite['status'], string> = {
    invited: 'Invited',
    already_registered: 'On Calify',
    accepted: 'Accepted',
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <p>Add a contact by email and phone. If they are new to Calify, they get an invite email.</p>
        </div>
        <button onClick={loadContacts} className="calify-btn calify-btn-ghost" style={{ padding: '8px' }}>
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

      <div className="contacts-grid">
        <form onSubmit={addContact} className="calify-card contact-form-card">
          <h2>
            <UserPlus size={18} color="#1a73e8" /> Add contact
          </h2>

          <label className="form-label">Name</label>
          <input
            className="calify-input"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Jane Doe"
          />

          <label className="form-label">Email</label>
          <div className="input-icon-wrap">
            <Mail size={15} />
            <input
              className="calify-input input-with-icon"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="jane@example.com"
              type="email"
            />
          </div>

          <label className="form-label">Phone</label>
          <div className="input-icon-wrap">
            <Phone size={15} />
            <input
              className="calify-input input-with-icon"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+1 555 123 4567"
              type="tel"
            />
          </div>

          <p className="form-help">
            Calify uses Supabase invite emails, so the user receives a secure login link instead of a shared password.
          </p>

          <button className="calify-btn calify-btn-primary" disabled={saving} style={{ justifyContent: 'center' }}>
            {saving ? 'Sending invite...' : <><Plus size={16} /> Add and invite</>}
          </button>
        </form>

        <div className="calify-card contacts-list-card">
          <div className="card-title-row">
            <h2>
              <Users size={18} color="#34a853" /> Added contacts
            </h2>
            <span>{contacts.length}</span>
          </div>

          {loading ? (
            <div className="empty-state">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="empty-state">
              <Users size={42} />
              <p>No contacts added yet.</p>
            </div>
          ) : (
            <div className="contact-list">
              {contacts.map((contact) => (
                <div key={contact.id} className="contact-row">
                  <div className="contact-avatar">{contact.full_name.charAt(0).toUpperCase()}</div>
                  <div className="contact-details">
                    <p>{contact.full_name}</p>
                    <span>{contact.email}</span>
                    {contact.phone_number && <span>{contact.phone_number}</span>}
                  </div>
                  <span className={`contact-status contact-status-${contact.status}`}>
                    {statusText[contact.status]}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="form-help list-help">
            <Send size={14} /> Invites are sent by email and tracked here for the signed-in user.
          </div>
        </div>
      </div>
    </div>
  );
}
