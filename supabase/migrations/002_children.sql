-- 小月亮 · 增量升级 002：children 表
-- 适用：已经执行过 schema.sql 并且有数据的家庭。不删除任何数据；可重复执行。
--
-- 背景：孩子列表目前存在 families.settings->'children'（JSON）。第二个应用（homeschool）需要一张
-- 真正的表来挂外键，所以把它提升为 children 表。JSON 仍是唯一写入口（小月亮照常工作、任何版本的手机
-- 都不用升级），children 表是它的投影：触发器在 settings 变化时自动同步，本脚本末尾做一次性回填。
--
-- 执行前：Supabase 后台先做一次备份。整个脚本在一个事务里，任何一步失败都会整体回滚。
begin;

-- ───────────── 1. 表 ─────────────
create table if not exists public.children (
  family_id  uuid not null references public.families(id) on delete cascade,
  id         text not null,                       -- 小月亮生成的 base36 id，原样沿用
  name       text not null default '',
  birth      date,
  sort       int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (family_id, id)
);
create index if not exists children_family_idx on public.children (family_id, sort);

-- ───────────── 2. 权限（与 entries 一致：家庭成员可读写本家庭的行）─────────────
alter table public.children enable row level security;
drop policy if exists children_all on public.children;
create policy children_all on public.children for all to authenticated
  using (public.is_member(family_id)) with check (public.is_member(family_id));

-- ───────────── 3. settings.children → children 表 ─────────────
-- 多出来的行删掉，保持为 JSON 的投影。birth 为空串时存 null；格式异常会让事务回滚，不会留半套数据。
create or replace function public.sync_children_from_settings(p_family uuid, p_settings jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.children (family_id, id, name, birth, sort)
  select p_family,
         c->>'id',
         coalesce(c->>'name', ''),
         nullif(c->>'birth', '')::date,
         (ord - 1)::int
  from jsonb_array_elements(coalesce(p_settings->'children', '[]'::jsonb)) with ordinality as t(c, ord)
  where c->>'id' is not null
  on conflict (family_id, id) do update
    set name = excluded.name, birth = excluded.birth, sort = excluded.sort, updated_at = now();

  delete from public.children ch
  where ch.family_id = p_family
    and not exists (select 1
                    from jsonb_array_elements(coalesce(p_settings->'children', '[]'::jsonb)) c
                    where c->>'id' = ch.id);
end $$;
revoke execute on function public.sync_children_from_settings(uuid, jsonb) from public, anon, authenticated;

create or replace function public.trg_sync_children() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_children_from_settings(new.id, new.settings);
  return new;
end $$;

drop trigger if exists families_sync_children on public.families;
create trigger families_sync_children
  after insert or update of settings on public.families
  for each row execute function public.trg_sync_children();

-- ───────────── 4. 一次性回填已有家庭 ─────────────
select public.sync_children_from_settings(id, settings) from public.families;

commit;

-- ───────────── 验证（手动执行）─────────────
-- 行数应等于各家庭 settings 里孩子数之和：
--   select f.id, jsonb_array_length(coalesce(f.settings->'children','[]')) as in_json,
--          (select count(*) from public.children c where c.family_id = f.id) as in_table
--   from public.families f;
-- 用一个不属于该家庭的账号查询 children 应返回 0 行。
