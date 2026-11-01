-- UI and AI feedback language, so the choice follows the account across devices.
alter table public.profiles
  add column locale text not null default 'vi' check (locale in ('vi', 'en'));
