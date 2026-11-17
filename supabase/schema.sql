-- ==============================================================================
-- OURATA SEMIJOIAS — ESTRUTURA OFICIAL DO BANCO DE DADOS SUPABASE (REVISADA)
-- Plataforma de E-commerce, Gestão de Estoque, Pedidos WhatsApp, Banho & Storage
-- ==============================================================================

-- 1. EXTENSÕES & CONFIGURAÇÕES
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. FUNÇÕES UTILITÁRIAS
-- ==============================================================================

-- Atualização automática de updated_at (search_path fixo para segurança)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ==============================================================================
-- 3. TABELA: PROFILES (Perfis de Clientes e Administradora)
-- ==============================================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text unique not null,
  phone text,
  cpf text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  is_verified boolean not null default false,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Verificação estrita de Administradora
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auxiliares sem recursão de RLS para proteger colunas sensíveis em profiles
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_verified()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_verified from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_email()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.profiles where id = auth.uid();
$$;

-- Trigger de proteção contra escalonamento de privilégio ou fraude em profiles
create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Operações internas/backend (service_role ou SQL Editor sem auth.uid()) são permitidas
  if auth.uid() is null then
    return new;
  end if;

  -- Apenas administradora pode alterar role, is_verified ou e-mail diretamente
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Operação bloqueada: clientes não podem alterar a própria permissão (role).';
    end if;
    if new.is_verified is distinct from old.is_verified then
      raise exception 'Operação bloqueada: clientes não podem alterar o status de verificação.';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Operação bloqueada: altere o e-mail pelo fluxo oficial de autenticação.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_sensitive_fields on public.profiles;
create trigger trg_protect_profile_sensitive_fields
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_fields();

-- Trigger para sincronizar novo usuário do auth.users com public.profiles
-- SEGURANÇA: TODO novo cadastro recebe role = 'customer' por padrão.
-- Nenhum usuário recebe 'admin' automaticamente por e-mail ou metadata no cadastro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role, is_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    'customer',
    coalesce(new.email_confirmed_at is not null, false)
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    is_verified = excluded.is_verified;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Procedimento seguro para promover a ÚNICA conta administradora inicial.
-- Deve ser executado exclusivamente via SQL Editor do Supabase ou backend service_role.
create or replace function public.promote_initial_admin(p_admin_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_confirmed_at timestamptz;
  v_existing_admin_count int;
begin
  -- Bloqueia execução por usuários comuns / browser (exige contexto privilegiado)
  if auth.uid() is not null then
    raise exception 'Acesso negado: promoção de administradora só pode ser executada pelo servidor ou SQL Editor.';
  end if;

  if p_admin_email is null or trim(p_admin_email) = '' then
    raise exception 'Informe um e-mail válido para promover a administradora.';
  end if;

  select count(*) into v_existing_admin_count
  from public.profiles
  where role = 'admin';

  if v_existing_admin_count > 0 then
    raise exception 'Já existe uma conta administradora configurada no sistema.';
  end if;

  select id, email_confirmed_at
  into v_user_id, v_confirmed_at
  from auth.users
  where lower(email) = lower(trim(p_admin_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário % ainda não foi cadastrado no Supabase Auth. Crie a conta primeiro.', p_admin_email;
  end if;

  if v_confirmed_at is null then
    raise exception 'O e-mail % ainda não foi confirmado no Supabase Auth. Confirme o e-mail antes da promoção.', p_admin_email;
  end if;

  update public.profiles
  set role = 'admin',
      is_verified = true,
      updated_at = now()
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'admin_id', v_user_id,
    'email', lower(trim(p_admin_email)),
    'message', 'Administradora inicial promovida com sucesso.'
  );
end;
$$;

revoke all on function public.promote_initial_admin(text) from public, anon, authenticated;

-- ==============================================================================
-- 4. TABELA: CATEGORIES (Categorias de Semijoias)
-- ==============================================================================
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  slug text unique not null,
  description text,
  display_order int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 5. TABELA: PRODUCTS (Cadastro de Semijoias)
-- ==============================================================================
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  sku text unique not null,
  name text not null,
  description text not null,
  category text not null,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10, 2) not null check (price >= 0),
  wholesale_price numeric(10, 2) not null check (wholesale_price >= 0),
  min_wholesale_qty int default 5 check (min_wholesale_qty >= 1),
  tiered_pricing jsonb default '[]'::jsonb,
  stock int not null default 0 check (stock >= 0),
  reserved_stock int not null default 0 check (reserved_stock >= 0),
  low_stock_alert int not null default 5 check (low_stock_alert >= 0),
  is_featured boolean default false,
  is_new_release boolean default false,
  is_offer boolean default false,
  plating_type text default 'Banho Ouro 18k (10 milésimos)',
  warranty text default '1 ano de garantia',
  min_purchase_qty int default 1 check (min_purchase_qty >= 1),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint chk_reserved_le_stock check (reserved_stock <= stock)
);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

