import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './LogoutButton';
import AdhyayTool from './AdhyayTool';

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const isPaid = profile?.plan === 'paid';

  return (
    <main style={{ maxWidth: 700, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>अध्याय दोस्त</h1>
        <LogoutButton />
      </div>

      <p>
        Welcome, {user.email} — Plan:{' '}
        <strong style={{ color: isPaid ? '#4C7A5C' : '#E4572E' }}>
          {isPaid ? 'Paid ✓' : 'Free'}
        </strong>
      </p>

      {!isPaid && (
        <div
          style={{
            border: '1px dashed #ccc',
            borderRadius: 10,
            padding: 16,
            margin: '16px 0',
            textAlign: 'center',
            color: '#888',
            fontSize: 14,
          }}
        >
          [ Google AdSense ad slot — sirf free users ko dikhega ]
        </div>
      )}

      {!isPaid && (
        <a
          href="/upgrade"
          style={{
            display: 'inline-block',
            marginBottom: 20,
            padding: '10px 20px',
            background: '#F5C84C',
            color: '#20283D',
            borderRadius: 8,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          ₹199/month me Upgrade karo (No Ads)
        </a>
      )}

      <AdhyayTool />
    </main>
  );
}
