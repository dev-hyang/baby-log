# Supabase 数据库脚本

小月亮（baby-log）和 homeschool 共用同一个 Supabase 项目。数据库脚本统一放在这里，homeschool 仓库只引用，不另存一份。

- `schema.sql` — 基线：首次部署时在 SQL Editor 里执行一次。**不要再改它**，结构变动一律写迁移文件。
- `migrations/NNN_*.sql` — 增量迁移，按编号顺序执行尚未执行过的文件。每个文件可重复执行、不删数据、整体在一个事务里。

| 编号 | 内容 | 状态 |
|---|---|---|
| 002 | `children` 表：从 `families.settings->'children'` 投影而来，触发器保持同步，含一次性回填 | 待执行 |

执行步骤：Supabase 后台先备份 → SQL Editor → 粘贴文件全文 → Run → 跑文件末尾注释里的验证查询。
