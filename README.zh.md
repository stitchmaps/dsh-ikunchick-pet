# dsh-ikunchick-pet

[English](README.md) | 中文

![dsh-ikunchick-pet](docs/panel.png)

一只住在 DeepSeek Harness（DSH）Web 界面右下角的**「鸡你太美」篮球小鸡桌面宠物**。像素帧动画：
代理干活时它运球，戳一下它招手，闲久了会打盹睡觉 —— 顺带还是一个轻量的 DeepSeek 余额挂件。

标准 DSH bundle 插件：一个很小的宿主半侧（Cordis 插件 + HTTP 路由）+ 一个渲染到根作用域
`shell.overlay` 槽位的浏览器半侧。安装无需构建工具；唯一的“构建”只是把精灵图内联进客户端
bundle（见 [开发](#开发)）。

![运球预览](docs/preview-dribble.webp)

## 特性

- 🐤 **常驻角落宠物** —— 挂载进 `shell.overlay`（覆盖整个窗口），可拖动到任意位置，刷新后记住位置。
- 🏀 **手绘像素动画** —— 待机呼吸、**运球**（任一会话运行中）、**招手**（点击时）、
  **庆祝**（一轮结束）、**休息/睡觉**（长时间无操作）。`image-rendering: pixelated` 保证任意尺寸都清晰。
- 🧲 **边缘吸附 + 镜像** —— 拖到左右边缘附近自动吸附；贴左时整体水平镜像，面朝内容。竖直方向按视口夹取。
- 🧸 **Q 弹按压** —— 按下时挤压、松开回弹，可选轻微“boing”音效（WebAudio 合成，无音频资源）。
- 🔊 **点击音效** —— 点击时播放两段内置语音：**奶龙笑** 或 **唱跳rap篮球（坤坤）**；右键菜单可切换或关闭
  （选中即试听）。音频用 Windows SAPI 语音离线合成后以 data URI 烘焙进 bundle —— 无需下载；想换真·原声，
  替换 `assets/click-*.wav` 后重新构建即可。
- 💬 **语音气泡** —— 点击小鸡随机说一句台词，并在已配置时显示 **DeepSeek 余额** 与
  **今日已观测消费**。气泡会自动收起。
- 💰 **余额角标** —— 头顶一枚紧凑的 `¥` 药丸，每 60 秒经 DSH 凭据服务（`DEEPSEEK_API_KEY`）
  从 `https://api.deepseek.com/user/balance` 刷新。没配 key 或网络异常都优雅降级，宠物照常工作。
- ⚙️ **右键菜单** —— 大小（小/中/大）、动画速度、按压音效、余额角标、手动刷新余额、
  “回到右下角”、隐藏（角落会出现 `🐤` 按钮叫回）。
- 🌗 **跟随主题** —— 气泡、角标、菜单全部使用 DSH 主题变量，自动适配明暗。

## 依赖

- 带 Web GUI 的 DSH（官方桌面客户端的 `desktop` profile 与 `dsh web` 均可）。
- 可选但推荐：在 DSH 凭据服务里配置 `DEEPSEEK_API_KEY` 以显示余额。若你是用 DeepSeek 账号登录的，
  插件只会显示“余额不可用”，不会报错。

## 安装

### 桌面客户端（Electron）—— 当前 profile

把仓库拷到 profile 的 `node_modules` 并登记。附带脚本一步做完三件事（拷文件、加 `file:` 依赖、
追加加载行），并自动做带时间戳的备份：

```powershell
pwsh -File .\install.ps1
```

然后**刷新 Web GUI**（浏览器半侧在页面加载时载入）。宿主半侧会在
`%USERPROFILE%\.dsh\logs\desktop-next.log` 打印 `[dsh-ikunchick-pet] host active · v0.1.0`。

手动安装（等价）：

1. 把本目录拷到 `%USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-ikunchick-pet`。
2. 在 profile 的 `package.json` 的 `dependencies` 加
   `"dsh-ikunchick-pet": "file:<绝对路径，正斜杠>"`。
3. 在 profile 的 `cordis.patch.yml` 末尾追加：
   ```yaml
   - insert:
       - id: dsh-ikunchick-pet
         name: dsh-ikunchick-pet
   ```

> 注意：桌面端读的是 **`desktop`** profile；`dsh plugin --profile web add …` 会装错 profile、界面里
> 什么都看不到。请用上面的脚本（或宿主自带的插件管理器）。

## 使用

| 操作 | 效果 |
|---|---|
| 拖动小鸡 | 移动；松手时靠近边缘会吸附 |
| 点击小鸡 | 切换语音气泡（台词 + 余额） |
| 右键小鸡 | 打开设置菜单 |
| 菜单 → 点击音效 | 关 / 奶龙笑 / 唱跳rap（选中即试听） |
| 菜单 → 大小 | 小 / 中 / 大 |
| 菜单 → 动画 | 慢 / 常 / 快 |
| 菜单 → 刷新余额 | 立即拉取余额 |
| 菜单 → 回到右下角 | 复位位置 |
| 菜单 → 隐藏小鸡 | 隐藏；角落留一个 `🐤` 按钮叫回 |

## 数据与隐私

- 设置/位置：`%DSH_HOME%\dsh-ikunchick-pet\state.json`（原子写，宿主端归一化）。
- 按日余额账本：`%DSH_HOME%\dsh-ikunchick-pet\usage.json` —— 只存日期、最近观测余额、累计观测下降额；
  充值（余额上升）会被忽略，绝不冲减消费。
- DeepSeek API key **绝不**写入插件自己的文件：每次请求时经 DSH 凭据服务解析，只用于一次
  `GET /user/balance`，用完即弃。

## 动画是怎么做的

精灵图是 8×9 等大单元格网格（`assets/spritesheet.webp`）。动画就是一组 `[行, 列]` 帧序列，通过设置
精灵元素的 `background-position` 与 `background-size` 播放。当前映射：

| 动画 | 帧 | 触发 |
|---|---|---|
| `idle` | 第 0 行 | 默认 |
| `dribble` | 第 1 行 | 有会话运行中 |
| `dribble2` | 第 2 行 | （备用变体） |
| `wave` | 第 3 行 | 点击 |
| `raise` | 第 4 行 | 一轮结束 |
| `talk` | 第 5 行 | （备用变体） |
| `rest` | 第 8 行 | 空闲 > 65 秒 |

## 开发

```
dsh-ikunchick-pet/
├─ package.json            # dsh.bundle.patch + dsh.client.platform
├─ cordis.patch.yml        # 加载 insert 行
├─ icon.svg
├─ lib/
│  ├─ index.js             # 宿主半侧：/api/dsh-ikunchick-pet/{state,balance}
│  ├─ client.src.js        # 可读源码（含精灵占位符）
│  └─ client.js            # 构建产物（已内联精灵图）—— 实际发布
├─ assets/spritesheet.webp # 像素原图
├─ assets/click-kun.wav     # 唱跳rap篮球 点击音（SAPI 合成）
├─ assets/click-nailong.wav # 奶龙笑 点击音（SAPI 合成）
├─ scripts/build-client.mjs # 把精灵图 + 两段点击音内联进 lib/client.js
├─ scripts/process-audio.py # 把 SAPI 原始音频裁剪/归一化/变速 成 assets/
├─ docs/panel.png, preview-dribble.webp
├─ install.ps1
└─ README.md / README.zh.md
```

- 浏览器逻辑改 `lib/client.src.js`，然后重建发布产物：
  ```powershell
  node scripts/build-client.mjs
  ```
  （客户端模块只能 `require('react')`，不能加载本地文件，所以 webp 与两段点击 WAV 都以 base64 data URI 内联。）
  刷新 GUI 即可看到客户端改动。
- 宿主改动（`lib/index.js`）需要 patch 热重载（切换 `insert` 行）—— 不要重启整个桌面进程。
- 快速检查：`node --check lib/index.js`、`node --check lib/client.js`、`node scripts/build-client.mjs`。

## 许可证

代码采用 MIT（见 [LICENSE](LICENSE)）。`assets/` 下的像素精灵图仅随本插件“原样”分发、仅供运行使用，
**不**以 MIT 再授权。
