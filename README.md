# अध्याय दोस्त — Foundation Setup

Ye foundation hai: **Login (Google) + Database (plan tracking) + Admin panel**.
Payment (UPI) aur AdSense integration abhi baaki hai — agla step.

## Setup steps

### 1. Supabase project banao
1. https://supabase.com par free account banao, naya project banao (region: Mumbai/Singapore rakho, fast rahega).
2. Project Settings → API me jaake `Project URL` aur `anon public key` copy karo.
3. SQL Editor me jaake `supabase/schema.sql` ka poora content paste karke Run karo.
4. Authentication → Providers → Google enable karo:
   - Google Cloud Console (https://console.cloud.google.com) me OAuth Client ID banao
   - Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - Client ID/Secret Supabase me paste karo

### 2. Local setup
```bash
npm install
cp .env.local.example .env.local
# .env.local me apni Supabase URL, anon key, aur admin email daalo
npm run dev
```
`http://localhost:3000` par app khulega.

### 3. Deploy (Vercel)
1. Is project ko GitHub repo me push karo.
2. https://vercel.com par account banao → "New Project" → GitHub repo select karo.
3. Environment Variables me `.env.local` wali same values daalo.
4. Deploy — 2-3 min me live URL mil jayega.
5. Supabase → Authentication → URL Configuration me apna Vercel domain add karo (redirect URLs).

### 4. Admin access
- `.env.local` / Vercel env me `ADMIN_EMAILS` me apna Google login wala email daalo.
- Login karke `/admin` visit karo — wahan se kisi bhi user ka plan free↔paid switch kar sakte ho.

## Payment flow (manual UPI approval) — ready hai
1. User `/upgrade` page par jaake UPI ID (`ebctraders@ybl`) dekh ke payment karta hai.
2. Payment screenshot upload karta hai — ye Supabase Storage (private bucket) me save hota hai.
3. Ek `pending` entry `payment_requests` table me ban jaati hai.
4. Admin (`kshitijcomputers@gmail.com`) `/admin` page par login karke sab pending requests + screenshots dekh sakta hai.
5. **Approve** dabane par: user ka `profile.plan = 'paid'` ho jaata hai → ads dashboard se turant hat jaati hain.
6. **Reject** dabane par: request reject ho jaati hai, plan free hi rehta hai.

⚠️ Schema.sql me admin email hardcoded hai (`kshitijcomputers@gmail.com`) RLS policies me — agar email change karna ho to `supabase/schema.sql` ke un teen policies me email update karke SQL Editor me dobara run karo.

## Ab kya baaki hai (agle steps)
- [ ] Original AdhyayDost tool (upload/summary/questions/flashcards) ko dashboard me React component ke roop me integrate karna
- [ ] Google AdSense script add karna (sirf free users ko dikhana — jab AdSense approval mil jaye)
- [ ] Custom domain connect karna
- [ ] (Optional future) Razorpay/Cashfree jaisa automated payment gateway, agar manual approval scale na kare
