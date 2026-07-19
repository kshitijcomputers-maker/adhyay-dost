'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const UPI_ID = 'ebctraders@ybl';

export default function UpgradePage() {
  const supabase = createClient();
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [errMsg, setErrMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    setErrMsg('');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // 1. Screenshot ko Supabase Storage me upload karo
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(filePath, file);

    if (uploadError) {
      setStatus('error');
      setErrMsg('Upload fail hua, dobara try karo: ' + uploadError.message);
      return;
    }

    // 2. payment_requests table me pending entry banao
    const { error: insertError } = await supabase.from('payment_requests').insert({
      user_id: user.id,
      email: user.email,
      screenshot_path: filePath,
      status: 'pending',
    });

    if (insertError) {
      setStatus('error');
      setErrMsg('Request save nahi hui: ' + insertError.message);
      return;
    }

    setStatus('done');
  };

  if (status === 'done') {
    return (
      <main style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1>✅ Request bhej di gayi</h1>
        <p style={{ color: '#555' }}>
          Admin approve karega, usके baad tumhara plan Paid ho jayega aur ads band ho jayengi.
          Usually kuch ghanto me ho jaata hai.
        </p>
        <a href="/dashboard" style={{ color: '#E4572E', fontWeight: 700 }}>
          Dashboard par wapas jao
        </a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: '0 20px' }}>
      <h1>Upgrade to Paid — ₹199/month</h1>

      <div
        style={{
          background: '#FFFDF7',
          border: '1.5px solid #DCD0B4',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: '#555' }}>UPI ID par ₹199 bhejo:</p>
        <p style={{ fontSize: 22, fontWeight: 800, margin: '6px 0', color: '#20283D' }}>
          {UPI_ID}
        </p>
        <p style={{ fontSize: 13, color: '#888' }}>
          (GPay/PhonePe/Paytm — kisi bhi UPI app se is ID par bhej sakte ho)
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
          Payment screenshot upload karo:
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          required
          style={{ marginBottom: 16 }}
        />
        <br />
        <button
          type="submit"
          disabled={!file || status === 'uploading'}
          style={{
            padding: '12px 24px',
            borderRadius: 10,
            border: 'none',
            background: '#E4572E',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {status === 'uploading' ? 'Bhej rahe hain...' : 'Screenshot submit karo'}
        </button>
      </form>

      {status === 'error' && (
        <p style={{ color: '#8a2e17', marginTop: 12, fontSize: 14 }}>{errMsg}</p>
      )}
    </main>
  );
}
