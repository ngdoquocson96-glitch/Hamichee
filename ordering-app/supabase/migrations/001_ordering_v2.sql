-- HAMICHEE Ordering v2. Chạy toàn bộ file này một lần trong Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.ordering_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('admin','customer')),
  points integer not null default 0 check (points >= 0),
  crm_notes text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ordering_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.ordering_profiles(id) on delete cascade,
  label text not null default 'Địa chỉ nhận hàng',
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  ward text not null,
  district text not null,
  city text not null,
  delivery_note text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ordering_one_default_address
  on public.ordering_addresses(customer_id) where is_default;

create table if not exists public.ordering_categories (
  id text primary key,
  name text not null,
  sort_order integer not null default 0,
  image_position text not null default 'center',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.ordering_products (
  id text primary key,
  category_id text not null references public.ordering_categories(id),
  name text not null,
  price integer not null check (price >= 0),
  image_url text,
  image_position text,
  featured boolean not null default false,
  active boolean not null default true,
  variants jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.ordering_loyalty_tiers (
  id text primary key,
  name text not null,
  min_points integer not null check (min_points >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 30),
  color text not null default '#00783e',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.ordering_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid not null references public.ordering_profiles(id),
  customer_name text not null,
  phone text not null,
  fulfilment_method text not null check (fulfilment_method in ('delivery','pickup')),
  delivery_address jsonb,
  note text not null default '',
  subtotal integer not null check (subtotal >= 0),
  discount_percent numeric(5,2) not null default 0,
  discount_amount integer not null default 0,
  delivery_fee integer not null default 0,
  total integer not null check (total >= 0),
  points_earned integer not null default 0,
  tier_name text not null default 'Thành viên',
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation','confirmed','preparing','delivering','ready_for_pickup','completed','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','reported','paid','unpaid','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ordering_orders_customer_created on public.ordering_orders(customer_id, created_at desc);
create index if not exists ordering_orders_status_created on public.ordering_orders(status, created_at desc);

create table if not exists public.ordering_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ordering_orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  variant_label text,
  unit_price integer not null,
  quantity integer not null check (quantity between 1 and 100),
  line_total integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ordering_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.ordering_profiles(id) on delete cascade,
  order_id uuid references public.ordering_orders(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ordering_notifications_customer_created on public.ordering_notifications(customer_id, created_at desc);

create table if not exists public.ordering_loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.ordering_profiles(id) on delete cascade,
  order_id uuid references public.ordering_orders(id) on delete cascade,
  kind text not null check (kind in ('earn','reversal','manual')),
  points integer not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique(order_id, kind)
);

create or replace function public.ordering_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists ordering_profiles_touch on public.ordering_profiles;
create trigger ordering_profiles_touch before update on public.ordering_profiles for each row execute function public.ordering_touch_updated_at();
drop trigger if exists ordering_addresses_touch on public.ordering_addresses;
create trigger ordering_addresses_touch before update on public.ordering_addresses for each row execute function public.ordering_touch_updated_at();
drop trigger if exists ordering_orders_touch on public.ordering_orders;
create trigger ordering_orders_touch before update on public.ordering_orders for each row execute function public.ordering_touch_updated_at();
drop trigger if exists ordering_products_touch on public.ordering_products;
create trigger ordering_products_touch before update on public.ordering_products for each row execute function public.ordering_touch_updated_at();

create or replace function public.ordering_new_user_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ordering_profiles(id,email,full_name,phone,role)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''),'customer')
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists ordering_auth_user_created on auth.users;
create trigger ordering_auth_user_created after insert or update of email on auth.users for each row execute function public.ordering_new_user_profile();

insert into public.ordering_profiles(id,email,full_name,phone,role)
select u.id,coalesce(u.email,''),coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),coalesce(u.raw_user_meta_data->>'phone',''),
  case when u.id=(select id from auth.users order by created_at asc limit 1) then 'admin' else 'customer' end
from auth.users u on conflict (id) do nothing;

update public.ordering_profiles set role='admin'
where id=(select id from auth.users order by created_at asc limit 1)
  and not exists(select 1 from public.ordering_profiles where role='admin');

