'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Video, Calendar, Phone, BarChart2, Settings, LogOut, Zap, Shield, Users, RadioTower } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: BarChart2 },
  { href: '/dashboard/contacts', label: 'Contacts', icon: Users },
  { href: '/dashboard/voip', label: 'VoIP', icon: RadioTower },
  { href: '/dashboard/scheduler', label: 'Scheduler', icon: Calendar },
  { href: '/', label: 'New Meeting', icon: Video },
  { href: '/dashboard/calls', label: 'Call Logs', icon: Phone },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);
      supabase.from('users').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isPremium = profile?.subscription_tier === 'premium';
  const userInitial = (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--calify-border)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={16} color="white" />
            </div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--calify-text)', letterSpacing: '-0.3px' }}>
              Cali<span style={{ color: 'var(--calify-blue)' }}>fy</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="dashboard-nav">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
                  fontSize: '14px', fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--calify-text)' : 'var(--calify-text-secondary)',
                  background: isActive ? 'var(--calify-surface-3)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={17} style={{ color: isActive ? '#1a73e8' : 'inherit', flexShrink: 0 }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--calify-border)' }}>
          {/* Plan badge */}
          <div style={{ marginBottom: '12px' }}>
            {isPremium ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(251,188,4,0.08)', border: '1px solid rgba(251,188,4,0.2)' }}>
                <Zap size={14} color="#fbbc04" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fbbc04' }}>Premium Plan</span>
              </div>
            ) : (
              <Link href="/dashboard/settings#upgrade" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'var(--calify-surface-2)', border: '1px solid var(--calify-border)', textDecoration: 'none' }}>
                <Shield size={14} color="var(--calify-text-secondary)" />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--calify-text-secondary)', flex: 1 }}>Basic Plan</span>
                <span style={{ fontSize: '10px', color: '#1a73e8', fontWeight: 600 }}>Upgrade</span>
              </Link>
            )}
          </div>

          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {userInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--calify-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
            <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--calify-text-secondary)', display: 'flex', padding: '4px' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="dashboard-main">
        {children}
      </div>
    </div>
  );
}
