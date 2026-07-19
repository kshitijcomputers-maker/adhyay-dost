import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { togglePlan, approveRequest, rejectRequest } from './actions';

// Apna admin email(s) yahan daalo (comma-separated in env var), default kshitijcomputers@gmail.com
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'kshitijcomputers@gmail.com')
  .split(',')
  .map((e) => e.trim());

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email)) {
    return <main style={{ padding: 40 }}>Access denied — ye page sirf admin ke liye hai.</main>;
  }

  const { data: pendingRequests } = await supabase
    .from('payment_requests')
    .select('id, user_id, email, screenshot_path, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  // Screenshots ke liye signed URLs banao (private bucket)
  const requestsWithUrls = await Promise.all(
    (pendingRequests || []).map(async (r) => {
      const { data } = await supabase.storage
        .from('payment-screenshots')
        .createSignedUrl(r.screenshot_path, 3600);
      return { ...r, screenshotUrl: data?.signedUrl };
    })
  );

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, plan, created_at')
    .order('created_at', { ascending: false });

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <h1>Admin Panel</h1>

      <h2>Pending Payment Approvals ({requestsWithUrls.length})</h2>
      {requestsWithUrls.length === 0 && (
        <p style={{ color: '#888', fontSize: 14 }}>Koi pending request nahi hai.</p>
      )}
      {requestsWithUrls.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1.5px solid #DCD0B4',
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          {r.screenshotUrl && (
            <a href={r.screenshotUrl} target="_blank" rel="noreferrer">
              <img
                src={r.screenshotUrl}
                alt="payment screenshot"
                style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8 }}
              />
            </a>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{r.email}</div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {new Date(r.created_at).toLocaleString('en-IN')}
            </div>
          </div>
          <form action={approveRequest}>
            <input type="hidden" name="requestId" value={r.id} />
            <input type="hidden" name="userId" value={r.user_id} />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                background: '#4C7A5C',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                marginRight: 8,
              }}
            >
              ✓ Approve
            </button>
          </form>
          <form action={rejectRequest}>
            <input type="hidden" name="requestId" value={r.id} />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              ✕ Reject
            </button>
          </form>
        </div>
      ))}

      <h2 style={{ marginTop: 32 }}>All Users</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Plan</th>
            <th style={{ padding: 8 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {(profiles || []).map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{p.email}</td>
              <td style={{ padding: 8 }}>{p.plan}</td>
              <td style={{ padding: 8 }}>
                <form action={togglePlan}>
                  <input type="hidden" name="userId" value={p.id} />
                  <input type="hidden" name="currentPlan" value={p.plan} />
                  <button
                    type="submit"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      cursor: 'pointer',
                    }}
                  >
                    {p.plan === 'paid' ? 'Free karo' : 'Paid karo'}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
