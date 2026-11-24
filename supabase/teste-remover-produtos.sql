-- RYSS COMPANY — remove as camisetas de TESTE
--
-- Cole no SQL Editor do Supabase e clique em Run.
-- Apaga somente produtos cujo endereço começa com "teste-"
-- (tamanhos e fotos deles são apagados junto).

delete from public.products where slug like 'teste-%';
