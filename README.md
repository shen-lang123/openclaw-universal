# OpenClaw 通用包装器

## 这是什么？

Cherry Studio 内置的 OpenClaw 是用 bun 编译的独立二进制，升级不便。
这个通用包装器可以**自动检测**电脑上 npm 全局安装的 OpenClaw 并启动它。

**特点**：
- ✅ 不硬编码任何路径，全自动检测
- ✅ 支持 npm / pnpm / yarn / fnm / volta / nvm-windows
- ✅ 未找到 OpenClaw 时给出清晰的错误提示
- ✅ 适用于任何 Windows 用户的 Cherry Studio

## 使用方法

### 前提条件
- 已安装 [Node.js](https://nodejs.org/)（v18+）
- 已安装 [bun](https://bun.sh/)（仅编译时需要）

### 第一步：安装 OpenClaw

```powershell
npm install -g openclaw@latest
```

### 第二步：编译包装器

```powershell
# 在本项目目录下运行
bun build wrapper.js --compile --outfile openclaw.exe
```

### 第三步：替换 Cherry Studio 的 OpenClaw

将编译生成的 `openclaw.exe` 复制到 Cherry Studio 的 bin 目录，替换原有文件：

```powershell
# Cherry Studio 默认路径
copy openclaw.exe "%USERPROFILE%\.cherrystudio\bin\openclaw.exe"
```

### 第四步：验证

```powershell
openclaw.exe --version
# 应输出类似：OpenClaw 2026.x.x (xxxxxxx)
```

然后在 Cherry Studio 中启动 OpenClaw 即可。

## 可选：修复 netstat ENOBUFS

如果启动时遇到 `ENOBUFS` 错误（TCP 连接数多时出现），需要修补 OpenClaw 源码：

```powershell
# 找到 npm 全局目录下的 dist 文件夹
$distDir = (npm root -g).Trim() + "\openclaw\dist"

# 找到包含 netstat 的文件
Select-String -Path "$distDir\*.js" -Pattern "netstat" -List | Select Filename

# 给 execFileSync 调用添加 maxBuffer: 10 * 1024 * 1024
# 给 spawnSync 调用添加 maxBuffer: 10 * 1024 * 1024
```

## 一键升级

使用 `upgrade-openclaw.ps1` 脚本自动完成停止进程、安装新版、编译包装器、修补 netstat 的全流程：

```powershell
powershell -ExecutionPolicy Bypass -File "upgrade-openclaw.ps1"
```

> ⚠️ 每次升级后需重新打 netstat 补丁（文件名哈希会变），脚本已自动处理。

## 分发

直接将编译好的 `openclaw.exe` 发给其他人即可。对方只需：

1. 安装 Node.js
2. `npm install -g openclaw@latest`
3. 用收到的 `openclaw.exe` 替换 Cherry Studio 的对应文件

## 技术原理

包装器用 bun `--compile` 编译为独立 exe，运行时：
1. 通过 `npm root -g` / `pnpm root -g` 等方式查找全局 node_modules 目录
2. 在该目录下查找 `openclaw/dist/index.js`
3. 用 `node` 启动该文件，透传所有命令行参数

这样 npm 更新 OpenClaw 后无需重新编译包装器。

## License

MIT