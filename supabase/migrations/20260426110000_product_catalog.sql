create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  base_price numeric(10, 2) not null default 0 check (base_price >= 0),
  image_path text,
  product_type text not null default 'simple' check (product_type in ('simple', 'combo')),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null default 0 check (price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  is_required boolean not null default false,
  selection_type text not null default 'single' check (selection_type in ('single', 'multiple')),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_group_range check (max_select >= min_select)
);

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.product_option_groups(id) on delete cascade,
  name text not null,
  extra_price numeric(10, 2) not null default 0 check (extra_price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_category_slug_idx
on public.products (category_id, slug);

create unique index if not exists product_variants_product_name_idx
on public.product_variants (product_id, name);

create unique index if not exists product_option_groups_product_name_idx
on public.product_option_groups (product_id, name);

create unique index if not exists product_options_group_name_idx
on public.product_options (option_group_id, name);

create index if not exists product_categories_public_idx
on public.product_categories (is_active, sort_order);

create index if not exists products_public_idx
on public.products (category_id, is_active, sort_order);

create index if not exists product_variants_public_idx
on public.product_variants (product_id, is_active, sort_order);

create index if not exists product_option_groups_public_idx
on public.product_option_groups (product_id, is_active, sort_order);

create index if not exists product_options_public_idx
on public.product_options (option_group_id, is_active, sort_order);

drop trigger if exists set_product_categories_updated_at on public.product_categories;
create trigger set_product_categories_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists set_product_option_groups_updated_at on public.product_option_groups;
create trigger set_product_option_groups_updated_at
before update on public.product_option_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_product_options_updated_at on public.product_options;
create trigger set_product_options_updated_at
before update on public.product_options
for each row execute function public.set_updated_at();

alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.product_options enable row level security;

drop policy if exists "Public can read active product categories" on public.product_categories;
create policy "Public can read active product categories"
on public.product_categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage product categories" on public.product_categories;
create policy "Admins can manage product categories"
on public.product_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.product_categories category
    where category.id = products.category_id
      and category.is_active = true
  )
);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
on public.product_variants
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.products product
    join public.product_categories category on category.id = product.category_id
    where product.id = product_variants.product_id
      and product.is_active = true
      and category.is_active = true
  )
);

drop policy if exists "Admins can manage product variants" on public.product_variants;
create policy "Admins can manage product variants"
on public.product_variants
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read active product option groups" on public.product_option_groups;
create policy "Public can read active product option groups"
on public.product_option_groups
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.products product
    join public.product_categories category on category.id = product.category_id
    where product.id = product_option_groups.product_id
      and product.is_active = true
      and category.is_active = true
  )
);

drop policy if exists "Admins can manage product option groups" on public.product_option_groups;
create policy "Admins can manage product option groups"
on public.product_option_groups
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read active product options" on public.product_options;
create policy "Public can read active product options"
on public.product_options
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.product_option_groups option_group
    join public.products product on product.id = option_group.product_id
    join public.product_categories category on category.id = product.category_id
    where option_group.id = product_options.option_group_id
      and option_group.is_active = true
      and product.is_active = true
      and category.is_active = true
  )
);

drop policy if exists "Admins can manage product options" on public.product_options;
create policy "Admins can manage product options"
on public.product_options
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "Public can read Eureka product media" on storage.objects;
create policy "Public can read Eureka product media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'products');

drop policy if exists "Admins can manage Eureka product media" on storage.objects;
create policy "Admins can manage Eureka product media"
on storage.objects
for all
to authenticated
using (bucket_id = 'products' and public.is_admin())
with check (bucket_id = 'products' and public.is_admin());

with seed_categories (name, slug, description, sort_order) as (
  values
    ('Pasteleria', 'pasteleria', 'Tortas, horneados, waffles y antojos dulces o salados.', 1),
    ('Cafes & Especiales', 'cafes-especiales', 'Bebidas calientes preparadas al momento.', 2),
    ('Infusiones & Tes', 'infusiones-tes', 'Infusiones herbales, tes y mezclas de casa.', 3),
    ('Vicios', 'vicios', 'Comida, alitas, burgers y platos para compartir.', 4),
    ('Bebidas Frias', 'bebidas-frias', 'Cafes frios, jugos, frappes y gaseosas.', 5),
    ('Bebidas con Alcohol', 'bebidas-con-alcohol', 'Cocteles y cervezas para mayores de edad.', 6),
    ('Combos', 'combos', 'Promos combinadas listas para pedir.', 7)
)
insert into public.product_categories (name, slug, description, sort_order, is_active)
select name, slug, description, sort_order, true
from seed_categories
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

