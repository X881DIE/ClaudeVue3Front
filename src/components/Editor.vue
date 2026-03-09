<template>
  <div class="editor" v-if="currentView">
    <div class="editor-header">
      <input
        v-if="!isExternalFile"
        v-model="noteTitle"
        @input="updateTitle"
        class="title-input"
        placeholder="无标题笔记"
      />
      <div v-else class="title-display">
        <span class="external-badge">📂 外部文件</span>
        <span class="title-text">{{ noteTitle }}</span>
      </div>
      <div class="editor-actions">
        <button v-if="!isExternalFile" @click="insertImage" class="btn-action btn-insert">
          🖼️ 插入图片
        </button>
        <button v-if="!isExternalFile" @click="togglePreview" class="btn-action">
          {{ showPreview ? '📝 编辑' : '👁️ 预览' }}
        </button>
        <button v-if="!isExternalFile" @click="exportMarkdown" class="btn-action btn-export">
          💾 导出
        </button>
        <button v-if="isExternalFile" @click="saveToWorkspace" class="btn-action btn-save">
          💾 保存到工作区
        </button>
        <button v-if="isExternalFile" @click="closeExternal" class="btn-action">
          ✕ 关闭
        </button>
        <button v-if="!isExternalFile" @click="deleteCurrentNote" class="btn-action btn-danger">
          🗑️ 删除
        </button>
      </div>
    </div>

    <div class="editor-body">
      <!-- CodeMirror 编辑器容器 -->
      <div
        v-show="!showPreview || isExternalFile"
        ref="editorContainer"
        class="cm-container"
        :class="{ 'readonly': isExternalFile }"
      ></div>

      <!-- Markdown 预览 -->
      <div v-if="showPreview && !isExternalFile" class="preview-pane">
        <div class="markdown-body" v-html="renderedMarkdown"></div>
      </div>
    </div>

    <div class="editor-footer">
      <span class="word-count">{{ wordCount }} 字</span>
      <span v-if="!isExternalFile" class="last-saved">最后保存: {{ lastSavedTime }}</span>
      <span v-else class="external-hint">只读模式 - 可保存到工作区进行编辑</span>
    </div>
  </div>

  <div v-else class="empty-editor">
    <div class="empty-content">
      <h2>📝</h2>
      <p>选择一个笔记开始编辑</p>
      <p class="hint">或创建一个新笔记</p>
    </div>
  </div>

  <!-- 文件夹选择模态框 -->
  <FolderSelectModal
    :show="showFolderModal"
    :folders="store.folders"
    title="保存到文件夹"
    @close="showFolderModal = false"
    @confirm="handleFolderSelect"
  />

  <!-- 图片选择 input -->
  <input
    ref="imageInput"
    type="file"
    accept="image/*"
    @change="handleImageSelect"
    style="display: none"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useNotesStore } from '@/stores/notesStore'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import FolderSelectModal from './FolderSelectModal.vue'

// CodeMirror 6
import { EditorView, keymap, lineNumbers, drawSelection } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { imageFoldExtension } from '@/composables/useImageFold'

const store = useNotesStore()

const showPreview = ref(false)
const noteTitle = ref('')
const noteContent = ref('')         // 始终保存真实内容
const lastSavedTime = ref('刚刚')
const showFolderModal = ref(false)
const imageInput = ref(null)
const editorContainer = ref(null)   // CodeMirror 挂载点

let editorView = null
let saveTimer = null
let ignoreNextUpdate = false        // 防止 watch 和 CodeMirror 互相触发

// ─── marked 配置 ──────────────────────────────────────────────────────────
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

// ─── 计算属性 ──────────────────────────────────────────────────────────────
const currentNote = computed(() => store.currentNote)
const currentView = computed(() => store.currentView)
const isExternalFile = computed(() => currentView.value?.isExternal || false)

const renderedMarkdown = computed(() => {
  if (!noteContent.value) return '<p class="empty-hint">开始写作...</p>'
  return marked(noteContent.value)
})

const wordCount = computed(() => noteContent.value.replace(/\s/g, '').length)

// ─── CodeMirror 初始化 ────────────────────────────────────────────────────
const initEditor = (content = '', readonly = false) => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }

  const extensions = [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    lineNumbers(),
    drawSelection(),
    markdown(),
    EditorView.lineWrapping,
    EditorView.editable.of(!readonly),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !ignoreNextUpdate) {
        const newContent = update.state.doc.toString()
        noteContent.value = newContent
        scheduleSave()
      }
    }),
    ...imageFoldExtension(),
    // 编辑器基础样式
    EditorView.baseTheme({
      '&': {
        height: '100%',
        fontSize: '16px',
        fontFamily: "'Consolas', 'Monaco', monospace"
      },
      '.cm-scroller': {
        lineHeight: '1.8',
        overflow: 'auto'
      },
      '.cm-content': {
        padding: '30px 30px 30px 8px',
        caretColor: '#333'
      },
      '.cm-line': {
        padding: '0'
      },
      '.cm-gutters': {
        background: '#fafafa',
        borderRight: '1px solid #e0e0e0'
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px',
        color: '#ccc',
        minWidth: '32px'
      }
    })
  ]

  const state = EditorState.create({
    doc: content,
    extensions
  })

  editorView = new EditorView({
    state,
    parent: editorContainer.value
  })
}

// ─── 保存逻辑 ─────────────────────────────────────────────────────────────
const scheduleSave = () => {
  if (!currentNote.value || isExternalFile.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    store.updateNote(currentNote.value.id, { content: noteContent.value })
    updateSavedTime()
  }, 500)
}

