-- RYSS COMPANY — 6 camisetas de TESTE (somente para visualizar o site)
--
-- Cole no SQL Editor do Supabase e clique em Run.
-- Todas têm "TESTE" no nome e o endereço começa com "teste-".
-- Preços e estoques são fictícios. Para remover tudo depois, use
-- supabase/teste-remover-produtos.sql.

with novos as (
  insert into public.products (slug, name, description, price_cents, active, sort_order)
  values
    ('teste-1', 'Camiseta Teste 1', 'Produto de TESTE para visualização do site. Não está à venda.', 9990, true, 1),
    ('teste-2', 'Camiseta Teste 2', 'Produto de TESTE para visualização do site. Não está à venda.', 10990, true, 2),
    ('teste-3', 'Camiseta Teste 3', 'Produto de TESTE para visualização do site. Não está à venda.', 11990, true, 3),
    ('teste-4', 'Camiseta Teste 4', 'Produto de TESTE para visualização do site. Não está à venda.', 12990, true, 4),
    ('teste-5', 'Camiseta Teste 5', 'Produto de TESTE para visualização do site. Não está à venda.', 13990, true, 5),
    ('teste-6', 'Camiseta Teste 6', 'Produto de TESTE para visualização do site. Não está à venda.', 14990, true, 6)
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_variants (product_id, size, stock, position)
select n.id, t.size, t.stock, t.position
from novos n
cross join lateral (
  values
    ('P',  case when n.slug = 'teste-3' then 0 else 5 end, 1),
    ('M',  8, 2),
    ('G',  case when n.slug = 'teste-5' then 1 else 6 end, 3),
    ('GG', case when n.slug in ('teste-2', 'teste-6') then 0 else 3 end, 4)
) as t(size, stock, position);
