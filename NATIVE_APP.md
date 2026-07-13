# iOS / Android 原生应用开发与发布

## 方案与当前状态

本项目使用 Capacitor 8 同时封装 iOS 和 Android。Web 资源在构建时复制进原生安装包，不依赖 GitHub Pages，离线可启动；饮食、训练、历史和同步界面继续共用现有 HTML/CSS/JavaScript。

选择 Capacitor 而不是 Android TWA 的原因：组间倒计时需要 `AlarmManager`、前台服务和 `UNUserNotificationCenter`。两端使用同一种桥接模型也能减少后续维护分叉。

已实现：

- Capacitor iOS/Android 工程和本地 Web 资源构建。
- 原生状态栏、安全区、启动页、Android 返回键和触觉反馈。
- Android 精确闹钟、前台服务、系统通知、声音和震动。
- iOS 系统本地通知、声音和前台通知展示。
- PWA/Web 环境保持原 Service Worker 通知降级。
- Android release keystore 配置入口和三端品牌资源。

尚需在发布机器完成：Xcode/Android Studio 编译、模拟器与真机矩阵测试、Apple Developer Team 配置、Android release keystore 和商店签名。没有签名资料时无法生成可提交的 IPA 或签名 AAB。

## 关键文件

| 文件 | 用途 |
|---|---|
| `package.json` | Capacitor 依赖、Web 构建、同步和原生构建命令 |
| `capacitor.config.json` | App ID、Web 目录、状态栏和启动页 |
| `scripts/build-web.mjs` | 将受控 Web 资源构建到 `www/` |
| `native-app.js` | 平台检测、原生插件访问、触觉、生命周期和 Android 返回键 |
| `android/app/src/main/java/com/yhz47ow/nutritiontracker/RestTimerPlugin.java` | Android JS Bridge 与闹钟调度 |
| `android/app/src/main/java/com/yhz47ow/nutritiontracker/RestTimerService.java` | Android 组间休息前台服务 |
| `android/app/src/main/java/com/yhz47ow/nutritiontracker/RestTimerReceiver.java` | Android 到时通知、声音和震动 |
| `ios/App/CapApp-SPM/Sources/CapApp-SPM/RestTimerPlugin.swift` | iOS 本地通知桥接 |
| `ios/App/App/AppDelegate.swift` | iOS 插件注册 |
| `assets/` | App 图标与启动画面的可编辑 SVG/PNG 源资源 |

`www/`、`ios/App/App/public/` 和 `android/app/src/main/assets/public/` 都是生成目录。只修改根目录 Web 源文件，再执行同步，不要直接编辑生成目录。

## 环境要求

- Node.js 22 或更高版本。
- pnpm 11（项目锁定 `pnpm@11.7.0`）。
- iOS：macOS、完整 Xcode、Apple Developer 账号。项目使用 Swift Package Manager，不要求 CocoaPods。
- Android：Android Studio、Android SDK 36、Build Tools、JDK 21。
- iOS 最低版本 15；Android 最低 API 24，目标 API 36。

