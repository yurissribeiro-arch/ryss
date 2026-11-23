-- RYSS COMPANY — schema inicial
-- Execute no SQL Editor do Supabase (ou via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Administradores
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);

-- Estoque individual por tamanho
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null check (size ~ '^[A-Z0-9]{1,6}$'),
  stock integer not null default 0 check (stock >= 0),
  position integer not null default 0,
  unique (product_id, size)
);
create index product_variants_product_idx on public.product_variants (product_id, position);

-- ---------------------------------------------------------------------------
-- Clientes e pedidos (acesso somente pelo servidor ou por administradores)
-- ---------------------------------------------------------------------------
create type public.order_status as enum (
  'aguardando_pagamento', 'pago', 'em_separacao', 'enviado', 'entregue', 'cancelado'
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text not null unique check (cpf ~ '^[0-9]{11}$'),
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  customer_id uuid not null references public.customers (id),
  status public.order_status not null default 'aguardando_pagamento',
  payment_method text check (payment_method in ('pix', 'cartao')),
  payment_provider_id text,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  size text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "admin le o proprio registro" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- Vitrine pública: somente produtos ativos
create policy "publico le produtos ativos" on public.products
  for select to anon, authenticated using (active);
create policy "publico le imagens de produtos ativos" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.active));
create policy "publico le tamanhos de produtos ativos" on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.active));

-- Administradores gerenciam tudo
create policy "admin gerencia produtos" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gerencia imagens" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gerencia tamanhos" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin le clientes" on public.customers
  for select to authenticated using (public.is_admin());
create policy "admin gerencia pedidos" on public.orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin le itens de pedidos" on public.order_items
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: fotos dos produtos (leitura pública, escrita só de admin)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "admin envia fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "admin altera fotos" on storage.objects
  for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "admin remove fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'products' and public.is_admin());
