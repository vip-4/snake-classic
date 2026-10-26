# 贪吃蛇经典版 · Snake Classic

一个可直接部署的轻量级静态游戏站：原生 HTML / CSS / JavaScript + Canvas 2D，内置 SEO 与 GEO（Generative Engine Optimization，生成式引擎优化）。

- 生产地址：<https://vip-4.github.io/snake-classic/>
- 源码仓库：<https://github.com/vip-4/snake-classic>
- 游戏：经典贪吃蛇（20×15 网格、150ms 步进、穿墙、方向队列、本地最高分）
- 体积：首屏 HTML/CSS/JS 约 66 KB（gzip 后约 18 KB），无第三方请求
- 部署：纯静态，可放到任意静态托管
- 特色：PWA 离线可玩、响应式、触屏方向键、基础无障碍
- 来源：规则参考 [Simple Game Tutorials — Snake](https://berbasoft.com/simplegametutorials/love/snake)（公有领域），使用原生 JavaScript 独立实现

## 文件结构

```text
.
├─ index.html                 # 单页站点：游戏 + SEO/GEO 内容 + JSON-LD
├─ 404.html
├─ assets/
│  ├─ style.css
│  ├─ game.js                # 游戏逻辑、Canvas 渲染、音效、PWA 注册
│  ├─ favicon.svg
│  ├─ icon-192.png
│  ├─ icon-512.png
│  ├─ apple-touch-icon.png
│  └─ og-image.png           # 1200×630 社交分享图
├─ manifest.webmanifest
├─ sw.js                     # Service Worker 离线缓存
├─ robots.txt                # 显式允许 GPTBot / ClaudeBot / PerplexityBot 等
├─ sitemap.xml
├─ llms.txt                  # 给生成式引擎的结构化摘要
├─ _headers                  # Netlify / Cloudflare Pages 响应头
├─ .nojekyll                 # GitHub Pages 不做 Jekyll 处理
├─ LICENSE                   # MIT（代码）
├─ serve.ps1                 # 本地静态服务器（Windows，无需 Node/Python）
├─ set-site-url.ps1          # 上线前把 localhost 替换成正式域名
└─ scripts/
   └─ generate-assets.ps1    # 重新生成 PNG 图标和 OG 图
```

## 本地预览

Windows PowerShell（无需安装 Node.js 或 Python）：

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080
```

打开 <http://localhost:8080/>。

也可以直接用浏览器打开 `index.html`，但 Service Worker 和 PWA 安装只在 HTTP(S) 下生效。

## 本地验证结果（2026-10-26）

- Lighthouse：Accessibility 100 / Best Practices 100 / SEO 100（`http://localhost:8080/`）。
- 390px 视口：页面无横向溢出；宽表格在 `.table-wrap` 内独立横向滚动。
- 游戏逻辑：开始、吃到食物 +10、蛇身增长、自撞结束、16 步穿墙、暂停 / 继续均通过。
- JSON-LD：`@graph` 可解析，包含 WebSite、Organization、WebPage、VideoGame、HowTo、FAQPage。
- PWA：Manifest 与 Service Worker 可注册；核心资源首次访问后离线可用。

## 当前生产部署

- 平台：GitHub Pages
- 地址：<https://vip-4.github.io/snake-classic/>
- 仓库：<https://github.com/vip-4/snake-classic>
- 分支 / 目录：`main` / 根目录
- 每次推送到 `main` 会自动触发 Pages 重新构建
- `robots.txt`、`sitemap.xml`、`llms.txt` 已使用生产域名

## 部署到公网

### 方式 A：Netlify Drop（最快，无需命令行）

1. 将整个目录压缩为 zip（或直接把文件夹拖进去）。
2. 打开 <https://app.netlify.com/drop>，拖入文件夹 / zip。
3. 得到 `https://随机名.netlify.app` 域名。
4. 绑定自定义域名后运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\set-site-url.ps1 -SiteUrl "https://你的域名.com/"
```

然后重新上传（或连接 Git 仓库自动部署）。

### 方式 B：Cloudflare Pages

1. 新建 Pages 项目，选择 “Direct Upload”。
2. 上传本目录。
3. 在 “Custom domains” 绑定域名，执行上面的 `set-site-url.ps1`。

### 方式 C：GitHub Pages

1. 新建仓库，上传全部文件（`.nojekyll` 必须保留）。
2. Settings → Pages → Source 选择分支根目录。
3. 站点地址为 `https://用户名.github.io/仓库名/`。
4. 运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\set-site-url.ps1 -SiteUrl "https://用户名.github.io/仓库名/"
```

### 方式 D：任意静态托管

Nginx、Apache、对象存储（OSS / COS / S3）、Vercel 均可。只需保证：

- 根路径返回 `index.html`
- 未知路径返回 `404.html`（404 状态码）
- `.webmanifest` 的 MIME 为 `application/manifest+json`
- 全站 HTTPS（Service Worker 必需）

## 上线前检查清单

- [ ] 运行 `set-site-url.ps1` 替换 canonical、OG、sitemap、robots、llms.txt 中的 `http://localhost:8080/`
- [ ] 确认正式域名可访问，HTTPS 正常
- [ ] 在 [Google Rich Results Test](https://search.google.com/test/rich-results) 验证 VideoGame / FAQPage / HowTo 结构化数据
- [ ] 在 [Schema Markup Validator](https://validator.schema.org/) 检查 JSON-LD
- [ ] 提交 `sitemap.xml` 到 Google Search Console 与 Bing Webmaster Tools
- [ ] 用 Lighthouse 检查 Performance / Accessibility / Best Practices / SEO
- [ ] 用手机实际测试滑动转向与方向键
- [ ] 检查 `https://你的域名/llms.txt`、`/robots.txt`、`/sitemap.xml` 可访问

## 已实现的 SEO

- 唯一 `<h1>`、清晰的标题层级、语义化 `header/main/section/article/nav/footer`
- 60 字符左右的标题与 155 字符左右的中文描述
- `canonical`、`robots`、`max-image-preview:large`
- Open Graph + Twitter Card + 1200×630 PNG 分享图
- `VideoGame`、`FAQPage`、`HowTo`、`WebSite`、`WebPage`、`Organization` 的 JSON-LD `@graph`
- `sitemap.xml`、`robots.txt`、`manifest.webmanifest`
- 内部锚点导航、可抓取的正文内容、来源外链
- 移动端响应式、Core Web Vitals 友好（无外部字体/脚本、资源极小）
- 404 页面 `noindex`

## 已实现的 GEO（生成式引擎优化）

- `llms.txt`：给 AI 搜索引擎的事实摘要、规则、FAQ、来源与链接
- 正文“直接回答”区块：第一段即可回答“这是什么、多少钱、怎么玩”
- 结构化事实：网格、步进、得分、体积、许可证、更新时间
- FAQ 与页面可见内容一一对应，避免结构化数据与正文不一致
- 明确的实体、作者/发布者、来源引用与最后更新时间
- `robots.txt` 显式允许 GPTBot、OAI-SearchBot、ClaudeBot、PerplexityBot、Google-Extended、CCBot
- 不依赖 JavaScript 才能读取主要内容（游戏除外），方便爬虫解析
- 中英双语摘要，覆盖中文与英文提问

## 游戏实现说明

| 项目 | 值 |
| --- | --- |
| 网格 | 20 × 15（每格 24px，画布 480×360） |
| 步进 | 150ms |
| 得分 | 每份食物 +10 |
| 边界 | 穿墙 |
| 食物 | 仅在空白格生成 |
| 输入 | 方向键 / WASD / 滑动 / 屏幕方向键 |
| 暂停 | Space / P / 切后台自动暂停 |
| 最高分 | `localStorage` |
| 音效 | Web Audio 合成，可关闭 |
| 离线 | Service Worker 缓存核心资源 |

## 来源筛选记录（2026-10-26）

| 来源 | 结论 |
| --- | --- |
| Simple Game Tutorials — Snake | **采用**：规则完整、公有领域、体积极小、适合浏览器重写 |
| GitHub Trending 每日榜 | 未采用：当日以 AI 工具/框架为主，无合适轻量游戏 |
| itch.io `tag: open-source` | 未采用：热门作品多为大型游戏或桌面项目，授权需逐个核验 |
| Ludum Dare 官方仓库 | 未采用：官方仓库以赛事网站源码为主，jam 作品授权与体积不稳定 |

## 安全说明

- 站点与仓库不包含任何 API Key、访问令牌或第三方分析脚本。
- 如曾通过聊天、截图或日志公开过 GitHub / 云服务令牌，请在服务商后台立即撤销并重新签发；本仓库未保存部署令牌。
- 如需接入后端，请使用服务端环境变量，不要把密钥写进静态文件。

## 许可与署名

- 代码：MIT，见 `LICENSE`
- 文字与插图：CC BY 4.0，转载保留来源
- 游戏规则与实现思路：Simple Game Tutorials（BerbaSoft，公有领域）
- 第三方名称与链接归各自权利人所有
