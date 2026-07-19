'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center', padding: '0 20px' }}>
      <h1>Login करें</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Google account se login karo</p>
      <button
        onClick={handleGoogleLogin}
        style={{
          padding: '12px 24px',
          borderRadius: 10,
          border: '1.5px solid #ccc',
          background: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 15,
        }}
      >
        🔵 Google se Login करें
      </button>
    </main>
  );
}
