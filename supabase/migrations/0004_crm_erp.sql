-- RYSS COMPANY — contas de clientes, CRM e controle de estoque (ERP)
-- Execute no SQL Editor do Supabase depois da 0003_admin.sql.
--
-- Senhas NUNCA ficam nestas tabelas: o Supabase Auth guarda apenas o hash.
-- O painel pode definir uma nova senha ou enviar link de redefinição.

-- ---------------------------------------------------------------------------
-- Clientes: conta, nascimento, marketing (LGPD) e etiquetas
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists birth_date date,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists tags text[] not null default '{}',
  add column if not exists blocked boolean not null default false;

create index if not exists customers_email_idx on public.customers (lower(email));
create index if not exists customers_name_idx on public.customers (lower(full_name));

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 40),
  cep text not null check (cep ~ '^[0-9]{8}$'),
  street text not null,
  number text not null,
  complement text not null default '',
  district text not null,
  city text not null,
  state text not null check (state ~ '^[A-Z]{2}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists customer_addresses_customer_idx on public.customer_addresses (customer_id);

-- Histórico de atendimento (anotações da equipe)
create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists customer_notes_customer_idx on public.customer_notes (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Marketing: modelos e registro de mensagens
-- ---------------------------------------------------------------------------
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  channel text not null check (channel in ('whatsapp', 'email')),
  subject text not null default '',
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists message_templates_updated_at on public.message_templates;
create trigger message_templates_updated_at before update on public.message_templates
  for each row execute function public.set_updated_at();

create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email')),
  subject text not null default '',
  body text not null,
  -- 'manual': aberto pelo painel (WhatsApp/e-mail do computador);
  -- 'pendente': aguardando integração de envio automático.
  status text not null default 'manual' check (status in ('manual', 'pendente', 'enviado', 'falhou')),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists customer_messages_customer_idx on public.customer_messages (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Produtos: código (SKU) e custo para controle de margem e valor em estoque
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists sku text,
  add column if not exists cost_cents integer check (cost_cents is null or cost_cents >= 0);

alter table public.product_variants
  add column if not exists sku text;

-- ---------------------------------------------------------------------------
-- Pedidos: frete, transportadora, rastreio e anotações internas
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists shipping_carrier text not null default '',
  add column if not exists tracking_code text not null default '',
  add column if not exists internal_notes text not null default '',
  add column if not exists paid_at timestamptz,
  add column if not exists shipped_at timestamptz;

-- ---------------------------------------------------------------------------
-- Estoque: toda mudança fica registrada (quem, quando, quanto e por quê)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.stock_reason as enum (
    'entrada', 'ajuste', 'venda', 'cancelamento', 'devolucao', 'perda'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  size text not null,
  delta integer not null,
  stock_after integer not null,
  reason public.stock_reason not null,
  note text not null default '',
  order_id uuid references public.orders (id) on delete set null,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);
create index if not exists stock_movements_created_idx on public.stock_movements (created_at desc);

-- O motivo vem de variáveis da transação (set_config); sem elas, é "ajuste".
create or replace function public.log_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta integer;
  v_reason text := nullif(current_setting('app.stock_reason', true), '');
  v_order text := nullif(current_setting('app.stock_order', true), '');
  v_note text := coalesce(current_setting('app.stock_note', true), '');
  v_name text;
begin
  if tg_op = 'INSERT' then
    v_delta := new.stock;
  else
    v_delta := new.stock - old.stock;
  end if;
  if v_delta = 0 then
    return new;
  end if;

  select name into v_name from public.products where id = new.product_id;

  insert into public.stock_movements (
    variant_id, product_name, size, delta, stock_after, reason, note, order_id, author_id
  ) values (
    new.id, coalesce(v_name, ''), new.size, v_delta, new.stock,
    coalesce(v_reason, case when tg_op = 'INSERT' then 'entrada' else 'ajuste' end)::public.stock_reason,
    v_note, v_order::uuid, auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists product_variants_stock_log on public.product_variants;
create trigger product_variants_stock_log
  after insert or update of stock on public.product_variants
  for each row execute function public.log_stock_movement();

-- ---------------------------------------------------------------------------
-- Funções atualizadas: pedido registra "venda"; cancelamento registra devolução ao estoque
-- ---------------------------------------------------------------------------
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
  v_blocked boolean;
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

  -- Cliente com conta: os dados cadastrados não são sobrescritos pelo checkout.
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
    where public.customers.user_id is null
  returning id into v_customer_id;

  if v_customer_id is null then
    select id into v_customer_id from public.customers where cpf = p_customer ->> 'cpf';
  end if;

  select blocked into v_blocked from public.customers where id = v_customer_id;
  if v_blocked then
    raise exception 'CLIENTE_BLOQUEADO';
  end if;

  insert into public.orders (
    customer_id, status, payment_method,
    subtotal_cents, shipping_cents, total_cents, shipping_address
  )
  values (v_customer_id, 'aguardando_pagamento', p_payment_method, 0, 0, 0, p_address)
  returning id, number into v_order_id, v_order_number;

  perform set_config('app.stock_reason', 'venda', true);
  perform set_config('app.stock_order', v_order_id::text, true);
  perform set_config('app.stock_note', '', true);

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

  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order', '', true);

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
    perform set_config('app.stock_reason', 'cancelamento', true);
    perform set_config('app.stock_order', p_order_id::text, true);
    update public.product_variants v
       set stock = v.stock + i.quantity
      from (
        select variant_id, sum(quantity)::integer as quantity
          from public.order_items
         where order_id = p_order_id and variant_id is not null
         group by variant_id
      ) i
     where v.id = i.variant_id;
    perform set_config('app.stock_reason', '', true);
    perform set_config('app.stock_order', '', true);
  end if;

  update public.orders
     set status = p_status,
         paid_at = case when p_status = 'pago' and paid_at is null then now() else paid_at end,
         shipped_at = case when p_status = 'enviado' and shipped_at is null then now() else shipped_at end
   where id = p_order_id;
end;
$$;

-- Entrada, saída, perda ou devolução manual de estoque (somente administradores).
create or replace function public.admin_adjust_stock(
  p_variant_id uuid,
  p_delta integer,
  p_reason public.stock_reason,
  p_note text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock integer;
begin
  if not public.is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  if p_delta = 0 or p_reason in ('venda', 'cancelamento') then
    raise exception 'AJUSTE_INVALIDO';
  end if;

  perform set_config('app.stock_reason', p_reason::text, true);
  perform set_config('app.stock_note', left(coalesce(p_note, ''), 300), true);

  update public.product_variants
     set stock = stock + p_delta
   where id = p_variant_id
  returning stock into v_stock;

  if not found then
    raise exception 'TAMANHO_NAO_ENCONTRADO';
  end if;
  if v_stock < 0 then
    raise exception 'ESTOQUE_NEGATIVO';
  end if;

  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_note', '', true);
  return v_stock;
end;
$$;

revoke all on function public.admin_adjust_stock(uuid, integer, public.stock_reason, text) from public, anon;
grant execute on function public.admin_adjust_stock(uuid, integer, public.stock_reason, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Relatórios (somente administradores). Pedidos cancelados não entram.
-- ---------------------------------------------------------------------------
create or replace function public.admin_sales_summary(p_from timestamptz, p_to timestamptz)
returns table (
  orders_count bigint,
  paid_count bigint,
  revenue_cents bigint,
  paid_revenue_cents bigint,
  items_count bigint,
  new_customers bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  return query
  select
    count(*)::bigint,
    count(*) filter (where o.status in ('pago', 'em_separacao', 'enviado', 'entregue'))::bigint,
    coalesce(sum(o.total_cents), 0)::bigint,
    coalesce(sum(o.total_cents) filter (where o.status in ('pago', 'em_separacao', 'enviado', 'entregue')), 0)::bigint,
    coalesce((select sum(i.quantity) from public.order_items i
               join public.orders o2 on o2.id = i.order_id
              where o2.created_at >= p_from and o2.created_at < p_to
                and o2.status <> 'cancelado'), 0)::bigint,
    (select count(*) from public.customers c
      where c.created_at >= p_from and c.created_at < p_to)::bigint
  from public.orders o
  where o.created_at >= p_from and o.created_at < p_to
    and o.status <> 'cancelado';
end;
$$;

create or replace function public.admin_sales_by_day(p_from timestamptz, p_to timestamptz)
returns table (day date, orders_count bigint, revenue_cents bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  return query
  select (o.created_at at time zone 'America/Sao_Paulo')::date,
         count(*)::bigint,
         sum(o.total_cents)::bigint
    from public.orders o
   where o.created_at >= p_from and o.created_at < p_to
     and o.status <> 'cancelado'
   group by 1
   order by 1;
end;
$$;

create or replace function public.admin_top_products(p_from timestamptz, p_to timestamptz, p_limit integer)
returns table (product_name text, size text, quantity bigint, revenue_cents bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  return query
  select i.product_name, i.size, sum(i.quantity)::bigint, sum(i.quantity * i.unit_price_cents)::bigint
    from public.order_items i
    join public.orders o on o.id = i.order_id
   where o.created_at >= p_from and o.created_at < p_to
     and o.status <> 'cancelado'
   group by 1, 2
   order by 3 desc, 4 desc
   limit greatest(1, least(p_limit, 100));
end;
$$;

-- Resumo por cliente (pedidos, total gasto, última compra) para o CRM.
create or replace view public.customer_stats
with (security_invoker = true) as
select
  c.id as customer_id,
  count(o.id) filter (where o.status <> 'cancelado') as orders_count,
  coalesce(sum(o.total_cents) filter (where o.status <> 'cancelado'), 0)::bigint as total_spent_cents,
  max(o.created_at) filter (where o.status <> 'cancelado') as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

revoke all on function public.admin_sales_summary(timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_sales_by_day(timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_top_products(timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.admin_sales_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_sales_by_day(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_top_products(timestamptz, timestamptz, integer) to authenticated;
revoke all on public.customer_stats from anon;

-- ---------------------------------------------------------------------------
-- Segurança (RLS): somente administradores leem/alteram dados de CRM e estoque.
-- A área do cliente acessa os próprios dados pelo servidor do site.
-- ---------------------------------------------------------------------------
alter table public.customer_addresses enable row level security;
alter table public.customer_notes enable row level security;
alter table public.message_templates enable row level security;
alter table public.customer_messages enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "admin le clientes" on public.customers;
drop policy if exists "admin gerencia clientes" on public.customers;
create policy "admin gerencia clientes" on public.customers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin gerencia enderecos" on public.customer_addresses;
create policy "admin gerencia enderecos" on public.customer_addresses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin gerencia anotacoes" on public.customer_notes;
create policy "admin gerencia anotacoes" on public.customer_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin gerencia modelos" on public.message_templates;
create policy "admin gerencia modelos" on public.message_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin gerencia mensagens" on public.customer_messages;
create policy "admin gerencia mensagens" on public.customer_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin le movimentos" on public.stock_movements;
create policy "admin le movimentos" on public.stock_movements
  for select to authenticated using (public.is_admin());

drop policy if exists "admin gerencia itens de pedidos" on public.order_items;
create policy "admin gerencia itens de pedidos" on public.order_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Equipe: administradores podem ver a lista de administradores.
drop policy if exists "admin le equipe" on public.admins;
create policy "admin le equipe" on public.admins
  for select to authenticated using (public.is_admin());
