-- 小月亮 · 母婴记录：Supabase 数据库初始化
-- 用法：Supabase 后台 → SQL Editor → New query → 粘贴全部内容 → Run。只需运行一次。
-- 安全模型：每条数据都属于一个“家庭”；行级权限（RLS）保证只有该家庭成员能读写。

-- ========== 表 ==========
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '我们家',
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  settings    jsonb not null default '{}'::jsonb,   -- 宝宝小名、生日、用药间隔、体检勾选
  created_by  uuid references auth.users on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id    uuid not null references public.families on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  display_name text not null default '家人',          -- 妈妈 / 爸爸 / 外婆
  role         text not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.entries (
  family_id      uuid not null references public.families on delete cascade,
  id             text not null,                       -- 前端生成的记录 id
  type           text not null,                       -- feed / diaper / sleep / baby / bmed / mmed / mbody
  ts             bigint not null,                     -- 记录发生时间（毫秒）
  data           jsonb not null default '{}'::jsonb,  -- 整条记录内容
  updated        bigint not null,                     -- 前端修改时间（毫秒）
  deleted        boolean not null default false,      -- 软删除，让其他设备也能同步删除
  created_by     uuid default auth.uid(),
  updated_by     uuid default auth.uid(),
  server_updated timestamptz not null default now(),  -- 服务器时间，用于增量同步
  primary key (family_id, id)
);
create index if not exists entries_sync_idx on public.entries (family_id, server_updated);

-- 每次写入由服务器盖时间戳、记录是谁改的（不信任手机时钟）
create or replace function public.entries_touch() returns trigger
language plpgsql as $$
begin
  new.server_updated := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists entries_touch on public.entries;
create trigger entries_touch before insert or update on public.entries
for each row execute function public.entries_touch();

-- ========== 权限 ==========
-- security definer 避免 family_members 的策略查询自身时递归
create or replace function public.is_member(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members where family_id = f and user_id = auth.uid());
$$;

alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.entries        enable row level security;

drop policy if exists fam_select on public.families;
create policy fam_select on public.families for select to authenticated using (public.is_member(id));
drop policy if exists fam_update on public.families;
create policy fam_update on public.families for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists mem_select on public.family_members;
create policy mem_select on public.family_members for select to authenticated using (public.is_member(family_id));

drop policy if exists ent_all on public.entries;
create policy ent_all on public.entries for all to authenticated
  using (public.is_member(family_id)) with check (public.is_member(family_id));
-- 说明：families 和 family_members 没有 insert 策略，只能通过下面两个函数创建 / 加入，防止随意把自己加进别人家。

-- ========== 创建家庭 / 用邀请码加入 ==========
create or replace function public.create_family(p_name text, p_display text) returns public.families
language plpgsql security definer set search_path = public as $$
declare f public.families;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.families (name, created_by) values (coalesce(nullif(trim(p_name), ''), '我们家'), auth.uid()) returning * into f;
  insert into public.family_members (family_id, user_id, display_name, role)
    values (f.id, auth.uid(), coalesce(nullif(trim(p_display), ''), '家人'), 'owner');
  return f;
end $$;

create or replace function public.join_family(p_code text, p_display text) returns public.families
language plpgsql security definer set search_path = public as $$
declare f public.families;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into f from public.families where invite_code = upper(trim(p_code));
  if not found then raise exception 'invalid code'; end if;
  insert into public.family_members (family_id, user_id, display_name)
    values (f.id, auth.uid(), coalesce(nullif(trim(p_display), ''), '家人'))
    on conflict (family_id, user_id) do update set display_name = excluded.display_name;
  return f;
end $$;

revoke execute on function public.create_family(text, text) from public, anon;
revoke execute on function public.join_family(text, text)   from public, anon;
revoke execute on function public.is_member(uuid)           from public, anon;
grant  execute on function public.create_family(text, text) to authenticated;
grant  execute on function public.join_family(text, text)   to authenticated;
grant  execute on function public.is_member(uuid)           to authenticated;

-- ========== 实时同步 ==========
-- 让家人的新记录几秒内出现在其他手机上
do $$ begin
  alter publication supabase_realtime add table public.entries;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.families;
exception when duplicate_object then null; end $$;
