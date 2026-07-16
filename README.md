# 营养与训练追踪

一个面向手机的饮食与力量训练记录应用，提供 PWA、Capacitor 原生工程和原生微信小程序。

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🔍 内置食物库 | 70+ 种常见食物（米饭、鸡胸肉、西兰花、牛奶等），覆盖主食/肉蛋/蔬菜/水果/坚果/饮品/速食 |
| 🌐 联网搜索 | 接入 OpenFoodFacts 全球开放食物数据库，搜遍市售食品 |
| 📝 自定义食物 | 自主创建食物条目，适合速食产品、包装食品（看包装背面营养成分表填入） |
| 📊 碳蛋脂分析 | 每餐 + 每日的碳水/蛋白质/脂肪比例，环形图直观展示 |
| 📅 历史记录 | 每天饮食记录自动保存，可回顾任意一天 |
| 🏋️ 力量训练 | 预设六大肌群动作、自定义动作、多动作与多组记录 |
| ⏱️ 组间休息 | 环形倒计时、暂停、跳过、+10 秒、声音和震动提醒 |
| 📈 训练趋势 | 月历查看训练日，回顾每组重量/次数与近期趋势 |
| 📱 多端应用 | 支持 PWA，并提供 Capacitor iOS/Android 原生工程 |
| 微信小程序 | 原生 WXML/WXSS/JavaScript，本地存储且无需远端账号 |

## 微信小程序

小程序源码位于 `miniprogram/`，项目入口为根目录的 `project.config.json`。完整配置、数据迁移、真机测试和体验版上传步骤见 [`MINIPROGRAM.md`](MINIPROGRAM.md)。

```bash
pnpm run miniapp:validate
pnpm run miniapp:test
```

小程序数据只保存在当前微信设备，并提供 JSON 文件导入导出。小程序代码不使用 GitHub API 或 Gist。

## 🚀 在 iPhone 上使用

### 方式一：本地服务器（推荐）

1. **电脑上启动服务器**：
   ```bash
   cd nutrition-tracker
   # 用 Python 启动一个简单的 HTTP 服务器
   python3 -m http.server 8080
   ```

2. **iPhone 上访问**：
   - 确保 iPhone 和电脑在同一个 WiFi 下
   - 在 Safari 输入 `http://你的电脑IP:8080`
   - 例如：`http://192.168.1.100:8080`

3. **添加到主屏幕（像个真正的 App）**：
   - 在 Safari 打开后，点击底部「分享」按钮
   - 向下滑找到「添加到主屏幕」
   - 点击右上角「添加」
   - 现在桌面上就有这个 App 图标了！🎉

### 方式二：直接打开 HTML

把 `index.html` 通过微信/隔空投送/AirDrop 传到手机上，用 Safari 打开即可。

### 方式三：部署到 GitHub Pages（免费）

1. 在 GitHub 上创建仓库，把文件推上去
2. 开启 GitHub Pages
3. 手机访问 GitHub Pages 地址

## 📖 使用指南

### 🏠 首页（Dashboard）
- 查看今日总热量、总重量、碳蛋脂比例
- 环形图直观显示三大营养素占比
- 分别查看早/午/晚餐和加餐的记录
- 点击「前一天/后一天」查看历史

### 🔍 搜索食物
- **内置库**：从 70+ 种常见食物中选择
- **联网搜索**：输入食物名称，从 OpenFoodFacts 全球数据库自动查找营养信息
- **我的食物**：你自定义添加的食物
- 点击食物 → 输入克数 → 选择餐次 → 添加记录

### 📝 自定义食物（速食产品专用）
点击右上角 **➕** 按钮
1. 输入食物名称（如「优形鸡胸肉」「某品牌蛋白棒」）
2. 查看包装上的「营养成分表」
3. 填入 **每 100g** 的热量/碳水/蛋白/脂肪
4. 「参考份量」填你通常一次吃多少克
5. 保存后会在「我的食物」中出现

### 📚 食物库
- 浏览所有内置食物和自定义食物
- 查看每100g营养数据

### 📅 记录
- 按日期查看所有饮食记录
- 支持清除所有数据

### 🏋️ 训练

- 首页点击「开始训练」，或从底部「训练」进入。
- 添加一个或多个动作，每个动作可单独设置 10-600 秒组间休息。
- 填写重量和次数后点击「完成本组」，数据会立即保存并启动倒计时。
- 「动作库」可搜索预设动作，也可新增、编辑和删除自定义动作。
- 「历史」使用月历查看训练详情，点击「查看趋势」回顾近期表现。

## 后台倒计时说明

