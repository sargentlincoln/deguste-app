-- Enable PostGIS
create extension if not exists postgis schema extensions;

-- RESTAURANTS
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique,
  name text not null,
  slug text unique not null,
  description text,
  address text not null,
  city text not null,
  state text not null,
  lat double precision not null,
  lng double precision not null,
  location geography(point),
  phone text,
  whatsapp text,
  instagram text,
  website text,
  categories text[],
  tags text[],
  price_level int check (price_level between 1 and 4),
  rating_avg double precision default 0,
  rating_count int default 0,
  photos jsonb default '[]',
  opening_hours jsonb,
  attributes jsonb,
  video_url text,
  status text default 'active' check (status in ('active', 'pending', 'inactive')),
  is_verified boolean default false,
  badges text[],
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for location search
create index restaurants_location_idx on public.restaurants using gist (location);
create index restaurants_categories_idx on public.restaurants using gin (categories);

-- USERS (Profiles)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  preferences jsonb default '{}',
  stats jsonb default '{"total_points": 0, "current_streak": 0, "max_streak": 0, "total_savings": 0, "reviews_count": 0}',
  points int default 0,
  level text default 'Aprendiz',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- VIDEOS (Shorts)
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  duration_seconds int,
  views_count int default 0,
  likes_count int default 0,
  tags text[],
  status text default 'active' check (status in ('active', 'pending', 'removed')),
  created_at timestamptz default now()
);

-- COUPONS
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  discount_type text check (discount_type in ('percentage', 'fixed', 'freebie')),
  discount_value double precision not null,
  min_order_value double precision,
  max_redemptions int,
  current_redemptions int default 0,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  status text default 'active' check (status in ('active', 'expired', 'paused')),
  created_at timestamptz default now()
);

-- FAVORITES
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, restaurant_id)
);

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  rating int check (rating between 1 and 5),
  comment text,
  photo_url text,
  created_at timestamptz default now()
);

-- RLS POLICIES
alter table public.restaurants enable row level security;
alter table public.users enable row level security;
alter table public.videos enable row level security;
alter table public.coupons enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;

-- Public read access
create policy "Public restaurants are viewable by everyone" on public.restaurants for select using (true);
create policy "Public videos are viewable by everyone" on public.videos for select using (true);
create policy "Public coupons are viewable by everyone" on public.coupons for select using (true);
create policy "Reviews are viewable by everyone" on public.reviews for select using (true);

-- User specific access
create policy "Users can view their own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

create policy "Users can view their own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can insert their own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete their own favorites" on public.favorites for delete using (auth.uid() = user_id);

create policy "Users can insert their own reviews" on public.reviews for insert with check (auth.uid() = user_id);

-- MENU ITEMS
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  name text not null,
  description text,
  price double precision not null,
  image_url text,
  category text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'preparing', 'delivering', 'completed', 'cancelled')),
  total_amount double precision not null,
  delivery_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ORDER ITEMS
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  menu_item_id uuid references public.menu_items(id) on delete cascade not null,
  quantity int not null check (quantity > 0),
  unit_price double precision not null,
  special_instructions text,
  created_at timestamptz default now()
);

-- RLS POLICIES FOR NEW TABLES
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Menu items are public
create policy "Public menu items are viewable by everyone" on public.menu_items for select using (true);

-- Users can view their own orders
create policy "Users can view their own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users can insert their own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Users can update their own orders" on public.orders for update using (auth.uid() = user_id);

-- Users can view their own order items through orders table (or simpler: view all their own order items if user_id was stored, but we can do a nested check or just allow insert for now)
create policy "Users can view order items for their orders" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "Users can insert order items for their orders" on public.order_items for insert with check (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);

-- =============================================
-- FUTURE: Restaurant Guru-inspired enhancements
-- (Uncomment and run as migrations when needed)
-- =============================================

-- Restaurant badges/awards (Top 5 Pizzaria, Melhor Avaliado, etc.)
-- create table public.badges (
--   id uuid primary key default gen_random_uuid(),
--   restaurant_id uuid references public.restaurants(id) on delete cascade not null,
--   title text not null,
--   badge_type text not null default 'ranking', -- 'ranking', 'award', 'certification'
--   month_year text not null, -- e.g. '2026-02'
--   icon_url text,
--   created_at timestamptz default now()
-- );

-- External ratings aggregation (Google, Yelp, TripAdvisor, etc.)
-- create table public.external_ratings (
--   id uuid primary key default gen_random_uuid(),
--   restaurant_id uuid references public.restaurants(id) on delete cascade not null,
--   source text not null, -- 'google', 'yelp', 'tripadvisor'
--   rating numeric(2,1) not null check (rating between 1 and 5),
--   review_count int default 0,
--   last_synced_at timestamptz default now(),
--   created_at timestamptz default now(),
--   unique(restaurant_id, source)
-- );
