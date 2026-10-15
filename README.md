# baby-log

小月亮 · 母婴记录。纯静态网页，无构建步骤，直接托管在 GitHub Pages。

## 文件结构

```
index.html      页面骨架；只引入 app.css 和 js/app.js
app.css         全部样式（含深色模式）
js/
  app.js        入口：加载本地数据、首屏渲染、定时器、云端初始化
  config.js     Supabase 地址与 anon key（只能填公开 key，安全靠 RLS）
  util.js       DOM / 时间 / 文本小工具
  units.js      公制 ⇄ 美制换算（数据统一按公制保存）
  state.js      应用状态 S、本地存储、孩子列表与归属、年龄 / 阶段 / 体检日程
  types.js      记录类型定义（表单字段）、摘要文案、警示规则
  derived.js    从记录派生的数据：上次喂奶、睡眠时长、用药计时等
  store.js      写入入口 persist / putEntry / saveSettings，导入导出，演示数据
  sync.js       Supabase 家庭同步：登录、家庭、增量拉取、实时推送
  views.js      页面渲染：今天 / 时间线 / 妈妈 / 成长 / 问答
  meal.js       按餐表格视图
  trend.js      趋势对比视图与柱状图
  sheet.js      记录表单与设置页（以页面形式替换内容区）
  ask.js        AI 问答
  events.js     全局点击 / change / input 事件分发
```

ES Module 需要通过 http(s) 访问；直接双击 `index.html` 以 `file://` 打开时浏览器会拒绝加载模块，本地调试请起一个静态服务，例如 `python -m http.server`。
