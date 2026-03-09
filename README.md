<<<<<<< HEAD
# 高级笔记应用 Demo

基于Vue 3的本地优先笔记应用，支持Markdown编辑、代码高亮和文件夹管理。

## 功能特性

- ✅ Markdown编辑和实时预览
- ✅ 代码语法高亮（支持50+编程语言）
- ✅ 文件夹层级管理
- ✅ 本地存储（localStorage）
- ✅ 自动保存
- ✅ 字数统计

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

## 技术栈

- **Vue 3** - 渐进式JavaScript框架
- **Pinia** - Vue状态管理
- **Vite** - 下一代前端构建工具
- **Marked** - Markdown解析器
- **Highlight.js** - 代码语法高亮

## 项目结构

```
src/
├── components/
│   ├── Sidebar.vue      # 侧边栏（文件夹和笔记列表）
│   └── Editor.vue       # Markdown编辑器
├── stores/
│   └── notesStore.js    # Pinia状态管理
├── App.vue              # 主应用组件
├── main.js              # 应用入口
└── style.css            # 全局样式
```

## 使用说明

1. **创建文件夹**：点击侧边栏顶部的"📁+"按钮
2. **创建笔记**：选择文件夹后，点击"+"按钮创建新笔记
3. **编辑笔记**：在编辑器中输入Markdown内容，支持实时保存
4. **预览笔记**：点击"👁️ 预览"按钮查看渲染效果
5. **删除笔记**：点击"🗑️ 删除"按钮删除当前笔记

## Markdown语法支持

- 标题（# H1 到 ###### H6）
- 列表（有序/无序）
- 代码块（支持语法高亮）
- 引用块
- 链接和图片
- 表格
- 粗体/斜体

## 数据存储

所有数据存储在浏览器的localStorage中，包括：
- 文件夹结构
- 笔记内容
- 笔记元数据

数据格式为JSON，可通过浏览器开发者工具查看。

## 后续开发计划

- [ ] 标签系统
- [ ] 搜索功能
- [ ] 导入/导出Markdown文件
- [ ] 主题切换（亮色/暗色）
- [ ] AI智能摘要
- [ ] 多媒体嵌入
- [ ] 云同步

## License

MIT

# ClaudeVue3Front
Claude code参与的前端工程开发
