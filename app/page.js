import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
      <h1>अध्याय दोस्त 📘</h1>
      <p style={{ color: '#555' }}>Chapter upload karo, summary/questions/flashcards paao.</p>
      <a
        href="/login"
        style={{
          display: 'inline-block',
          marginTop: 20,
          padding: '12px 28px',
          background: '#E4572E',
          color: '#fff',
          borderRadius: 10,
          textDecoration: 'none',
          fontWeight: 700,
        }}
      >
        शुरू करें
      </a>
    </main>
  );
}
