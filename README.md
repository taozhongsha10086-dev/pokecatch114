# PokeCatch AutoPatch

自动更新脚本已部署到公开仓库。

- 当前版本：`0.6.1`
- 安装地址：https://raw.githubusercontent.com/taozhongsha10086-dev/pokecatch114/main/PokeCatch_AutoPatch.user.js
- 更新元数据：https://raw.githubusercontent.com/taozhongsha10086-dev/pokecatch114/main/PokeCatch_AutoPatch.meta.js
- 项目主页：https://github.com/taozhongsha10086-dev/pokecatch114

## 安装 / 迁移

1. 在 Tampermonkey 管理面板中禁用或删除此前手动导入的旧版 PokeCatch 脚本，避免重复运行。
2. 在 Edge 或 Android Firefox 中打开上面的“安装地址”。
3. 按 Tampermonkey 提示安装。
4. 在 Tampermonkey 设置中确保启用了用户脚本自动更新检查。
5. 之后更新时，只需将同一路径的 `.user.js` 和 `.meta.js` 更新并提高 `@version`；Tampermonkey 会按自己的检查周期获取更新。

## 重要说明

- 本仓库是公开仓库，Raw 地址可供 Tampermonkey 读取。
- 自动更新只负责分发维护者已经发布的脚本版本，不会自动分析或修复游戏更新后的内部代码变化。
- 新版游戏更新后，仍需检查补丁匹配状态及实际游戏行为。
- 一键还原只关闭本地补丁并恢复后续加载的原版逻辑，不会回滚已写入存档的数据。