with seed_products (category_slug, name, slug, description, base_price, product_type, sort_order) as (
  values
    ('pasteleria', 'Minicheesecake', 'minicheesecake', 'Frutos rojos, maracuya, Oreo, tiramisu, chocolate', 12, 'simple', 1),
    ('pasteleria', 'Brownie + helado', 'brownie-helado', null, 7, 'simple', 2),
    ('pasteleria', 'Galleta New York', 'galleta-new-york', 'Vainilla con chispas de chocolate', 7, 'simple', 3),
    ('pasteleria', 'Sonsos', 'sonsos', null, 0, 'simple', 4),
    ('pasteleria', 'Cunape', 'cunape', null, 6, 'simple', 5),
    ('pasteleria', 'Waffle salado', 'waffle-salado', 'Acompanado con huevo, tocino y syrup', 20, 'simple', 6),
    ('pasteleria', 'Waffle dulce', 'waffle-dulce', 'Acompanado con durazno, frutos rojos, syrup y crema', 20, 'simple', 7),
    ('cafes-especiales', 'Expresso', 'expresso', null, 10, 'simple', 1),
    ('cafes-especiales', 'Americano', 'americano', null, 14, 'simple', 2),
    ('cafes-especiales', 'Capuccino', 'capuccino', null, 18, 'simple', 3),
    ('cafes-especiales', 'Mokaccino', 'mokaccino', null, 22, 'simple', 4),
    ('cafes-especiales', 'Latte', 'latte', 'Cafe con leche, opciones de esencia', 20, 'simple', 5),
    ('cafes-especiales', 'Matcha Latte', 'matcha-latte', null, 18, 'simple', 6),
    ('cafes-especiales', 'Chai Latte', 'chai-latte', null, 20, 'simple', 7),
    ('cafes-especiales', 'Chocolate', 'chocolate', null, 0, 'simple', 8),
    ('infusiones-tes', 'Infusiones', 'infusiones', null, 15, 'simple', 1),
    ('infusiones-tes', 'Verbena de sabores', 'verbena-de-sabores', 'Manzanilla, jengibre, cedron, hierbabuena, rosas', 15, 'simple', 2),
    ('infusiones-tes', 'Especias de otono', 'especias-de-otono', 'Canela, clavo de olor, naranja, te negro', 15, 'simple', 3),
    ('infusiones-tes', 'Flores de campo', 'flores-de-campo', 'Buganvilla, calendula, manzanilla, lavanda, rosas', 15, 'simple', 4),
    ('infusiones-tes', 'Agradable y delicioso', 'agradable-y-delicioso', 'Flor de jamaica, flores de jazmin, lavanda, manzanilla, llanten', 15, 'simple', 5),
    ('vicios', 'Alitas', 'alitas', 'Alitas con opcion de salsas y preparacion', 0, 'simple', 1),
    ('combos', 'Combo alitas', 'combo-alitas', '6 alitas, 1 papa y 1 gaseosa', 45, 'combo', 1),
    ('vicios', 'Mini burger', 'mini-burger', null, 0, 'simple', 2),
    ('combos', 'Combo mini burger', 'combo-mini-burger', '5 miniburger, 1 papa y 1 gaseosa', 47, 'combo', 2),
    ('vicios', 'Papas frita', 'papas-frita', null, 12, 'simple', 3),
    ('vicios', 'Lasana', 'lasana', null, 35, 'simple', 4),
    ('vicios', 'Churrasco broaster', 'churrasco-broaster', 'Opcion res o cerdo. Incluye papas y arroz con queso', 35, 'simple', 5),
    ('bebidas-frias', 'Orange Coffee', 'orange-coffee', 'Expresso, jugo naranja y hielo', 18, 'simple', 1),
    ('bebidas-frias', 'Affogato', 'affogato', 'Expresso, helado de vainilla y toque chocolate', 20, 'simple', 2),
    ('bebidas-frias', 'Latte frio', 'latte-frio', 'Expresso doble, leche y hielo', 18, 'simple', 3),
    ('bebidas-frias', 'Latte esencia', 'latte-esencia', 'Expresso doble, esencia, leche y hielo. Amaretto, menta, caramelo', 20, 'simple', 4),
    ('bebidas-frias', 'Capuccino frappe', 'capuccino-frappe', null, 25, 'simple', 5),
    ('bebidas-frias', 'Frappuccino', 'frappuccino', 'Amaretto, menta, caramelo', 28, 'simple', 6),
    ('bebidas-frias', 'Frappe cheesecake', 'frappe-cheesecake', 'Oreo, frutos rojos, maracuya, tiramisu', 32, 'simple', 7),
    ('bebidas-frias', 'Chai latte frio', 'chai-latte-frio', 'Te Chai, leche y hielo', 18, 'simple', 8),
    ('bebidas-frias', 'Matcha latte', 'matcha-latte-frio', 'Te verde, leche y hielo', 18, 'simple', 9),
    ('bebidas-frias', 'Matcha esencia latte', 'matcha-esencia-latte', 'Te verde, esencia, leche y hielo. Amaretto, menta, caramelo, frutos rojos', 20, 'simple', 10),
    ('bebidas-frias', 'Jugos naturales 500 ml', 'jugos-naturales-500-ml', null, 12, 'simple', 11),
    ('bebidas-frias', 'Jugos naturales 2 lts', 'jugos-naturales-2-lts', 'Frutos rojos, frutilla, durazno, pina, guayaba, naranja', 30, 'simple', 12),
    ('bebidas-frias', 'Frappes de fruta 500 ml', 'frappes-de-fruta-500-ml', null, 18, 'simple', 13),
    ('bebidas-frias', 'Gaseosas 500 ml', 'gaseosas-500-ml', null, 9, 'simple', 14),
    ('bebidas-con-alcohol', 'Cerveza chop', 'cerveza-chop', null, 20, 'simple', 1),
    ('bebidas-con-alcohol', 'Mini cerveza', 'mini-cerveza', null, 8, 'simple', 2),
    ('bebidas-con-alcohol', '6pack mini', '6pack-mini', null, 40, 'simple', 3),
    ('bebidas-con-alcohol', 'Daiquiri', 'daiquiri', null, 25, 'simple', 4),
    ('bebidas-con-alcohol', 'Hoyo en uno', 'hoyo-en-uno', null, 30, 'simple', 5),
    ('bebidas-con-alcohol', 'Eureka cup', 'eureka-cup', null, 30, 'simple', 6),
    ('bebidas-con-alcohol', 'Eureka champions', 'eureka-champions', 'Fresa, pina o maracuya', 70, 'simple', 7)
)
insert into public.products (category_id, name, slug, description, base_price, product_type, sort_order, is_active)
select category.id, seed_products.name, seed_products.slug, seed_products.description, seed_products.base_price, seed_products.product_type, seed_products.sort_order, true
from seed_products
join public.product_categories category on category.slug = seed_products.category_slug
on conflict (category_id, slug) do update
set name = excluded.name,
    description = excluded.description,
    base_price = excluded.base_price,
    product_type = excluded.product_type,
    sort_order = excluded.sort_order;

