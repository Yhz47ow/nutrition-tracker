# 食练记微信小程序开发与使用

## Web 项目分析与迁移边界

原 Web 应用由单页 HTML、原生 JavaScript、`localStorage`、Service Worker 和独立训练模块组成，旧版 `index.html` 仍包含 GitHub Gist 同步代码。微信小程序运行目录仅为 `miniprogram/`，旧 Web、Capacitor、iOS 和 Android 文件不会被打入小程序主包。

小程序侧已经完成以下替换：

| Web 能力 | 小程序实现 |
|---|---|
| HTML / CSS | WXML / WXSS |
| DOM 事件和手动渲染 | `Page`、`this.setData` 和 `bindtap` |
| `localStorage` / GitHub Gist | `wx.getStorageSync` / `wx.setStorageSync` |
| Service Worker | 小程序本身的代码包缓存 |
| 浏览器定时器累计 | 持久化 `endAt`，显示时按时间戳计算 |
| 浏览器通知 | 前台声音、震动；后台消息按平台限制降级 |
| Web 文件选择/下载 | `wx.shareFileMessage` / `wx.chooseMessageFile` |

`scripts/validate-miniapp.mjs` 会扫描整个 `miniprogram/`，发现 GitHub、Gist、DOM、浏览器存储、Service Worker 或 Web Notification 依赖时直接失败。

## 当前交付

仓库根目录是微信开发者工具项目，`miniprogram/` 是原生小程序主包。当前包含：

- 首页：日期切换、热量/重量/断食时间、营养比例、剩余配额、推荐食物、四餐记录和最近训练。
- 搜索：71 种内置食物、自定义食物、OpenFoodFacts 联网搜索和条码扫描。
- 食物库：内置/自定义分类、自定义食物新增、编辑和删除。
- 食物记录：克数快捷调节、餐次、照片、营养预览和推荐份量。
- 训练：六大肌群动作库、自定义动作、多动作、多组、重量/次数快捷调节和每动作休息时间。
- 组间休息：环形倒计时、暂停、跳过、增加 10 秒、结束提示音和震动。
- 历史：饮食日期记录、训练月历、每组详情和 Canvas 动作重量趋势。
- 设置：营养目标、减脂/均衡比例、跟随系统/深色/浅色主题、微信聊天 JSON 导入导出和数据清除。

音乐功能未迁移。

## 第一次打开

1. 安装最新版微信开发者工具。
2. 登录微信公众平台，在“开发管理 > 开发设置”复制小程序 AppID。
3. 根目录 `project.config.json` 已配置 AppID `wxbbbfae1be8940919`。
4. 在微信开发者工具选择“导入项目”，目录选择本仓库根目录 `nutrition-tracker`。
5. 确认小程序目录自动识别为 `miniprogram/`，然后点击“编译”。
6. 点击“真机调试”或“预览”，用管理员微信扫码。

不要把 AppSecret、上传私钥或密码写入仓库。

## 本地数据

小程序不需要账号、Token 或服务器。数据使用微信原生同步存储 API：

| 键 | 内容 |
|---|---|
| `dietRecords` | 按日期和餐次保存的饮食记录 |
| `customFoods` | 用户自定义食物 |
| `userSettings` | 营养目标和主题偏好 |
| `workoutHistory` | 已结束训练 |
| `exerciseLibrary` | 自定义训练动作 |
| `activeWorkout` | 正在进行的训练 |
| `restTimer` | 正在进行或已结束的休息计时器 |

食物照片复制到 `wx.env.USER_DATA_PATH`，记录中只保存本地文件路径。导出 JSON 时会把照片转换为 Base64 嵌入备份，导入时再写回用户文件目录，因此备份可以跨设备恢复。备份超过 10MB 时会提示先删除部分照片。卸载小程序、清理微信数据或更换手机可能清除本地内容，仍应定期导出备份文件。

### 换手机备份

1. 进入“首页 > 设置与备份”。
2. 点击“发送备份到微信聊天”，选择文件传输助手或自己的聊天。
3. 新手机打开食练记，进入同一设置页面。
4. 点击“从聊天文件恢复”，选择刚才的 JSON 文件。
5. 确认合并。相同 ID 的本地数据保留，不会先清空当前记录。

## macOS 风格主题

`app.wxss` 集中维护背景、卡片、输入框、文字、分割线、强调色和警示色变量。页面和组件禁止定义独立颜色值，Canvas 图表从 `utils/theme.js` 获取同一套调色板。

