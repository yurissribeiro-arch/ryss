-- RYSS COMPANY — criação de pedidos (checkout)
-- Execute no SQL Editor do Supabase depois da 0001_init.sql.
--
-- A função create_order recebe apenas IDs de tamanho e quantidades. Preço,
-- disponibilidade e estoque são lidos do banco dentro de uma única transação,
-- com bloqueio das linhas, e o estoque é reservado (baixado) na criação do
-- pedido. Ao cancelar um pedido, o estoque deve ser devolvido (painel admin).
-- Somente o servidor do site (chave secreta) pode executar a função.

create or replace function public.create_order(
  p_customer jsonb,
  p_address jsonb,
  p_payment_method text,
  p_items jsonb
)
returns table (order_id uuid, order_number bigint, total_cents integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal integer := 0;
  v_item record;
  v_row record;
begin
  if p_payment_method not in ('pix', 'cartao') then
    raise exception 'PAGAMENTO_INVALIDO';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CARRINHO_VAZIO';
  end if;

  insert into public.customers (full_name, cpf, email, phone)
  values (
    p_customer ->> 'full_name',
    p_customer ->> 'cpf',
    p_customer ->> 'email',
    p_customer ->> 'phone'
  )
  on conflict (cpf) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        phone = excluded.phone
  returning id into v_customer_id;

  insert into public.orders (
    customer_id, status, payment_method,
    subtotal_cents, shipping_cents, total_cents, shipping_address
  )
  values (v_customer_id, 'aguardando_pagamento', p_payment_method, 0, 0, 0, p_address)
  returning id, number into v_order_id, v_order_number;

  -- Itens agrupados por tamanho e em ordem fixa (evita travamentos entre pedidos).
  for v_item in
    select (e ->> 'variant_id')::uuid as variant_id,
           sum((e ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as e
    group by 1
    order by 1
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 10 then
      raise exception 'QUANTIDADE_INVALIDA';
    end if;

    select v.id, v.size, v.stock, p.id as product_id, p.name, p.price_cents, p.active
      into v_row
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = v_item.variant_id
       for update of v;

    if not found or not v_row.active then
      raise exception 'INDISPONIVEL:%', v_item.variant_id;
    end if;

    if v_row.stock < v_item.quantity then
      raise exception 'ESTOQUE:%:%', v_item.variant_id, v_row.stock;
    end if;

    update public.product_variants
       set stock = stock - v_item.quantity
     where id = v_row.id;

    insert into public.order_items (
      order_id, product_id, variant_id, product_name, size, unit_price_cents, quantity
    )
    values (
      v_order_id, v_row.product_id, v_row.id, v_row.name, v_row.size,
      v_row.price_cents, v_item.quantity
    );

    v_subtotal := v_subtotal + v_row.price_cents * v_item.quantity;
  end loop;

  update public.orders
     set subtotal_cents = v_subtotal,
         total_cents = v_subtotal
   where id = v_order_id;

  return query select v_order_id, v_order_number, v_subtotal;
end;
$$;

revoke all on function public.create_order(jsonb, jsonb, text, jsonb) from public;
revoke all on function public.create_order(jsonb, jsonb, text, jsonb) from anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb, text, jsonb) to service_role;