-- ==============================================================================
-- 6. TABELA: PRODUCT_IMAGES (Fotos em Alta Resolução dos Produtos)
-- ==============================================================================
create table if not exists public.product_images (
  id uuid default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  display_order int default 0,
  is_primary boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 7. TABELA: ADDRESSES (Endereços dos Clientes)
-- ==============================================================================
create table if not exists public.addresses (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

drop trigger if exists set_addresses_updated_at on public.addresses;
create trigger set_addresses_updated_at
  before update on public.addresses
  for each row execute function public.handle_updated_at();

-- ==============================================================================
-- 8. TABELA: FAVORITES (Semijoias Favoritas dos Clientes)
-- ==============================================================================
create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (profile_id, product_id)
);

-- ==============================================================================
-- 9. TABELA: CARTS & CART_ITEMS (Carrinho de Compras Persistente)
-- ==============================================================================
create table if not exists public.carts (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

drop trigger if exists set_carts_updated_at on public.carts;
create trigger set_carts_updated_at
  before update on public.carts
  for each row execute function public.handle_updated_at();

create table if not exists public.cart_items (
  id uuid default gen_random_uuid() primary key,
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity >= 1),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (cart_id, product_id)
);

drop trigger if exists set_cart_items_updated_at on public.cart_items;
create trigger set_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.handle_updated_at();

-- ==============================================================================
-- 10. TABELA: ORDERS & ORDER_ITEMS (Pedidos Integrados ao WhatsApp)
-- ==============================================================================
create table if not exists public.orders (
  id text primary key, -- ex: OUR-2026-1042
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text,
  shipping_address jsonb not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  shipping_fee numeric(10, 2) not null default 0 check (shipping_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  is_wholesale_order boolean not null default false,
  status text not null default 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO' check (
    status in (
      'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO',
      'PAGAMENTO CONFIRMADO',
      'PEDIDO EM SEPARAÇÃO',
      'PEDIDO ENVIADO',
      'PEDIDO ENTREGUE',
      'PEDIDO CANCELADO'
    )
  ),
  payment_method_notes text default 'A combinar pelo WhatsApp (+55 19 98806-4749)',
  whatsapp_message text,
  whatsapp_url text,
  reservation_expires_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text not null,
  image text,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity int not null check (quantity >= 1),
  is_wholesale_applied boolean default false,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 11. TABELA: STOCK_MOVEMENTS (Rastreabilidade e Auditoria de Estoque)
-- ==============================================================================
create table if not exists public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade,
  product_name text not null,
  sku text not null,
  type text not null check (
    type in ('ENTRADA', 'SAIDA_CONFIRMADA', 'RESERVA', 'LIBERACAO_CANCELAMENTO', 'AJUSTE_MANUAL')
  ),
  quantity int not null,
  previous_stock int not null check (previous_stock >= 0),
  new_stock int not null check (new_stock >= 0),
  order_id text references public.orders(id) on delete set null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 12. TABELA: PLATING_SERVICES (Serviços Especializados de Banho em Semijoias)
-- ==============================================================================
create table if not exists public.plating_services (
  id uuid default gen_random_uuid() primary key,
  protocol text unique not null, -- ex: SB-2026-0042
  profile_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  piece_type text not null,
  quantity int not null default 1 check (quantity >= 1),
  bath_type text not null,
  observations text,
  photo_url text,
  status text not null default 'Solicitação recebida' check (
    status in (
      'Solicitação recebida',
      'Aguardando recebimento',
      'Peças recebidas',
      'Em análise',
      'Em processo de banho',
      'Serviço concluído',
      'Aguardando envio',
      'Devolvido'
    )
  ),
  estimated_days int default 7 check (estimated_days >= 1),
  price_quote numeric(10, 2) check (price_quote is null or price_quote >= 0),
  history jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

drop trigger if exists set_plating_services_updated_at on public.plating_services;
create trigger set_plating_services_updated_at
  before update on public.plating_services
  for each row execute function public.handle_updated_at();

-- ==============================================================================
-- 13. FUNÇÕES TRANSACIONAIS DE PEDIDOS E CONTROLE DE ESTOQUE (SEGURAS)
-- ==============================================================================

-- 13.1 Reservar estoque atomicamente com bloqueio de linha (FOR UPDATE)
create or replace function public.reserve_product_stock(
  p_product_id uuid,
  p_quantity int,
  p_order_id text default null,
  p_reason text default 'Reserva temporária de pedido'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prod public.products%rowtype;
  v_available int;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Acesso negado: operação direta de reserva restrita ao servidor.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade inválida para reserva (%).', p_quantity;
  end if;

  select * into v_prod
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Produto não encontrado para reserva (%).', p_product_id;
  end if;

  v_available := v_prod.stock - v_prod.reserved_stock;
  if v_available < p_quantity then
    raise exception 'Estoque disponível insuficiente para "%": disponível % un, solicitado % un.',
      v_prod.name, greatest(0, v_available), p_quantity;
  end if;

  update public.products
  set reserved_stock = reserved_stock + p_quantity,
      updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements (
    product_id, product_name, sku, type, quantity, previous_stock, new_stock, order_id, reason
  ) values (
    v_prod.id,
    v_prod.name,
    v_prod.sku,
    'RESERVA',
    p_quantity,
    v_prod.stock,
    v_prod.stock,
    p_order_id,
    coalesce(nullif(trim(p_reason), ''), 'Reserva temporária de estoque')
  );

  return jsonb_build_object(
    'product_id', v_prod.id,
    'stock', v_prod.stock,
    'reserved_stock', v_prod.reserved_stock + p_quantity,
    'available', v_available - p_quantity
  );
end;
$$;

revoke all on function public.reserve_product_stock(uuid, int, text, text) from public, anon, authenticated;

-- 13.2 Criação transacional segura de pedido + itens + reserva de estoque
-- Preços, descontos, subtotais e disponibilidade são calculados/validados no banco.
create or replace function public.create_order_secure(
  p_order_id text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_cpf text default null,
  p_shipping_address jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb,
  p_discount numeric default 0,
  p_shipping_fee numeric default 0,
  p_notes text default null,
  p_whatsapp_message text default null,
  p_whatsapp_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_privileged boolean;
  v_effective_customer_id uuid;
  v_order_id text;
  v_discount numeric(10, 2);
  v_shipping_fee numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_total numeric(10, 2) := 0;
  v_is_wholesale_order boolean := false;
  v_expires_at timestamptz := now() + interval '48 hours';
  v_item record;
  v_prod public.products%rowtype;
  v_available int;
  v_unit_price numeric(10, 2);
  v_tier_price numeric(10, 2);
  v_item_wholesale boolean;
  v_item_subtotal numeric(10, 2);
  v_primary_image text;
begin
  v_is_privileged := (auth.uid() is null or public.is_admin());

  if not v_is_privileged then
    if auth.uid() is null then
      raise exception 'Autenticação necessária para registrar pedido.';
    end if;
    -- Cliente autenticado só pode criar pedido para si mesmo, sem manipular desconto/frete
    v_effective_customer_id := auth.uid();
    v_discount := 0;
    v_shipping_fee := 0;
  else
    v_effective_customer_id := p_customer_id;
    v_discount := greatest(coalesce(p_discount, 0), 0);
    v_shipping_fee := greatest(coalesce(p_shipping_fee, 0), 0);
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'O pedido deve conter pelo menos 1 item.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as e
    where (e->>'product_id') is null or coalesce((e->>'quantity')::int, 0) <= 0
  ) then
    raise exception 'Todos os itens devem informar product_id válido e quantidade maior que zero.';
  end if;

  v_order_id := coalesce(
    nullif(trim(p_order_id), ''),
    'OUR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0')
  );

  insert into public.orders (
    id,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    shipping_address,
    subtotal,
    discount,
    shipping_fee,
    total,
    is_wholesale_order,
    status,
    whatsapp_message,
    whatsapp_url,
    reservation_expires_at,
    notes
  ) values (
    v_order_id,
    v_effective_customer_id,
    trim(p_customer_name),
    lower(trim(p_customer_email)),
    trim(p_customer_phone),
    p_customer_cpf,
    coalesce(p_shipping_address, '{}'::jsonb),
    0,
    v_discount,
    v_shipping_fee,
    0,
    false,
    'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO',
    p_whatsapp_message,
    p_whatsapp_url,
    v_expires_at,
    p_notes
  );

  -- Agrupa e bloqueia produtos em ordem determinística para evitar deadlocks
  for v_item in
    select
      (e->>'product_id')::uuid as product_id,
      sum((e->>'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) as e
    group by (e->>'product_id')::uuid
    order by (e->>'product_id')::uuid
  loop
    select * into v_prod
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'Produto não encontrado no catálogo (%).', v_item.product_id;
    end if;

    if v_item.quantity < coalesce(v_prod.min_purchase_qty, 1) then
      raise exception 'Quantidade mínima para "%" é de % unidade(s).',
        v_prod.name, v_prod.min_purchase_qty;
    end if;

    v_available := v_prod.stock - v_prod.reserved_stock;
    if v_available < v_item.quantity then
      raise exception 'Estoque indisponível para "%". Disponível: % un., solicitado: % un.',
        v_prod.name, greatest(0, v_available), v_item.quantity;
    end if;

    -- Cálculo autoritativo de preço no banco
    v_unit_price := v_prod.price;
    v_item_wholesale := false;

    if v_item.quantity >= coalesce(v_prod.min_wholesale_qty, 5) then
      v_unit_price := v_prod.wholesale_price;
      v_item_wholesale := true;
    end if;

    v_tier_price := null;
    if jsonb_typeof(v_prod.tiered_pricing) = 'array' and jsonb_array_length(v_prod.tiered_pricing) > 0 then
      select (t->>'unitPrice')::numeric(10, 2)
      into v_tier_price
      from jsonb_array_elements(v_prod.tiered_pricing) as t
      where (t->>'minQty')::int <= v_item.quantity
      order by (t->>'minQty')::int desc
      limit 1;

      if v_tier_price is not null and v_tier_price >= 0 then
        v_unit_price := v_tier_price;
        if v_unit_price < v_prod.price then
          v_item_wholesale := true;
        end if;
      end if;
    end if;

    if v_item_wholesale then
      v_is_wholesale_order := true;
    end if;

    v_item_subtotal := round(v_unit_price * v_item.quantity, 2);
    v_subtotal := v_subtotal + v_item_subtotal;

    select image_url into v_primary_image
    from public.product_images
    where product_id = v_prod.id
    order by is_primary desc, display_order asc
    limit 1;

    insert into public.order_items (
      order_id, product_id, product_name, sku, image, unit_price, quantity, is_wholesale_applied, subtotal
    ) values (
      v_order_id,
      v_prod.id,
      v_prod.name,
      v_prod.sku,
      v_primary_image,
      v_unit_price,
      v_item.quantity,
      v_item_wholesale,
      v_item_subtotal
    );

    -- Reserva estoque e registra movimentação na mesma transação
    update public.products
    set reserved_stock = reserved_stock + v_item.quantity,
        updated_at = now()
    where id = v_prod.id;

    insert into public.stock_movements (
      product_id, product_name, sku, type, quantity, previous_stock, new_stock, order_id, reason
    ) values (
      v_prod.id,
      v_prod.name,
      v_prod.sku,
      'RESERVA',
      v_item.quantity,
      v_prod.stock,
      v_prod.stock,
      v_order_id,
      'Reserva temporária para pedido ' || v_order_id
    );
  end loop;

  v_total := greatest(0, round(v_subtotal - v_discount + v_shipping_fee, 2));

  update public.orders
  set subtotal = v_subtotal,
      total = v_total,
      is_wholesale_order = v_is_wholesale_order,
      updated_at = now()
  where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping_fee', v_shipping_fee,
    'total', v_total,
    'is_wholesale_order', v_is_wholesale_order,
    'status', 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO',
    'reservation_expires_at', v_expires_at
  );
end;
$$;

revoke all on function public.create_order_secure(
  text, uuid, text, text, text, text, jsonb, jsonb, numeric, numeric, text, text, text
) from public, anon;
grant execute on function public.create_order_secure(
  text, uuid, text, text, text, text, jsonb, jsonb, numeric, numeric, text, text, text
) to authenticated, service_role;

-- 13.3 Confirmar pagamento manualmente e efetivar baixa definitiva de estoque
create or replace function public.confirm_order_payment_and_stock(
  p_order_id text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_prod public.products%rowtype;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Acesso negado: apenas a administradora pode confirmar pagamento e efetivar baixa de estoque.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido % não encontrado.', p_order_id;
  end if;

  if v_order.status <> 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO' then
    raise exception 'O pedido % não está aguardando confirmação de pagamento (status atual: %).',
      p_order_id, v_order.status;
  end if;

  for v_item in
    select product_id, sum(quantity)::int as quantity
    from public.order_items
    where order_id = p_order_id and product_id is not null
    group by product_id
    order by product_id
  loop
    select * into v_prod
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'Produto % do pedido não encontrado.', v_item.product_id;
    end if;

    if v_prod.stock < v_item.quantity then
      raise exception 'Estoque físico insuficiente para baixar "%" (estoque: %, pedido: %).',
        v_prod.name, v_prod.stock, v_item.quantity;
    end if;

    update public.products
    set stock = stock - v_item.quantity,
        reserved_stock = greatest(0, reserved_stock - v_item.quantity),
        updated_at = now()
    where id = v_prod.id;

    insert into public.stock_movements (
      product_id, product_name, sku, type, quantity, previous_stock, new_stock, order_id, reason
    ) values (
      v_prod.id,
      v_prod.name,
      v_prod.sku,
      'SAIDA_CONFIRMADA',
      v_item.quantity,
      v_prod.stock,
      v_prod.stock - v_item.quantity,
      p_order_id,
      coalesce(nullif(trim(p_notes), ''), 'Baixa de estoque após confirmação manual do pagamento do pedido ' || p_order_id)
    );
  end loop;

  update public.orders
  set status = 'PAGAMENTO CONFIRMADO',
      reservation_expires_at = null,
      notes = coalesce(nullif(trim(p_notes), ''), notes),
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'PAGAMENTO CONFIRMADO'
  );
end;
$$;

revoke all on function public.confirm_order_payment_and_stock(text, text) from public, anon;
grant execute on function public.confirm_order_payment_and_stock(text, text) to authenticated, service_role;

-- 13.4 Cancelar pedido e liberar reservas (ou estornar estoque se pagamento já confirmado)
create or replace function public.cancel_order_and_release_stock(
  p_order_id text,
  p_reason text default 'Pedido cancelado'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_prod public.products%rowtype;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Acesso negado: apenas a administradora pode cancelar pedidos e liberar estoque.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido % não encontrado.', p_order_id;
  end if;

  if v_order.status = 'PEDIDO CANCELADO' then
    raise exception 'O pedido % já está cancelado.', p_order_id;
  end if;

  for v_item in
    select product_id, sum(quantity)::int as quantity
    from public.order_items
    where order_id = p_order_id and product_id is not null
    group by product_id
    order by product_id
  loop
    select * into v_prod
    from public.products
    where id = v_item.product_id
    for update;

    if found then
      if v_order.status = 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO' then
        -- Libera somente a reserva temporária
        update public.products
        set reserved_stock = greatest(0, reserved_stock - v_item.quantity),
            updated_at = now()
        where id = v_prod.id;

        insert into public.stock_movements (
          product_id, product_name, sku, type, quantity, previous_stock, new_stock, order_id, reason
        ) values (
          v_prod.id,
          v_prod.name,
          v_prod.sku,
          'LIBERACAO_CANCELAMENTO',
          v_item.quantity,
          v_prod.stock,
          v_prod.stock,
          p_order_id,
          coalesce(nullif(trim(p_reason), ''), 'Liberação de reserva por cancelamento do pedido ' || p_order_id)
        );
      else
        -- Pedido já tinha pagamento confirmado: estorna ao estoque físico
        update public.products
        set stock = stock + v_item.quantity,
            updated_at = now()
        where id = v_prod.id;

        insert into public.stock_movements (
          product_id, product_name, sku, type, quantity, previous_stock, new_stock, order_id, reason
        ) values (
          v_prod.id,
          v_prod.name,
          v_prod.sku,
          'LIBERACAO_CANCELAMENTO',
          v_item.quantity,
          v_prod.stock,
          v_prod.stock + v_item.quantity,
          p_order_id,
          coalesce(nullif(trim(p_reason), ''), 'Estorno de estoque por cancelamento do pedido ' || p_order_id)
        );
      end if;
    end if;
  end loop;

  update public.orders
  set status = 'PEDIDO CANCELADO',
      reservation_expires_at = null,
      notes = coalesce(nullif(trim(p_reason), ''), notes),
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'PEDIDO CANCELADO'
  );
end;
$$;

revoke all on function public.cancel_order_and_release_stock(text, text) from public, anon;
grant execute on function public.cancel_order_and_release_stock(text, text) to authenticated, service_role;

-- 13.5 Liberar automaticamente reservas de pedidos expirados
create or replace function public.release_expired_order_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count int := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Acesso negado: operação restrita à administradora ou rotina de servidor.';
  end if;

  for v_order in
    select id
    from public.orders
    where status = 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO'
      and reservation_expires_at is not null
      and reservation_expires_at < now()
    order by reservation_expires_at asc
    for update skip locked
  loop
    perform public.cancel_order_and_release_stock(
      v_order.id,
      'Reserva expirada automaticamente após o prazo limite.'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.release_expired_order_reservations() from public, anon;
grant execute on function public.release_expired_order_reservations() to authenticated, service_role;

-- 13.6 Ajuste manual seguro de estoque (impede estoque negativo ou abaixo da reserva)
create or replace function public.adjust_product_stock(
  p_product_id uuid,
  p_new_stock int,
  p_reason text default 'Ajuste manual pela administradora'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prod public.products%rowtype;
  v_diff int;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Acesso negado: apenas a administradora pode ajustar o estoque.';
  end if;

  if p_new_stock is null or p_new_stock < 0 then
    raise exception 'O estoque não pode ser negativo.';
  end if;

  select * into v_prod
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Produto não encontrado (%).', p_product_id;
  end if;

  if p_new_stock < v_prod.reserved_stock then
    raise exception 'Não é possível definir estoque (%) menor que a quantidade atualmente reservada em pedidos aguardando pagamento (%).',
      p_new_stock, v_prod.reserved_stock;
  end if;

  v_diff := abs(p_new_stock - v_prod.stock);

  update public.products
  set stock = p_new_stock,
      updated_at = now()
  where id = p_product_id;

  insert into public.stock_movements (
    product_id, product_name, sku, type, quantity, previous_stock, new_stock, reason
  ) values (
    v_prod.id,
    v_prod.name,
    v_prod.sku,
    case when p_new_stock > v_prod.stock then 'ENTRADA' else 'AJUSTE_MANUAL' end,
    v_diff,
    v_prod.stock,
    p_new_stock,
    coalesce(nullif(trim(p_reason), ''), 'Ajuste manual de estoque')
  );

  return jsonb_build_object(
    'product_id', v_prod.id,
    'previous_stock', v_prod.stock,
    'new_stock', p_new_stock,
    'reserved_stock', v_prod.reserved_stock
  );
end;
$$;

revoke all on function public.adjust_product_stock(uuid, int, text) from public, anon;
grant execute on function public.adjust_product_stock(uuid, int, text) to authenticated, service_role;

-- ==============================================================================
-- 14. ÍNDICES DE PERFORMANCE
-- ==============================================================================
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_is_featured on public.products(is_featured);
create index if not exists idx_product_images_product on public.product_images(product_id);
create index if not exists idx_addresses_profile on public.addresses(profile_id);
create index if not exists idx_favorites_profile on public.favorites(profile_id);
create index if not exists idx_carts_profile on public.carts(profile_id);
create index if not exists idx_cart_items_cart on public.cart_items(cart_id);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_reservation_exp on public.orders(reservation_expires_at)
  where status = 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO';
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
create index if not exists idx_plating_protocol on public.plating_services(protocol);
create index if not exists idx_plating_profile on public.plating_services(profile_id);

-- ==============================================================================
-- 15. ROW LEVEL SECURITY (RLS) - SEGURANÇA EM TODAS AS 12 TABELAS
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.addresses enable row level security;
alter table public.favorites enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.plating_services enable row level security;

-- POLÍTICAS: PROFILES (Proteção de role, is_verified, CPF, e-mail e telefone)
drop policy if exists "Perfis visíveis pelo próprio usuário ou admin" on public.profiles;
create policy "Perfis visíveis pelo próprio usuário ou admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Apenas admin insere perfis manualmente" on public.profiles;
create policy "Apenas admin insere perfis manualmente"
  on public.profiles for insert
  with check (public.is_admin());

drop policy if exists "Usuários atualizam seus próprios dados (exceto role)" on public.profiles;
drop policy if exists "Usuários atualizam seus próprios dados (exceto role, email e verificação)" on public.profiles;
create policy "Usuários atualizam seus próprios dados (exceto role, email e verificação)"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (
    public.is_admin()
    or (
      auth.uid() = id
      and role = 'customer'
      and role = public.get_my_role()
      and is_verified = public.get_my_verified()
      and email = public.get_my_email()
    )
  );

drop policy if exists "Apenas admin remove perfis" on public.profiles;
create policy "Apenas admin remove perfis"
  on public.profiles for delete
  using (public.is_admin());

-- POLÍTICAS: CATEGORIES, PRODUCTS & PRODUCT_IMAGES (Leitura pública, escrita apenas Admin)
drop policy if exists "Catálogo público para visualização" on public.categories;
create policy "Catálogo público para visualização"
  on public.categories for select using (true);

drop policy if exists "Admin gerencia categorias" on public.categories;
create policy "Admin gerencia categorias"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Produtos visíveis para todos" on public.products;
create policy "Produtos visíveis para todos"
  on public.products for select using (true);

drop policy if exists "Admin gerencia produtos" on public.products;
create policy "Admin gerencia produtos"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Fotos de produtos visíveis para todos" on public.product_images;
create policy "Fotos de produtos visíveis para todos"
  on public.product_images for select using (true);

drop policy if exists "Admin gerencia fotos" on public.product_images;
create policy "Admin gerencia fotos"
  on public.product_images for all
  using (public.is_admin())
  with check (public.is_admin());

-- POLÍTICAS: ADDRESSES (Estritamente do próprio cliente ou admin)
drop policy if exists "Clientes gerenciam seus próprios endereços" on public.addresses;
create policy "Clientes gerenciam seus próprios endereços"
  on public.addresses for all
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- POLÍTICAS: FAVORITES (Estritamente do próprio cliente ou admin)
drop policy if exists "Clientes gerenciam seus próprios favoritos" on public.favorites;
create policy "Clientes gerenciam seus próprios favoritos"
  on public.favorites for all
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- POLÍTICAS: CARTS & CART_ITEMS (Estritamente do próprio cliente ou admin)
drop policy if exists "Clientes gerenciam seu próprio carrinho" on public.carts;
create policy "Clientes gerenciam seu próprio carrinho"
  on public.carts for all
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Clientes gerenciam itens do seu carrinho" on public.cart_items;
create policy "Clientes gerenciam itens do seu carrinho"
  on public.cart_items for all
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and (carts.profile_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and (carts.profile_id = auth.uid() or public.is_admin())
    )
  );

-- POLÍTICAS: ORDERS & ORDER_ITEMS
-- Clientes só visualizam seus próprios pedidos.
-- Inserção direta via cliente bloqueada: criação passa por create_order_secure() ou backend service_role.
drop policy if exists "Clientes visualizam seus próprios pedidos e Admin visualiza todos" on public.orders;
create policy "Clientes visualizam seus próprios pedidos e Admin visualiza todos"
  on public.orders for select
  using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "Clientes criam pedidos para si mesmos" on public.orders;
drop policy if exists "Apenas Administradora ou backend insere pedidos diretamente" on public.orders;
create policy "Apenas Administradora ou backend insere pedidos diretamente"
  on public.orders for insert
  with check (public.is_admin());

drop policy if exists "Apenas Administradora altera status e gerencia pedidos" on public.orders;
create policy "Apenas Administradora altera status e gerencia pedidos"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Apenas Administradora remove pedidos" on public.orders;
create policy "Apenas Administradora remove pedidos"
  on public.orders for delete
  using (public.is_admin());

drop policy if exists "Itens de pedidos visíveis pelos proprietários ou Admin" on public.order_items;
create policy "Itens de pedidos visíveis pelos proprietários ou Admin"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and (orders.customer_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "Inserção de itens de pedido permitida durante criação" on public.order_items;
drop policy if exists "Apenas Administradora ou backend insere itens diretamente" on public.order_items;
create policy "Apenas Administradora ou backend insere itens diretamente"
  on public.order_items for insert
  with check (public.is_admin());

drop policy if exists "Apenas Administradora altera itens de pedido" on public.order_items;
create policy "Apenas Administradora altera itens de pedido"
  on public.order_items for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Apenas Administradora remove itens de pedido" on public.order_items;
create policy "Apenas Administradora remove itens de pedido"
  on public.order_items for delete
  using (public.is_admin());

-- POLÍTICAS: STOCK_MOVEMENTS (Restrito exclusivamente à Administradora)
drop policy if exists "Apenas Administradora visualiza histórico de estoque" on public.stock_movements;
create policy "Apenas Administradora visualiza histórico de estoque"
  on public.stock_movements for select
  using (public.is_admin());

drop policy if exists "Apenas Administradora registra movimentações de estoque" on public.stock_movements;
create policy "Apenas Administradora registra movimentações de estoque"
  on public.stock_movements for insert
  with check (public.is_admin());

drop policy if exists "Apenas Administradora altera movimentações de estoque" on public.stock_movements;
create policy "Apenas Administradora altera movimentações de estoque"
  on public.stock_movements for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Apenas Administradora remove movimentações de estoque" on public.stock_movements;
create policy "Apenas Administradora remove movimentações de estoque"
  on public.stock_movements for delete
  using (public.is_admin());

-- POLÍTICAS: PLATING_SERVICES (Serviços de Banho)
drop policy if exists "Clientes consultam seus serviços e Admin gerencia todos" on public.plating_services;
create policy "Clientes consultam seus serviços e Admin gerencia todos"
  on public.plating_services for select
  using (
    profile_id = auth.uid()
    or (
      coalesce((auth.jwt() ->> 'email_verified')::boolean, false) = true
      and lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    or public.is_admin()
  );

drop policy if exists "Clientes registram solicitações de banho" on public.plating_services;
create policy "Clientes registram solicitações de banho"
  on public.plating_services for insert
  with check (
    public.is_admin()
    or (
      status = 'Solicitação recebida'
      and price_quote is null
      and (profile_id is null or profile_id = auth.uid())
    )
  );

drop policy if exists "Apenas Administradora atualiza status do banho" on public.plating_services;
create policy "Apenas Administradora atualiza status do banho"
  on public.plating_services for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Apenas Administradora remove serviços de banho" on public.plating_services;
create policy "Apenas Administradora remove serviços de banho"
  on public.plating_services for delete
  using (public.is_admin());

-- ==============================================================================
-- 16. SUPABASE STORAGE — BUCKET & POLÍTICAS PARA IMAGENS DOS PRODUTOS
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB por imagem
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Leitura pública das imagens de produtos" on storage.objects;
create policy "Leitura pública das imagens de produtos"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Apenas Administradora envia imagens de produtos" on storage.objects;
create policy "Apenas Administradora envia imagens de produtos"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Apenas Administradora substitui imagens de produtos" on storage.objects;
create policy "Apenas Administradora substitui imagens de produtos"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Apenas Administradora exclui imagens de produtos" on storage.objects;
create policy "Apenas Administradora exclui imagens de produtos"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- ==============================================================================
-- 17. DADOS INICIAIS (CATEGORIAS OFICIAIS OURATA)
-- ==============================================================================
insert into public.categories (name, slug, description, display_order)
values
  ('Brincos', 'brincos', 'Brincos clássicos, gotas, ear cufs e argolas com banho 10 milésimos', 1),
  ('Colares', 'colares', 'Chockers, rivieras, venezianas e pingentes sofisticados', 2),
  ('Pulseiras', 'pulseiras', 'Pulseiras de elos, rivieras de zircônias e braceletes estruturados', 3),
  ('Anéis', 'aneis', 'Solitários, aparadores e anéis cravejados de alta joalheria', 4),
  ('Conjuntos', 'conjuntos', 'Combinações harmoniosas e prontas para ocasiões especiais', 5),
  ('Tornozeleiras', 'tornozeleiras', 'Delicadeza com pontos de luz e elos finos diamantados', 6),
  ('Pingentes', 'pingentes', 'Símbolos atemporais e medalhas marteladas com zircônias', 7),
  ('Outros', 'outros', 'Acessórios exclusivos e serviços especiais do ateliê Ourata', 8)
on conflict (name) do nothing;

-- ==============================================================================
-- 18. INSTRUÇÃO PÓS-EXECUÇÃO (PROMOÇÃO SEGURA DA ADMINISTRADORA INICIAL)
-- ==============================================================================
-- Após criar e confirmar o e-mail da conta da proprietária no Supabase Auth,
-- execute manualmente no SQL Editor (apenas 1 vez):
--   select public.promote_initial_admin('ouratasemijoias@gmail.com');