const updateSavedTime = () => {
  lastSavedTime.value = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ─── 切换笔记 ─────────────────────────────────────────────────────────────
watch(currentView, async (view) => {
  if (!view) return
  noteTitle.value = view.title
  noteContent.value = view.content || ''
  showPreview.value = view.isExternal || false

  await nextTick()

  if (editorContainer.value) {
    initEditor(noteContent.value, view.isExternal || false)
  }
}, { immediate: false })

onMounted(async () => {
  await nextTick()
  if (currentView.value && editorContainer.value) {
    noteTitle.value = currentView.value.title
    noteContent.value = currentView.value.content || ''
    showPreview.value = currentView.value.isExternal || false
    initEditor(noteContent.value, currentView.value.isExternal || false)
  }
})

onUnmounted(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
  clearTimeout(saveTimer)
})

// ─── 功能方法 ─────────────────────────────────────────────────────────────
const updateTitle = () => {
  if (!currentNote.value || isExternalFile.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    store.updateNote(currentNote.value.id, { title: noteTitle.value })
    updateSavedTime()
  }, 500)
}

const togglePreview = () => {
  showPreview.value = !showPreview.value
}

const deleteCurrentNote = () => {
  if (currentNote.value && confirm('确定删除这篇笔记吗？')) {
    store.deleteNote(currentNote.value.id)
  }
}

const saveToWorkspace = () => {
  const folders = store.folders
  if (folders.length === 0) { alert('请先创建文件夹'); return }
  if (folders.length === 1) { store.saveExternalFile(folders[0].id); alert('已保存到工作区'); return }
  showFolderModal.value = true
}

const handleFolderSelect = (folderId) => {
  store.saveExternalFile(folderId)
  showFolderModal.value = false
  alert('已保存到工作区')
}

const closeExternal = () => {
  if (confirm('关闭外部文件？未保存的内容将丢失。')) {
    store.closeExternalFile()
  }
}

const exportMarkdown = () => {
  if (!currentView.value) return
  const blob = new Blob([noteContent.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = (noteTitle.value || '无标题笔记').replace(/[\\/:*?"<>|]/g, '_') + '.md'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 插入图片（在光标处）
const insertImage = () => imageInput.value?.click()

const handleImageSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result
    const markdown = `![${file.name}](${base64})\n`

    if (editorView) {
      // 在 CodeMirror 光标处插入
      const { from } = editorView.state.selection.main
      editorView.dispatch({
        changes: { from, insert: markdown }
      })
    } else {
      noteContent.value += markdown
    }

    if (currentNote.value && !isExternalFile.value) {
      store.updateNote(currentNote.value.id, { content: noteContent.value })
      updateSavedTime()
    }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}
</script>

<style scoped>
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  height: 100vh;
  overflow: hidden;
}

.editor-header {
  padding: 20px 30px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.title-input {
  flex: 1;
  font-size: 24px;
  font-weight: 600;
  border: none;
  outline: none;
  padding: 8px 0;
}

.title-input::placeholder { color: #ccc; }

.title-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.external-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.title-text {
  font-size: 24px;
  font-weight: 600;
}

.editor-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-action {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-action:hover { background: #f5f5f5; }
.btn-danger:hover { background: #ffebee; border-color: #f44336; color: #f44336; }
.btn-export:hover { background: #e8f5e9; border-color: #4caf50; color: #4caf50; }
.btn-save:hover   { background: #e3f2fd; border-color: #2196f3; color: #2196f3; }
.btn-insert:hover { background: #fff3e0; border-color: #ff9800; color: #ff9800; }

.editor-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* CodeMirror 容器 */
.cm-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 强制 CodeMirror 占满高度 */
.cm-container :deep(.cm-editor) {
  height: 100%;
}
.cm-container :deep(.cm-scroller) {
  overflow: auto;
}

.cm-container.readonly :deep(.cm-editor) {
  background: #fafafa;
}

/* 预览区 */
.preview-pane {
  flex: 1;
  overflow-y: auto;
}

.markdown-body {
  padding: 30px;
  line-height: 1.8;
}

/* Footer */
.editor-footer {
  padding: 12px 30px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.external-hint {
  color: #1976d2;
  font-style: italic;
}

/* 空状态 */
.empty-editor {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.empty-content { text-align: center; color: #999; }
.empty-content h2 { font-size: 64px; margin-bottom: 20px; }
.empty-content p { font-size: 16px; margin: 8px 0; }
.hint { font-size: 14px; color: #ccc; }

/* ── Markdown 预览样式 ── */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 8px; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 8px; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body p { margin-bottom: 16px; }
.markdown-body code {
  background: #f6f8fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9em;
}
.markdown-body pre {
  background: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
}
.markdown-body pre code { background: none; padding: 0; }
.markdown-body blockquote {
  border-left: 4px solid #ddd;
  padding-left: 16px;
  color: #666;
  margin: 16px 0;
}
.markdown-body ul, .markdown-body ol { padding-left: 24px; margin-bottom: 16px; }
.markdown-body li { margin-bottom: 8px; }
.markdown-body a { color: #0366d6; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body img { max-width: 100%; border-radius: 6px; }
.markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
.markdown-body th,
.markdown-body td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
.markdown-body th { background: #f6f8fa; font-weight: 600; }
.empty-hint { color: #ccc; font-style: italic; }
</style>
