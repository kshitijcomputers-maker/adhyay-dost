-- 1. Profiles table: har user ka plan status track karega
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  created_at timestamptz default now()
);

-- 2. RLS enable karo
alter table public.profiles enable row level security;

-- User apna khud ka profile padh sake
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 3. Naya user signup hote hi profile row auto-create ho (default: free)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, new.email, 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- NOTE: Admin panel (server-side, service role ya server component se) profiles table
-- ko update karega. Agar client-side se bhi update allow karna ho to alag admin policy
-- add karni padegi — abhi ke setup me admin page server actions use kar raha hai jo
-- server par hi chalta hai, isliye ye kaafi hai.

-- 4. Payment requests table: manual UPI screenshot approval flow ke liye
create table if not exists public.payment_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  email text,
  screenshot_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

alter table public.payment_requests enable row level security;

-- User apni khud ki request insert kar sake
create policy "Users can insert own payment request"
  on public.payment_requests for insert
  with check (auth.uid() = user_id);

-- User apni khud ki requests dekh sake
create policy "Users can view own payment requests"
  on public.payment_requests for select
  using (auth.uid() = user_id);

-- Admin panel server actions se update karta hai (server-side supabase client,
-- authenticated as the logged-in admin user), isliye admin ke liye alag select/update
-- policy chahiye taaki wo sab requests dekh/update kar sake:
create policy "Admin can view all payment requests"
  on public.payment_requests for select
  using (auth.jwt() ->> 'email' = 'kshitijcomputers@gmail.com');

create policy "Admin can update payment requests"
  on public.payment_requests for update
  using (auth.jwt() ->> 'email' = 'kshitijcomputers@gmail.com');

create policy "Admin can update any profile"
  on public.profiles for update
  using (auth.jwt() ->> 'email' = 'kshitijcomputers@gmail.com');

-- 5. Storage bucket: payment screenshots (private — sirf uploader aur admin dekh sakein)
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do nothing;

create policy "Users can upload own screenshot"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own screenshot"
  on storage.objects for select
  using (
    bucket_id = 'payment-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admin can view all screenshots"
  on storage.objects for select
  using (
    bucket_id = 'payment-screenshots'
    and auth.jwt() ->> 'email' = 'kshitijcomputers@gmail.com'
  );
