# 龙舟项目 Dragon Boat Project

以“龙舟文化传承与赛事数据可视化”为核心，面向爱好者、俱乐部与赛事组织者，提供赛程信息、队伍管理、训练数据记录与可视化展示的一体化解决方案。

## 目录
- 项目简介
- 功能特性
- 系统架构
- 演示与截图
- 快速开始
- 配置说明
- 数据模型
- 接口约定
- 开发与测试
- 部署
- 常见问题
- 路线图
- 许可证
- 贡献指南

## 项目简介
龙舟项目旨在数字化管理与展示龙舟赛事与训练数据，涵盖：
- 赛事报名、分组与赛道安排
- 队伍成员信息与训练计划
- 船速/心率/GPS 轨迹等训练数据可视化
- 成绩榜与积分排名
- 文化内容展示与活动推广

适用场景：
- 地方赛事官网/俱乐部官网
- 校队/社会队训练与数据记录
- 媒体/文化宣传专题页

## 功能特性
- 赛事管理：
  - 报名审核、分组分道、赛程表、实时/最终成绩
- 队伍管理：
  - 成员档案、角色（鼓手/舵手/桨手）、出勤与训练记录
- 训练数据：
  - 速度、频率、心率、距离、GPS 轨迹上传解析（支持 GPX/CSV）
  - 指标趋势、区间对比、训练计划达成率
- 可视化：
  - 赛道示意、路线轨迹、成绩榜单、训练雷达/折线/柱状图
- 内容与传播：
  - 赛事资讯、图文/视频、活动日历
- 权限与多角色：
  - 管理员、教练、队员、访客可见范围控制

## 系统架构
- 前端：支持静态站点（GitHub Pages）或 SSR（可拓展）
- 数据来源：静态数据（JSON/CSV）或后端 API（可选）
- 地图/图表（可选）：Maplibre/Leaflet + ECharts/Recharts
- 部署：GitHub Pages（静态）或容器化到云平台

> 当前仓库默认以静态站点方案为基础，后续可平滑接入后端服务。

## 演示与截图
- 在线演示：<https://你的域名或 GitHub Pages 地址>
- 截图：
  - 赛事首页：docs/images/home.png
  - 成绩榜：docs/images/leaderboard.png
  - 训练可视化：docs/images/training-analytics.png
  - 轨迹地图：docs/images/track-map.png

## 快速开始
### 先决条件
- Node.js >= 18（静态站点前端）
- 包管理器：pnpm 或 npm 或 yarn
- 可选：Python >= 3.10（若需要数据转换脚本）

### 安装
```bash
git clone https://github.com/<your-org>/<dragon-boat-repo>.git
cd <dragon-boat-repo>
pnpm install # 或 npm install / yarn
```

### 本地运行
```bash
pnpm dev # 或 npm run dev / yarn dev
```
默认地址：http://localhost:3000

### 构建
```bash
pnpm build
pnpm preview # 预览构建产物
```

## 配置说明
在根目录创建 .env（或 .env.local），示例：
```bash
# 基础
SITE_NAME="龙舟项目"
SITE_BASE_URL="https://your-domain.com"

# 地图（可选）
MAP_PROVIDER="maplibre"
MAP_STYLE_URL="https://demotiles.maplibre.org/style.json"

# 分析（可选）
ANALYTICS_PROVIDER="plausible"
ANALYTICS_DOMAIN="your-domain.com"
```
同时提供 .env.example 作为参考。

## 数据模型
- Event（赛事）
  - id, name, date, location, lanes, groups, schedule
- Team（队伍）
  - id, name, region, members[], coach, contact
- Result（成绩）
  - eventId, group, lane, teamId, time, rank, penalties
- Training（训练记录）
  - teamId, date, duration, distance, avgPace, strokeRate, heartRateAvg
- Track（轨迹，可选）
  - trainingId, gpxUrl/csvUrl, samples: [time, lat, lng, speed, hr]

数据可放在 data/ 目录（JSON/CSV），例如：
```
data/
├─ events.json
├─ teams.json
├─ results/
│  ├─ 2025_open_final.json
├─ training/
│  ├─ team-001-2025-09.csv
└─ tracks/
   ├─ team-001-2025-09-15.gpx
```

## 接口约定（若接入后端）
- GET /api/events
- GET /api/events/:id
- GET /api/teams
- GET /api/results?eventId=&group=
- GET /api/training?teamId=&from=&to=
- GET /api/tracks/:trainingId
返回统一结构：
```json
{ "success": true, "data": ..., "error": null }
```

## 开发与测试
- 代码规范：ESLint + Prettier
- 提交规范：Conventional Commits（feat/fix/docs/chore 等）
- 单元测试：Vitest/Jest
```bash
pnpm test
```

## 部署
### GitHub Pages（静态）
1) 仓库 Settings → Pages → 选择分支或 /docs 目录
2) 自定义域名：
   - www 子域：CNAME 指向 <username>.github.io
   - 根域：若 DNS 支持 ALIAS/ANAME，@ 指向 <username>.github.io；否则添加 4 条 A 记录：
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
3) 等待 GitHub 签发证书，开启 Enforce HTTPS

### 容器/云平台（可选）
```bash
docker build -t dragon-boat:latest .
docker run -p 3000:3000 --env-file .env dragon-boat:latest
```

## 常见问题
- 页面空白或数据不显示
  - 检查 data/ 路径和构建后的资源相对路径
- 自定义域名不生效/证书失败
  - 先关闭 DNS 代理，仅 DNS 模式；确认根域解析正确
- 轨迹地图不显示
  - 检查地图样式 URL 与跨域策略；本地需 https 或 localhost

## 路线图
- v1：静态站点 + 基础赛事/队伍/成绩展示
- v1.1：训练数据 CSV/GPX 导入与可视化、成绩榜优化
- v1.2：多语言、移动端优化、离线缓存
- v2：后端 API、账号体系与角色权限、实时成绩推送

## 许可证
MIT（或按你的实际许可证替换）

## 贡献指南
欢迎提交 Issue 与 PR。建议先讨论需求与数据结构变更，再提交实现。
