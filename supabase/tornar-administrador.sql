-- RYSS COMPANY — dar acesso ao painel administrativo
--
-- 1) No Supabase: Authentication > Users > Add user > Create new user
--    (e-mail + senha, marque "Auto Confirm User").
-- 2) Troque o e-mail abaixo pelo e-mail desse usuário, cole no SQL Editor e clique em Run.

insert into public.admins (user_id)
select id from auth.users where email = 'SEU-EMAIL@exemplo.com'
on conflict do nothing;

-- Para conferir quem é administrador:
-- select u.email from public.admins a join auth.users u on u.id = a.user_id;
