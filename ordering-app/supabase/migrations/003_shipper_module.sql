-- HAMICHEE Ordering: tài khoản shipper, phân đơn, COD và bằng chứng giao hàng.
begin;

alter table public.ordering_profiles drop constraint if exists ordering_profiles_role_check;
alter table public.ordering_profiles add constraint ordering_profiles_role_check check (role in ('admin','customer','shipper'));

alter table public.ordering_orders add column if not exists shipper_id uuid references public.ordering_profiles(id) on delete set null;
alter table public.ordering_orders add column if not exists shipping_status text not null default 'unassigned';
alter table public.ordering_orders add column if not exists shipping_note text not null default '';
alter table public.ordering_orders add column if not exists cod_expected integer not null default 0;
alter table public.ordering_orders add column if not exists cod_collected integer not null default 0;
alter table public.ordering_orders add column if not exists proof_image_path text;
alter table public.ordering_orders add column if not exists assigned_at timestamptz;
alter table public.ordering_orders add column if not exists delivered_at timestamptz;
alter table public.ordering_orders drop constraint if exists ordering_orders_shipping_status_check;
alter table public.ordering_orders add constraint ordering_orders_shipping_status_check check (shipping_status in ('unassigned','assigned','accepted','picked_up','delivering','delivered','failed'));
alter table public.ordering_orders drop constraint if exists ordering_orders_cod_expected_check;
alter table public.ordering_orders add constraint ordering_orders_cod_expected_check check (cod_expected >= 0);
alter table public.ordering_orders drop constraint if exists ordering_orders_cod_collected_check;
alter table public.ordering_orders add constraint ordering_orders_cod_collected_check check (cod_collected >= 0);

create index if not exists ordering_orders_shipper_status on public.ordering_orders(shipper_id, shipping_status, created_at desc);

create table if not exists public.ordering_delivery_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ordering_orders(id) on delete cascade,
  shipper_id uuid references public.ordering_profiles(id) on delete set null,
  actor_id uuid references public.ordering_profiles(id) on delete set null,
  event_type text not null check (event_type in ('assigned','unassigned','accept','reject','picked_up','delivering','delivered','failed')),
  note text not null default '',
  cod_collected integer not null default 0 check (cod_collected >= 0),
  proof_image_path text,
  created_at timestamptz not null default now()
);

create index if not exists ordering_delivery_events_order_created on public.ordering_delivery_events(order_id, created_at desc);
create index if not exists ordering_delivery_events_shipper_created on public.ordering_delivery_events(shipper_id, created_at desc);

create or replace function public.ordering_is_shipper()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.ordering_profiles where id=auth.uid() and role='shipper');
$$;

create or replace function public.ordering_order_events()
returns trigger language plpgsql security definer set search_path = public as $$
declare status_label text; shipper_name text;
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
  if new.shipper_id is distinct from old.shipper_id and new.shipper_id is not null then
    select full_name into shipper_name from public.ordering_profiles where id=new.shipper_id;
    insert into public.ordering_notifications(customer_id,order_id,title,message)
    values(new.customer_id,new.id,'Đã phân người giao hàng',coalesce(nullif(shipper_name,''),'Shipper HAMICHEE')||' sẽ giao đơn '||new.code||'.');
  end if;
  if new.shipping_status is distinct from old.shipping_status then
    status_label := case new.shipping_status
      when 'accepted' then 'Shipper đã nhận giao đơn'
      when 'picked_up' then 'Shipper đã lấy hàng'
      when 'failed' then 'Giao hàng chưa thành công'
      else null end;
    if status_label is not null then
      insert into public.ordering_notifications(customer_id,order_id,title,message)
      values(new.customer_id,new.id,status_label,status_label||': '||new.code||'.');
    end if;
  end if;
  return new;
end;
$$;

alter table public.ordering_delivery_events enable row level security;

drop policy if exists ordering_orders_owner_read on public.ordering_orders;
create policy ordering_orders_owner_read on public.ordering_orders for select to authenticated
using (customer_id=auth.uid() or shipper_id=auth.uid() or public.ordering_is_admin());

drop policy if exists ordering_items_owner_read on public.ordering_order_items;
create policy ordering_items_owner_read on public.ordering_order_items for select to authenticated
using (exists(select 1 from public.ordering_orders o where o.id=order_id and (o.customer_id=auth.uid() or o.shipper_id=auth.uid() or public.ordering_is_admin())));

drop policy if exists ordering_delivery_events_read on public.ordering_delivery_events;
create policy ordering_delivery_events_read on public.ordering_delivery_events for select to authenticated
using (shipper_id=auth.uid() or public.ordering_is_admin());

drop policy if exists ordering_delivery_events_admin on public.ordering_delivery_events;
create policy ordering_delivery_events_admin on public.ordering_delivery_events for all to authenticated
using (public.ordering_is_admin()) with check (public.ordering_is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ordering-delivery-proof','ordering-delivery-proof',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ordering_delivery_events') then
    alter publication supabase_realtime add table public.ordering_delivery_events;
  end if;
end $$;

commit;
