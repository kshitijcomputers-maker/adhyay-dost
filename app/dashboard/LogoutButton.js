'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        border: '1px solid #ccc',
        background: '#fff',
        cursor: 'pointer',
      }}
    >
      Logout
    </button>
  );
}
