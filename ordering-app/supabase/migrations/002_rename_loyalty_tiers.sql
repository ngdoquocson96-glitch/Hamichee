update public.ordering_loyalty_tiers
set name = case id
  when 'member' then 'Chạm'
  when 'silver' then 'Ghiền'
  when 'gold' then 'Phê'
  when 'diamond' then 'Đỉnh'
  else name
end,
updated_at = now()
where id in ('member', 'silver', 'gold', 'diamond');