首次安装依赖：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run native:sync
```

每次修改 Web 代码后都执行：

```bash
pnpm run native:sync
```

该命令会先重新生成 `www/`，然后同步到 iOS 和 Android。

## 本地运行

### iOS

```bash
pnpm run native:open:ios
```

在 Xcode 中：

1. 选择 `App` target 的 Signing & Capabilities。
2. 选择自己的 Apple Developer Team。
3. 确认 Bundle Identifier 为 `com.yhz47ow.nutritiontracker`，如已被占用则三处一起修改：`capacitor.config.json`、Xcode target、Android `applicationId`。
4. 选择模拟器或真机运行。

### Android

```bash
pnpm run native:open:android
```

Android Studio 首次打开后安装缺失的 SDK 36/Build Tools，并让 Gradle 使用 JDK 21。也可构建 debug APK：

```bash
pnpm run android:debug
```

输出位置：`android/app/build/outputs/apk/debug/app-debug.apk`。

## 后台倒计时

Web 数据始终保存绝对结束时间 `endAt`，界面显示由 `endAt - Date.now()` 推导，不依赖后台持续执行 JavaScript。

Android 调度流程：

1. `RestTimerPlugin.schedule()` 保存 timer ID 与 `endAt`。
2. 有精确闹钟权限时调用 `setExactAndAllowWhileIdle()`；没有权限时使用 `setAndAllowWhileIdle()` 降级并引导用户打开系统设置。
3. `RestTimerService` 显示不可静默隐藏的前台倒计时通知。
4. `RestTimerReceiver` 到时发送高优先级通知、声音和震动，并停止前台服务。

Android 13+ 需要通知权限，Android 12+ 需要用户允许精确闹钟。Google Play 发布时需要在 App Content 中声明 `SCHEDULE_EXACT_ALARM` 的计时器用途，并说明 `specialUse` 前台服务只在用户主动开始的组间休息期间运行。用户在系统设置中“强行停止”App 后，Android 会取消其闹钟，这是系统限制。

iOS 不允许普通 App 为秒级倒计时无限保持后台代码运行。正确实现是把结束时间交给 `UNUserNotificationCenter`，由系统在 App 挂起或终止后投递通知；回到前台后再用持久化 `endAt` 校准界面。这里不使用无法保证准时执行的 `BGTaskScheduler` 作为计时器。

### 倒计时验收矩阵

将动作休息时间设为 10-30 秒，至少验证：

| 场景 | 预期 |
|---|---|
| 前台归零 | 环形进度归零、声音/震动、显示“开始下一组” |
| 切到其他 App | 到时出现系统通知，返回后秒数准确 |
| 锁屏 | 到时通知有声音/震动 |
| 暂停后等待 | 不发送旧的结束通知 |
| 暂停后恢复 | 按新的 `endAt` 通知 |
| `+10秒` | 旧通知取消，新通知延后 10 秒 |
| 跳过 | 不再收到该 timer 的通知 |
| 进程被系统回收 | 系统仍按已提交的通知/闹钟提醒 |
| 时区或系统时间变化 | 返回 App 后按当前时间重新校准 |

## 数据迁移与备份

原生 WebView 的存储域与 Safari/Chrome/GitHub Pages 不同，安装 App 后不会自动读取浏览器的 `localStorage`。首次迁移按以下流程操作：

1. 在原 Web/PWA 中进入设置，执行“上传到云端”或“导出本地文件”。
2. 打开原生 App，在设置中配置同一个 GitHub Gist Token 后执行“从云端恢复”，或导入 JSON 文件。
3. 核对饮食天数、训练历史和自定义动作。
4. 确认原生 App 数据完整后再移除旧 PWA。

App 更新会保留 WebView 数据；卸载 App 会清除本地数据。发布或大版本升级前必须先做 Gist/JSON 备份。现有饮食键和训练迁移逻辑保持不变。

## Android 签名与 AAB

只在安全位置生成并备份 release keystore；丢失密钥后无法为同一个 Play 应用继续更新：

```bash
keytool -genkeypair -v \
  -keystore android/nutrition-tracker-release.jks \
  -alias nutrition-tracker \
  -keyalg RSA -keysize 2048 -validity 10000
```

以 `android/keystore.properties.example` 为模板创建 `android/keystore.properties`，填写真实密码。`.jks`、`.keystore` 和 `keystore.properties` 已被 Git 忽略。

```bash
pnpm run android:bundle
```

签名 AAB 输出：`android/app/build/outputs/bundle/release/app-release.aab`。提交 Google Play 前还需运行 Android lint、真机测试，并在 Play Console 完成数据安全、精确闹钟和前台服务声明。

需要侧载 release APK 时执行 `pnpm run android:apk`，输出位于 `android/app/build/outputs/apk/release/app-release.apk`。

## iOS Archive、IPA 与 TestFlight

在 Xcode 中选择 `Any iOS Device (arm64)`，然后执行 `Product > Archive`。在 Organizer 中选择：

- `Distribute App > App Store Connect > Upload`：上传 TestFlight/App Store。
- `Distribute App > Ad Hoc/Development > Export`：按描述文件导出 IPA。

提交前必须配置唯一 Bundle ID、Apple Developer Team、分发证书、描述文件、隐私说明、截图和 App Store Connect 元数据。

## 版本管理

每个发布版本统一更新以下位置：

- `package.json` 的 `version`。
- `android/app/build.gradle` 的 `versionName` 和递增的 `versionCode`。
- Xcode target 的 `MARKETING_VERSION` 和递增的 `CURRENT_PROJECT_VERSION`。
- `index.html` / `sw.js` 的静态资源查询版本与 `CACHE_NAME`。
- `CHANGELOG.md`。

推荐流程：功能分支开发 -> `pnpm test` -> `pnpm run native:sync` -> 两端编译与真机验收 -> 合并 `main` -> 创建 tag -> 推送 GitHub -> 创建 GitHub Release。原生编译未通过时只发布 beta 分支或 prerelease，不创建正式 `v2.0.0` tag。

## 当前机器的验证边界

当前机器只有 Xcode Command Line Tools 和 Swift，缺少完整 Xcode/iOS Simulator；同时缺少 JDK、Android SDK 和 Android Studio。因此本次可以验证 Web 测试、Capacitor 同步、XML/plist 和资源，但不能声称已在模拟器/真机运行，也不能在这里产出 APK/AAB/IPA。完整工具链安装和开发者签名是剩余发布前置条件。
