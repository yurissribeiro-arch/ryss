-- RYSS COMPANY — painel administrativo
-- Execute no SQL Editor do Supabase depois da 0002_checkout.sql.

-- Altera a situação de um pedido. Somente administradores.
-- Ao cancelar, o estoque reservado volta para os tamanhos.
-- Um pedido cancelado não pode ser reaberto (crie um novo pedido).
create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.order_status;
begin
  if not public.is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  select status into v_current
    from public.orders
   where id = p_order_id
     for update;

  if not found then
    raise exception 'PEDIDO_NAO_ENCONTRADO';
  end if;

  if v_current = p_status then
    return;
  end if;

  if v_current = 'cancelado' then
    raise exception 'PEDIDO_CANCELADO';
  end if;

  if p_status = 'cancelado' then
    update public.product_variants v
       set stock = v.stock + i.quantity
      from (
        select variant_id, sum(quantity)::integer as quantity
          from public.order_items
         where order_id = p_order_id and variant_id is not null
         group by variant_id
      ) i
     where v.id = i.variant_id;
  end if;

  update public.orders set status = p_status where id = p_order_id;
end;
$$;

revoke all on function public.admin_set_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status) to authenticated;

-- O Storage exige permissão de leitura para remover arquivos.
create policy "admin le fotos" on storage.objects
  for select to authenticated using (bucket_id = 'products' and public.is_admin());

-- Fotos: somente imagens de até 10 MB na pasta de produtos.
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
 where id = 'products';