倒计时以持久化的 `endAt` 时间戳为准，不依赖 `setInterval` 累加。页面切到后台或设备锁屏后，回到前台会按当前时间立即校准，因此显示不会产生累计偏差。

Web 版本会在用户授权后，通过 Service Worker 尝试发送 Web Notification，并在前台播放提示音和震动。原生版本已经接入 iOS `UNUserNotificationCenter` 与 Android 精确闹钟/前台服务；构建、权限和真机测试见 [`NATIVE_APP.md`](NATIVE_APP.md)。

通知测试方式：

1. 通过 `http://localhost` 或 HTTPS 打开应用并允许通知。
2. 开始训练，将休息设为 10-30 秒并完成一组。
3. 分别测试前台、切到其他 App、锁屏后返回、暂停后恢复和 `+10秒`。
4. 确认归零后显示「开始下一组」，前台有声音/震动，支持通知的后台环境出现系统通知。

## 数据与迁移

原饮食键保持不变：`nutrition_records`、`nutrition_custom_foods`、`nutrition_targets`。训练模块首次启动执行幂等迁移，新增：

- `nutrition_workout_schema_version`
- `nutrition_workouts_v1`
- `nutrition_custom_exercises_v1`
- `nutrition_active_workout_v1`
- `nutrition_rest_timer_v1`

无训练数据的旧用户会得到空数组，不会重写饮食记录。导出文件和 GitHub Gist 格式升级为版本 4，仍能导入旧版仅含饮食数据的文件。旧版本留下的音乐配置不会再读取或同步，可以安全留存在本地存储中。

可选 Node 后端启动时执行 `CREATE TABLE IF NOT EXISTS` 迁移，新增 `workout_records`、`workout_exercises`、`workout_sets`、`custom_exercises`，迁移版本记录在 `schema_migrations`。现有 `users`、`food_records`、`custom_foods`、`targets` 不变。

## ⚖️ 碳蛋脂参考目标

| 目标 | 碳水 | 蛋白质 | 脂肪 |
|------|------|--------|------|
| 🥗 减脂 | 40-45% | 30-35% | 20-25% |
| 💪 增肌 | 45-50% | 30-35% | 20-25% |
| ⚖️ 均衡 | 50-55% | 20-25% | 25-30% |

## 🗂️ 文件结构

```
nutrition-tracker/
├── index.html       # 饮食主程序与训练入口
├── workout-core.js  # 训练数据、迁移与时间戳计时核心
├── workout.js       # 动作库、训练、历史与通知交互
├── workout.css      # 训练模块样式
├── native-app.js     # Capacitor 平台、生命周期和触觉桥接
├── capacitor.config.json # 原生容器配置
├── scripts/build-web.mjs # 原生内置 Web 资源构建
├── ios/              # iOS 工程与本地通知插件
├── android/          # Android 工程、闹钟和前台服务
├── assets/           # App 图标与启动页源资源
├── NATIVE_APP.md     # iOS/Android 开发、测试、签名和发布
├── manifest.json    # PWA 配置文件
├── sw.js            # 离线缓存与训练通知
├── server/          # 可选 Node.js + sql.js 同步服务
├── tests/           # 训练核心单元测试
├── CHANGELOG.md     # 版本记录
└── README.md       # 本文件
```

## 本地运行与验证

前端无需构建：

```bash
cd nutrition-tracker
python3 -m http.server 8080
```

打开 `http://localhost:8080`。由于 Service Worker 和通知 API 的安全限制，不要通过双击 `index.html` 测试训练通知。

完整测试需要 Node.js 22 或更高版本：

```bash
pnpm test
```

原生工程要求 Node.js 22、pnpm 11、完整 Xcode 或 Android Studio。初始化与同步：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run native:sync
```

完整步骤见 [`NATIVE_APP.md`](NATIVE_APP.md)。

可选后端：

```bash
cd server
npm install
JWT_SECRET="请替换为随机长字符串" npm start
```

## 🔒 隐私说明

- 默认情况下，所有数据仅保存在你的手机浏览器本地存储中
- 联网搜索仅用于查询食物营养数据（OpenFoodFacts 开放数据库）
- 只有用户主动执行 GitHub Gist 上传或配置可选同步后端时，数据才会离开本机

## 👨‍🍳 小贴士

- **速食产品**：看包装背面「营养成分表」，按每 100g 填入自定义食物
- **带包装的食品**：条形码可以在 OpenFoodFacts 搜索到
- **估算重量**：一个拳头 ≈ 150g，一掌肉 ≈ 100g，一拇指脂肪 ≈ 10g
- **定期回顾**：查看历史记录，分析自己的饮食结构
- **目标调整**：减脂期建议碳水 40-45%，蛋白质 30-35%，脂肪 20-25%