create or replace function public.ordering_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.ordering_profiles where id=auth.uid() and role='admin');
$$;

create or replace function public.ordering_order_events()
returns trigger language plpgsql security definer set search_path = public as $$
declare status_label text;
begin
  if tg_op='INSERT' then
    insert into public.ordering_notifications(customer_id,order_id,title,message)
    values(new.customer_id,new.id,'Đã nhận yêu cầu đặt hàng','Đơn '||new.code||' đang chờ HAMICHEE xác nhận.');
    return new;
  end if;
  if new.status is distinct from old.status then
    status_label := case new.status
      when 'confirmed' then 'HAMICHEE đã nhận đơn'
      when 'preparing' then 'Đơn đang được chuẩn bị'
      when 'delivering' then 'Đơn đang được giao'
      when 'ready_for_pickup' then 'Đơn đã sẵn sàng để nhận'
      when 'completed' then 'Đơn đã hoàn thành'
      when 'cancelled' then 'Đơn đã bị hủy'
      else 'Đơn hàng vừa được cập nhật' end;
    insert into public.ordering_notifications(customer_id,order_id,title,message)
    values(new.customer_id,new.id,status_label,status_label||': '||new.code||'.');
  end if;
  if new.payment_status is distinct from old.payment_status and new.payment_status='paid' then
    insert into public.ordering_notifications(customer_id,order_id,title,message)
    values(new.customer_id,new.id,'Đã xác nhận thanh toán','HAMICHEE đã xác nhận thanh toán đơn '||new.code||'.');
  end if;
  return new;
end;
$$;

drop trigger if exists ordering_order_events_trigger on public.ordering_orders;
create trigger ordering_order_events_trigger after insert or update on public.ordering_orders for each row execute function public.ordering_order_events();

create or replace function public.ordering_award_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare applied integer;
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    insert into public.ordering_loyalty_ledger(customer_id,order_id,kind,points,note)
    values(new.customer_id,new.id,'earn',new.points_earned,'Hoàn thành đơn '||new.code)
    on conflict(order_id,kind) do nothing returning points into applied;
    if applied is not null then
      update public.ordering_profiles set points=points+applied where id=new.customer_id;
    end if;
  elsif old.status='completed' and new.status='cancelled' then
    insert into public.ordering_loyalty_ledger(customer_id,order_id,kind,points,note)
    values(new.customer_id,new.id,'reversal',-new.points_earned,'Hủy sau hoàn thành '||new.code)
    on conflict(order_id,kind) do nothing returning points into applied;
    if applied is not null then
      update public.ordering_profiles set points=greatest(0,points+applied) where id=new.customer_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ordering_award_points_trigger on public.ordering_orders;
create trigger ordering_award_points_trigger after update of status on public.ordering_orders for each row execute function public.ordering_award_points();

alter table public.ordering_profiles enable row level security;
alter table public.ordering_addresses enable row level security;
alter table public.ordering_categories enable row level security;
alter table public.ordering_products enable row level security;
alter table public.ordering_loyalty_tiers enable row level security;
alter table public.ordering_orders enable row level security;
alter table public.ordering_order_items enable row level security;
alter table public.ordering_notifications enable row level security;
alter table public.ordering_loyalty_ledger enable row level security;