with seed_variants (category_slug, product_slug, name, price, sort_order) as (
  values
    ('pasteleria', 'sonsos', 'Queso', 12, 1),
    ('pasteleria', 'sonsos', 'Charque', 15, 2),
    ('cafes-especiales', 'chocolate', 'S/L', 16, 1),
    ('cafes-especiales', 'chocolate', 'C/L', 22, 2),
    ('vicios', 'alitas', '6 piezas, 1 salsa', 28, 1),
    ('vicios', 'alitas', '12 piezas, 2 salsas', 52, 2),
    ('vicios', 'mini-burger', '5 mini burger', 30, 1),
    ('vicios', 'mini-burger', '10 mini burger', 56, 2)
)
insert into public.product_variants (product_id, name, price, sort_order, is_active)
select product.id, seed_variants.name, seed_variants.price, seed_variants.sort_order, true
from seed_variants
join public.product_categories category on category.slug = seed_variants.category_slug
join public.products product on product.category_id = category.id and product.slug = seed_variants.product_slug
on conflict (product_id, name) do update
set price = excluded.price,
    sort_order = excluded.sort_order;

with seed_groups (category_slug, product_slug, name, is_required, selection_type, min_select, max_select, sort_order) as (
  values
    ('vicios', 'alitas', 'Tipo de preparacion', true, 'single', 1, 1, 1),
    ('vicios', 'alitas', 'Salsa', true, 'multiple', 1, 2, 2),
    ('vicios', 'mini-burger', 'Salsa', false, 'single', 0, 1, 1),
    ('cafes-especiales', 'latte', 'Esencia', false, 'single', 0, 1, 1),
    ('pasteleria', 'waffle-dulce', 'Acompanamiento', false, 'multiple', 0, 4, 1),
    ('infusiones-tes', 'infusiones', 'Infusion', false, 'single', 0, 1, 1)
)
insert into public.product_option_groups (product_id, name, is_required, selection_type, min_select, max_select, sort_order, is_active)
select product.id, seed_groups.name, seed_groups.is_required, seed_groups.selection_type, seed_groups.min_select, seed_groups.max_select, seed_groups.sort_order, true
from seed_groups
join public.product_categories category on category.slug = seed_groups.category_slug
join public.products product on product.category_id = category.id and product.slug = seed_groups.product_slug
on conflict (product_id, name) do update
set is_required = excluded.is_required,
    selection_type = excluded.selection_type,
    min_select = excluded.min_select,
    max_select = excluded.max_select,
    sort_order = excluded.sort_order;

