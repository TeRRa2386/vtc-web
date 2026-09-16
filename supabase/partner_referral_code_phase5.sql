-- Phase 5 partner referral codes for platform-neutral individual attribution.

alter table public.partners
  add column if not exists referral_code text;

update public.partners
set referral_code = upper(
  regexp_replace(
    btrim(coalesce(nullif(referral_code, ''), android_referrer_code, slug)),
    '[^A-Za-z0-9_]+',
    '_',
    'g'
  )
)
where referral_code is null or btrim(referral_code) = '';

alter table public.partners
  alter column referral_code set not null;

create unique index if not exists partners_referral_code_upper_unique
  on public.partners (upper(referral_code));

notify pgrst, 'reload schema';
