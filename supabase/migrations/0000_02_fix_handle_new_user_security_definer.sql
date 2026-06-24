-- Captured from live Supabase migration: fix_handle_new_user_security_definer (20260621041032)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_name text;
  v_role_id integer;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();

  v_role_name := nullif(new.raw_user_meta_data->>'role', '');

  if v_role_name is not null then
    select id into v_role_id
    from public.roles
    where name = v_role_name
    limit 1;

    if v_role_id is not null then
      insert into public.user_roles (user_id, role_id)
      values (new.id, v_role_id)
      on conflict (user_id, role_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;