- `system`：默认值，跟随微信和手机系统主题。
- `dark`：固定 macOS 风格深色界面。
- `light`：预留的浅色扩展。

应用启动时读取系统 `theme`，切换系统外观时通过 `wx.onThemeChange` 更新当前页面、导航栏和 TabBar。存储版本已升级到 v2，旧版默认浅色设置会迁移为“跟随系统”。

## 从旧版迁移

1. 在原 PWA 设置中执行“导出本地文件”。
2. 将 JSON 文件发送到自己的微信聊天或文件传输助手。
3. 小程序进入“首页 > 设置 > 从聊天文件导入”。
4. 选择 JSON 文件并确认合并。
5. 核对饮食日期、自定义食物、训练历史和自定义动作。

导入器同时识别旧字段 `records`、`targets`、`workouts`、`customExercises`，以及小程序字段 `dietRecords`、`userSettings`、`workoutHistory`、`exerciseLibrary`。导入只合并数据，不覆盖同 ID 的本地新记录。

## 联网食物查询

本地记录本身不需要网络。OpenFoodFacts 搜索和条码商品查询需要在微信公众平台配置 `request` 合法域名：

```text
https://world.openfoodfacts.org
```

开发期间可以在微信开发者工具的“详情 > 本地设置”暂时关闭“校验合法域名”。正式体验版和发布版必须在公众平台完成域名配置；如果账号类型或平台策略不允许配置第三方域名，内置食物、自定义食物和手动条码结果录入仍可正常使用，但联网查询不可用。

## 组间休息限制

计时器保存 `endAt` 结束时间戳，而不是依赖每秒累加。因此切后台或锁屏后，回到小程序会按当前时间立即校准。

页面进入后台时会再次保存计时器。小程序仍存活时可继续计时；若被系统挂起，回到前台后立即按 `endAt - Date.now()` 校准，已经超时则直接进入“开始下一组”并播放声音、震动。

纯本地小程序没有 iOS `UNNotification` 或 Android `AlarmManager` 权限。`wx.requestSubscribeMessage` 只能取得用户授权，真正按结束时刻发送模板消息仍需要云函数或服务器调度；本项目坚持零后端、零账号，因此不能承诺锁屏后到秒出现系统通知。微信后台存活时间也由系统决定，不能把“约 5 分钟”视为可靠保证。

## 验证

```bash
pnpm test
pnpm run miniapp:validate
```

`miniapp:validate` 会检查：

- `app.json` 中每个页面的 JS/JSON/WXML/WXSS 四件套。
- JSON、WXML 标签结构和数据绑定括号。
- WXML 事件是否有对应页面函数。
- 是否误用 DOM、浏览器存储、Service Worker 或 GitHub/Gist API。
- 提示音、食物库和训练核心资源是否存在。
- 主包实际大小是否超过 2MB。

当前已使用微信开发者工具 Stable `2.01.2510290` 和基础库 `3.16.2` 完成正式 AppID 预览编译，主包约 159KB。发布前仍需在真实手机完成以下验收：

1. 新增、编辑、删除自定义食物并记录四种餐次。
2. 拍照、预览、删除食物照片。
3. JSON 导出后清除数据，再导入恢复。
4. 新建自定义动作并按肌群筛选。
5. 完成一组，测试暂停、跳过、增加 10 秒和返回前台校准。
6. 结束训练，检查月历、组详情和趋势。

## 上传体验版

1. 在微信开发者工具确认当前 AppID 和真机测试结果。
2. 点击右上角“上传”，版本号填写 `2.1.0`，备注填写“饮食与训练本地记录版”。
3. 登录微信公众平台，进入“版本管理 > 开发版本”。
4. 将刚上传的版本设为体验版。
5. 在“成员管理”添加体验成员，用户扫码即可使用。
6. 正式发布前补齐服务类目、隐私保护指引、用户数据本地存储说明和审核测试账号信息。

## 目录

```text
miniprogram/
  app.js / app.json / app.wxss
  assets/                 图标和休息结束提示音
  utils/                  存储、饮食、日期、训练和照片核心
    data-io.js            微信聊天 JSON 导入导出
    theme.js              系统主题解析和原生栏配色
  pages/home/             首页
  pages/search/           搜索与条码
  pages/library/          食物库
  pages/workout/          训练主页、动作库和历史
  pages/records/          饮食历史
  pages/food-entry/       食物记录表单
  pages/custom-food/      自定义食物
  pages/training/         训练中与休息倒计时
  pages/exercise-form/    自定义动作
  pages/settings/         目标与本地备份
```
