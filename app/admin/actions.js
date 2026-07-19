'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function togglePlan(formData) {
  const userId = formData.get('userId');
  const currentPlan = formData.get('currentPlan');
  const newPlan = currentPlan === 'paid' ? 'free' : 'paid';

  const supabase = createClient();
  await supabase.from('profiles').update({ plan: newPlan }).eq('id', userId);

  revalidatePath('/admin');
}

// Payment approve: user ka plan 'paid' set karo + request ko 'approved' mark karo
export async function approveRequest(formData) {
  const requestId = formData.get('requestId');
  const userId = formData.get('userId');

  const supabase = createClient();
  await supabase.from('profiles').update({ plan: 'paid' }).eq('id', userId);
  await supabase.from('payment_requests').update({ status: 'approved' }).eq('id', requestId);

  revalidatePath('/admin');
}

// Reject: sirf request ko 'rejected' mark karo, plan free hi rahega
export async function rejectRequest(formData) {
  const requestId = formData.get('requestId');

  const supabase = createClient();
  await supabase.from('payment_requests').update({ status: 'rejected' }).eq('id', requestId);

  revalidatePath('/admin');
}
