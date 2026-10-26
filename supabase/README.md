# Supabase 数据库脚本

小月亮（baby-log）和 homeschool 共用同一个 Supabase 项目。数据库脚本统一放在这里，homeschool 仓库只引用，不另存一份。

- `schema.sql` — **完整建库脚本** = 基线 + 全部迁移原样并入（2026-10-25 起）。新项目 / 重建数据库时在 SQL Editor 里执行这一个文件即可。结构变动仍先写迁移文件，再把它追加到 schema.sql 末尾。
- `migrations/NNN_*.sql` — 增量迁移，按编号顺序执行尚未执行过的文件。每个文件可重复执行、不删数据、整体在一个事务里。

| 编号 | 内容 | 状态 |
|---|---|---|
| 002 | `children` 表：从 `families.settings->'children'` 投影而来，触发器保持同步，含一次性回填 | 已执行 2026-10-16 |
| 003 | 家庭学堂阶段 1：`hs_family`、`hs_scriptures`、`hs_scripture_progress`、`hs_routines`、`hs_tasks`、`hs_devotions` | 已执行 2026-10-16 |
| 004 | 家庭学堂阶段 2–4：`hs_units`、`hs_lessons`、`hs_goals`、`hs_resources`，`hs_tasks.lesson_id` | 待执行 |
| 005 | 经文卡译本字段 `hs_scriptures.version_zh` / `version_en`，并从 source 回填 | 待执行 |
| 006 | 学年节奏：`hs_units.weeks` / `start_on` / `term` | 已执行 2026-10-16 |
| 007 | 修复：`hs_routines.updated_at` 缺列导致套用例行报 42703；`hs_touch` 改为容错 | 待执行 |
| 008 | 课程库：`hs_units.tpl` 记录单元来自哪个模板链 | 待执行 |
| 009 | 家主与免注册加入：`create_family` 拒绝匿名用户；`is_owner`、`reset_invite_code`、`set_member_role`、`remove_member`；`families_guard` 触发器锁住 invite_code；`family_members` 加入 realtime。**前置：Authentication → Sign In / Providers → 打开 Allow anonymous sign-ins** | 待执行 |
| 010 | `set_member_name`：家主改任何成员的称呼，成员改自己的 | 待执行 |
| 011 | 经文背诵记录：`hs_scripture_progress` 加 `last_on` / `last_result` / `again_streak` / `undo_to`，状态加 `paused`（今天页任务式清单、撤销、先放一放） | 待执行 |
| 012 | 记录可见性：`entries.visibility` / `shared_with` | 已执行 |
| 013 | 牧羊人：`wb_profile`、`wb_practices`、`wb_logs`、`wb_prayers` | 已执行 |
| 014 | `wb_practices.focus_kind` | 已执行 |
| 015 | 牧羊人任务 `wb_tasks` | 已执行 |
| 016 | 牧羊人灵修笔记 `wb_notes` | 已执行 |
| 017 | 云端备份桶 `backups`（storage）：family/<家庭id>/… 家庭成员可读写，user/<用户id>/… 本人可读写；三个应用的「备份与恢复」用 | 待执行 |
| 018 | 家主一键备份 / 恢复全家：`backup_family(family)` 返回三个应用的全部数据（含家人私有的），`restore_family(family, tables)` 只补缺不覆盖；wb_* 触发器恢复时按 `app.restoring` 放行 | 待执行 |
| 019 | 家庭学堂「睡前安然」：`hs_bedtime_songs`（歌单）、`hs_bedtime_logs`（每晚完成记录）、`hs_bedtime_events`（状况记录：怎么处理、花了多久、结果）、`media` 私有音频桶（家庭成员读写，单文件 20 MB，复用 017 的 `backup_path_ok`）；流程 / 带领词 / 经文清单放 `hs_family.settings->bedtime` | 待执行 |

本目录不进 git（见仓库根 `.gitignore`），只在这台机器上维护。

## Edge Functions

- `functions/esv/index.ts` — 有版权译本代理，供家庭学堂“自动抓取经文”用 ESV（Crossway 密钥）和 NASB / NIV / CSB / NKJV（API.Bible 免费 Starter 密钥，选 3 本）。部署与密钥设置见文件头注释；不部署的话家庭学堂自动回退到公有领域的 BSB。

执行步骤：Supabase 后台先备份 → SQL Editor → 粘贴文件全文 → Run → 跑文件末尾注释里的验证查询。
