# PokeCatch 辅助面板

当前脚本版本：**0.6.2**  
已检查的游戏资源：\`app.d8622a1fb3.js\`，对应游戏更新日志版本 **v0.5.161**（2026-11-24）。

## 安装与自动更新

- 安装地址：<https://raw.githubusercontent.com/taozhongsha10086-dev/pokecatch114/main/PokeCatch_AutoPatch.user.js>
- 更新元数据：<https://raw.githubusercontent.com/taozhongsha10086-dev/pokecatch114/main/PokeCatch_AutoPatch.meta.js>
- 项目主页：<https://github.com/taozhongsha10086-dev/pokecatch114>

在 Edge 或 Android Firefox 中使用 Tampermonkey 打开安装地址并安装。请在 Tampermonkey 设置中启用脚本更新检查；后续同一路径发布的新版本会由 Tampermonkey 按其检查周期更新。

## v0.6.2 更新内容

- 统一脚本版本号为 \`0.6.2\`：用户脚本头部、更新元数据和面板标题一致。
- 修正此前面板标题仍显示 \`v0.6.0\`、而脚本元数据已是 \`0.6.1\` 的版本号不一致问题。
- 移除旧版游戏 JS 注入、拦截和代码替换逻辑。旧版捕捉、经验、金钱、闪光、遭遇、稀有道具、晶洞、碎片及地下通道速度规则不再运行。
- 新增只读游戏资源识别：已登记 \`app.d8622a1fb3.js\`，其内置最新更新日志条目为游戏 \`v0.5.161\`。
- 遇到未知 \`app.*.js\` 资源时只显示“待检查”，不会尝试套用旧版规则。
- 面板列出当前游戏更新日志中的七种官方树果效果。
- 保留 Shadow DOM 浮窗、电脑/手机自适应布局及 Tampermonkey 自动更新地址。

## 安全与兼容性说明

本版本是只读辅助面板，不修改游戏 JS、不拦截网络请求、不写入或改动存档，也不更改服务器端捕捉、经验、金钱、掉落或排行榜结算。游戏版本识别只根据加载的 \`app.*.js\` 资源名进行；识别到已登记资源仅表示该资源已检查，不代表游戏服务器状态或账号状态。

旧版存储在浏览器中的 \`pc-auto-patch-*\` 设置不会被本版本读取，也不会再产生游戏效果；本版本不会擅自删除这些本地设置。

## 当前已核对的树果效果

| 树果 | 效果 |
|---|---|
| Razz Berry | 捕捉率 ×1.25 |
| Golden Razz Berry | 捕捉率 ×1.5 |
| Nanab Berry | 稀有种类出现率 ×2 |
| Enigma Berry | 未捕捉种类出现率 ×3（按当前游玩地区判定） |
| Pinap Berry | 战斗经验 ×1.25 |
| Lansat Berry | Pokédollars ×1.25 |
| Starf Berry | 野外闪光率 ×2 |

树果加成持续一小时，按现实时间计时（离线也会继续）。同类加成同一时间只生效一种；再次使用同一种会重置时长。更弱的树果替换当前加成时，游戏会要求确认。