with seed_options (category_slug, product_slug, group_name, name, extra_price, sort_order) as (
  values
    ('vicios', 'alitas', 'Tipo de preparacion', 'Banadas', 0, 1),
    ('vicios', 'alitas', 'Tipo de preparacion', 'Sin banar', 0, 2),
    ('vicios', 'alitas', 'Salsa', 'Barbacoa', 0, 1),
    ('vicios', 'alitas', 'Salsa', 'Mostaza miel', 0, 2),
    ('vicios', 'alitas', 'Salsa', 'Picante', 0, 3),
    ('vicios', 'alitas', 'Salsa', 'Lemon pepper', 0, 4),
    ('vicios', 'mini-burger', 'Salsa', 'Barbacoa', 0, 1),
    ('vicios', 'mini-burger', 'Salsa', 'Mostaza miel', 0, 2),
    ('vicios', 'mini-burger', 'Salsa', 'Picante', 0, 3),
    ('cafes-especiales', 'latte', 'Esencia', 'Caramelo', 0, 1),
    ('cafes-especiales', 'latte', 'Esencia', 'Amaretto', 0, 2),
    ('cafes-especiales', 'latte', 'Esencia', 'Menta', 0, 3),
    ('pasteleria', 'waffle-dulce', 'Acompanamiento', 'Durazno', 0, 1),
    ('pasteleria', 'waffle-dulce', 'Acompanamiento', 'Frutos rojos', 0, 2),
    ('pasteleria', 'waffle-dulce', 'Acompanamiento', 'Syrup', 0, 3),
    ('pasteleria', 'waffle-dulce', 'Acompanamiento', 'Crema', 0, 4),
    ('infusiones-tes', 'infusiones', 'Infusion', 'Manzanilla', 0, 1),
    ('infusiones-tes', 'infusiones', 'Infusion', 'Jengibre', 0, 2),
    ('infusiones-tes', 'infusiones', 'Infusion', 'Cedron', 0, 3),
    ('infusiones-tes', 'infusiones', 'Infusion', 'Hierbabuena', 0, 4),
    ('infusiones-tes', 'infusiones', 'Infusion', 'Rosas', 0, 5),
    ('infusiones-tes', 'infusiones', 'Infusion', 'Lavanda', 0, 6)
)
insert into public.product_options (option_group_id, name, extra_price, sort_order, is_active)
select option_group.id, seed_options.name, seed_options.extra_price, seed_options.sort_order, true
from seed_options
join public.product_categories category on category.slug = seed_options.category_slug
join public.products product on product.category_id = category.id and product.slug = seed_options.product_slug
join public.product_option_groups option_group on option_group.product_id = product.id and option_group.name = seed_options.group_name
on conflict (option_group_id, name) do update
set extra_price = excluded.extra_price,
    sort_order = excluded.sort_order;