drop policy if exists ordering_profiles_self_read on public.ordering_profiles;
create policy ordering_profiles_self_read on public.ordering_profiles for select to authenticated using (id=auth.uid() or public.ordering_is_admin());
drop policy if exists ordering_profiles_self_update on public.ordering_profiles;
create policy ordering_profiles_self_update on public.ordering_profiles for update to authenticated using (public.ordering_is_admin()) with check (public.ordering_is_admin());
drop policy if exists ordering_addresses_owner on public.ordering_addresses;
create policy ordering_addresses_owner on public.ordering_addresses for all to authenticated using (customer_id=auth.uid() or public.ordering_is_admin()) with check (customer_id=auth.uid() or public.ordering_is_admin());
drop policy if exists ordering_categories_public on public.ordering_categories;
create policy ordering_categories_public on public.ordering_categories for select using (active or public.ordering_is_admin());
drop policy if exists ordering_categories_admin on public.ordering_categories;
create policy ordering_categories_admin on public.ordering_categories for all to authenticated using (public.ordering_is_admin()) with check (public.ordering_is_admin());
drop policy if exists ordering_products_public on public.ordering_products;
create policy ordering_products_public on public.ordering_products for select using (active or public.ordering_is_admin());
drop policy if exists ordering_products_admin on public.ordering_products;
create policy ordering_products_admin on public.ordering_products for all to authenticated using (public.ordering_is_admin()) with check (public.ordering_is_admin());
drop policy if exists ordering_tiers_public on public.ordering_loyalty_tiers;
create policy ordering_tiers_public on public.ordering_loyalty_tiers for select using (active or public.ordering_is_admin());
drop policy if exists ordering_tiers_admin on public.ordering_loyalty_tiers;
create policy ordering_tiers_admin on public.ordering_loyalty_tiers for all to authenticated using (public.ordering_is_admin()) with check (public.ordering_is_admin());
drop policy if exists ordering_orders_owner_read on public.ordering_orders;
create policy ordering_orders_owner_read on public.ordering_orders for select to authenticated using (customer_id=auth.uid() or public.ordering_is_admin());
drop policy if exists ordering_orders_admin on public.ordering_orders;
create policy ordering_orders_admin on public.ordering_orders for all to authenticated using (public.ordering_is_admin()) with check (public.ordering_is_admin());
drop policy if exists ordering_items_owner_read on public.ordering_order_items;
create policy ordering_items_owner_read on public.ordering_order_items for select to authenticated using (exists(select 1 from public.ordering_orders o where o.id=order_id and (o.customer_id=auth.uid() or public.ordering_is_admin())));
drop policy if exists ordering_items_admin on public.ordering_order_items;
create policy ordering_items_admin on public.ordering_order_items for all to authenticated using (public.ordering_is_admin()) with check (public.ordering_is_admin());
drop policy if exists ordering_notifications_owner on public.ordering_notifications;
create policy ordering_notifications_owner on public.ordering_notifications for select to authenticated using (customer_id=auth.uid() or public.ordering_is_admin());
drop policy if exists ordering_notifications_admin on public.ordering_notifications;
create policy ordering_notifications_admin on public.ordering_notifications for all to authenticated using (public.ordering_is_admin()) with check (public.ordering_is_admin());
drop policy if exists ordering_ledger_owner_read on public.ordering_loyalty_ledger;
create policy ordering_ledger_owner_read on public.ordering_loyalty_ledger for select to authenticated using (customer_id=auth.uid() or public.ordering_is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ordering-menu','ordering-menu',true,4194304,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into public.ordering_loyalty_tiers(id,name,min_points,discount_percent,color,active) values
('member','Chạm',0,0,'#6b756e',true),
('silver','Ghiền',100,3,'#8d99a6',true),
('gold','Phê',300,5,'#d99b16',true),
('diamond','Đỉnh',600,8,'#008ba3',true)
on conflict(id) do nothing;

insert into public.ordering_categories(id,name,sort_order,image_position,active) values
('che-quoc-dan-hamichee','Chè Quốc Dân Hamichee',0,'3% 34%',true),
('che-truyen-thong','Chè Truyền Thống',1,'29% 88%',true),
('che-ly','Chè Ly',2,'46% 38%',true),
('sua-chua','Sữa Chua',3,'57% 43%',true),
('tuoi-mat','Tươi Mát',4,'56% 68%',true),
('trung-nha','Trứng Nhà',5,'56% 92%',true),
('an-chill-cung-che','Ăn Chill Cùng Chè',6,'70% 84%',true),
('them-chut-ngon-hon','Thêm Chút Ngon Hơn',7,'89% 51%',true),
('the-gioi-hat-dac','Thế Giới Hạt Đác',8,'91% 90%',true)
on conflict(id) do nothing;

insert into public.ordering_products(id,category_id,name,price,featured,variants,sort_order) values
('che-buoi','che-quoc-dan-hamichee','CHÈ BƯỞI',22000,true,'[]',0),
('che-thuong-hami','che-quoc-dan-hamichee','CHÈ "THƯƠNG" HAMI',28000,true,'[]',1),
('che-san-mochi-dua-non','che-quoc-dan-hamichee','CHÈ SẦN MOCHI DỪA NON',28000,true,'[]',2),
('che-mam-hami','che-quoc-dan-hamichee','CHÈ MÂM HAMI',89000,true,'[]',3),
('che-hat-dac-sau-rieng-hami','che-quoc-dan-hamichee','CHÈ HẠT ĐÁC SẦU RIÊNG HAMI',48000,false,'[]',4),
('che-hat-dac-cu-nang-hat-sen','che-quoc-dan-hamichee','CHÈ HẠT ĐÁC CỦ NĂNG HẠT SEN',42000,false,'[]',5),
('che-thai-sau-rieng-hami','che-quoc-dan-hamichee','CHÈ THÁI SẦU RIÊNG HAMI',42000,true,'[]',6),
('che-khoai-deo-hami','che-quoc-dan-hamichee','CHÈ KHOAI DẺO HAMI',42000,true,'[]',7),
('che-khuc-bach-hami','che-quoc-dan-hamichee','CHÈ KHÚC BẠCH HAMI',42000,false,'[]',8),
('che-dua-non-hat-dac','che-quoc-dan-hamichee','CHÈ DỪA NON HẠT ĐÁC',30000,true,'[]',9),
('che-khoai-tim-cot-dua','che-truyen-thong','CHÈ KHOAI TÍM CỐT DỪA',18000,true,'[]',0),
('che-bap','che-truyen-thong','CHÈ BẮP',18000,false,'[]',1),
('che-bat-ngo','che-truyen-thong','CHÈ BẤT NGỜ',22000,false,'[]',2),
('che-thap-cam','che-truyen-thong','CHÈ THẬP CẨM',30000,false,'[]',3),
('che-banh-lot-cu-nang-sau-rieng','che-ly','CHÈ BÁNH LỌT CỦ NĂNG SẦU RIÊNG',42000,false,'[]',0),
('che-suong-sao-hat-dac-cot-dua','che-ly','CHÈ SƯƠNG SÁO HẠT ĐÁC CỐT DỪA',30000,false,'[]',1),
('che-dau-den-hat-dac-cot-dua','che-ly','CHÈ ĐẬU ĐEN HẠT ĐÁC CỐT DỪA',30000,false,'[]',2),
('sua-chua-hat-dac-hamichee','sua-chua','SỮA CHUA HẠT ĐÁC HAMICHEE',40000,false,'[]',0),
('sua-chua-hat-dac-trai-cay','sua-chua','SỮA CHUA HẠT ĐÁC TRÁI CÂY',42000,true,'[]',1),
('tra-trai-cay-nhiet-doi','tuoi-mat','TRÀ TRÁI CÂY NHIỆT ĐỚI',40000,true,'[]',0),
('tra-dau-tam-hat-dac','tuoi-mat','TRÀ DÂU TẰM HẠT ĐÁC',35000,true,'[]',1),
('tra-da-me-hat-dac','tuoi-mat','TRÀ ĐÁ ME HẠT ĐÁC',35000,false,'[]',2),
('tra-mang-cau','tuoi-mat','TRÀ MÃNG CẦU',35000,false,'[]',3),
('nuoc-sam-full-topping','tuoi-mat','NƯỚC SÂM FULL TOPPING',25000,true,'[]',4),
('nuoc-dua-tac-trai-cay','tuoi-mat','NƯỚC DỪA TẮC TRÁI CÂY',25000,true,'[]',5),
('tra-long-nhan-hat-sen','tuoi-mat','TRÀ LONG NHÃN HẠT SEN',35000,false,'[]',6),
('flan-truyen-thong-2-banh','trung-nha','FLAN TRUYỀN THỐNG (2 Bánh)',20000,false,'[]',0),
('flan-hat-dac-hami','trung-nha','FLAN HẠT ĐÁC HAMI',30000,false,'[]',1),
('milo-da-bao-flan','trung-nha','MILO ĐÁ BÀO FLAN',35000,true,'[]',2),
('banh-trang-tron-hang-minh','an-chill-cung-che','BÁNH TRÁNG TRỘN HÀNG MINH',35000,true,'[]',0),
('banh-trang-cuon-bo-sot-me','an-chill-cung-che','BÁNH TRÁNG CUỘN BƠ SỐT ME',30000,false,'[]',1),
('combo-chien-nho','an-chill-cung-che','COMBO CHIÊN NHỎ',69000,false,'[]',2),
('combo-chien-lon','an-chill-cung-che','COMBO CHIÊN LỚN',99000,false,'[]',3),
('banh-gau-kem-sua','an-chill-cung-che','BÁNH GẤU KEM SỮA',25000,false,'[]',4),
('banh-que-cham-sot','an-chill-cung-che','BÁNH QUE CHẤM SỐT',25000,false,'[]',5),
('xuc-xich-duc','an-chill-cung-che','XÚC XÍCH ĐỨC',40000,false,'[]',6),
('khoai-tay-chien','an-chill-cung-che','KHOAI TÂY CHIÊN',35000,false,'[]',7),
('khoai-tay-lac-phomai','an-chill-cung-che','KHOAI TÂY LẮC PHOMAI',40000,false,'[]',8),
('ga-vien-lac-phomai','an-chill-cung-che','GÀ VIÊN LẮC PHOMAI',45000,false,'[]',9),
('chan-ga-rut-xuong-sot-thai','an-chill-cung-che','CHÂN GÀ RÚT XƯƠNG SỐT THÁI',55000,false,'[]',10),
('chan-ga-ngam-sa-tac','an-chill-cung-che','CHÂN GÀ NGÂM SẢ TẮC',55000,false,'[]',11),
('khuc-bach-hami','them-chut-ngon-hon','KHÚC BẠCH HAMI',10000,false,'[]',0),
('thach-cu-nang','them-chut-ngon-hon','THẠCH CỦ NĂNG',10000,false,'[]',1),
('thach-phomai','them-chut-ngon-hon','THẠCH PHOMAI',10000,false,'[]',2),
('hat-dac-rim','them-chut-ngon-hon','HẠT ĐÁC RIM',12000,true,'[]',3),
('suong-sao','them-chut-ngon-hon','SƯƠNG SÁO',8000,false,'[]',4),
('tran-chau-dua','them-chut-ngon-hon','TRÂN CHÂU DỪA',8000,false,'[]',5),
('thach-vi-nha','them-chut-ngon-hon','THẠCH VỊ NHÀ',8000,false,'[]',6),
('khoai-deo','them-chut-ngon-hon','KHOAI DẺO',10000,false,'[]',7),
('flan','them-chut-ngon-hon','FLAN',10000,true,'[]',8),
('trai-cay','them-chut-ngon-hon','TRÁI CÂY',10000,false,'[]',9),
('sot-khoai-socola','them-chut-ngon-hon','SỐT KHOAI (SOCOLA)',8000,false,'[]',10),
('dac-rim-thom-mat','the-gioi-hat-dac','ĐÁC RIM THƠM MẬT',85000,false,'[{"label":"0,5kg","price":85000},{"label":"1kg","price":165000}]',0),
('dac-rim-chanh-day','the-gioi-hat-dac','ĐÁC RIM CHANH DÂY',85000,false,'[{"label":"0,5kg","price":85000},{"label":"1kg","price":165000}]',1),
('dac-rim-dau-tam','the-gioi-hat-dac','ĐÁC RIM DÂU TẰM',85000,false,'[{"label":"0,5kg","price":85000},{"label":"1kg","price":165000}]',2),
('dac-rim-gung-non','the-gioi-hat-dac','ĐÁC RIM GỪNG NON',85000,false,'[{"label":"0,5kg","price":85000},{"label":"1kg","price":165000}]',3)
on conflict(id) do nothing;

update public.ordering_products p set image_position=c.image_position
from public.ordering_categories c where p.category_id=c.id and p.image_position is null;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ordering_orders') then alter publication supabase_realtime add table public.ordering_orders; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ordering_products') then alter publication supabase_realtime add table public.ordering_products; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ordering_categories') then alter publication supabase_realtime add table public.ordering_categories; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ordering_notifications') then alter publication supabase_realtime add table public.ordering_notifications; end if;
end $$;
