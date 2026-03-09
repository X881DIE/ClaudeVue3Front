<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>📝 笔记</h2>
      <div class="header-actions">
        <button @click="openExternalFile" class="btn-icon" title="打开外部文件">
          📂
        </button>
        <button @click="createFolder" class="btn-icon" title="新建文件夹">
          📁+
        </button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".md,.markdown"
      @change="handleFileSelect"
      style="display: none"
    />

    <div class="folder-list">
      <!-- Markdown文件夹区标题 -->
      <div class="section-header" @click="toggleFolderArea">
        <button class="btn-section-toggle" @click.stop="toggleFolderArea">
          {{ folderAreaCollapsed ? '▶' : '▼' }}
        </button>
        <span class="section-title">📁 Markdown文件夹区</span>
      </div>

      <div v-show="!folderAreaCollapsed">
        <div
          v-for="folder in folders"
          :key="folder.id"
          class="folder-section"
        >
        <!-- 文件夹头部 -->
        <div
          :class="['folder-header', { active: currentFolderId === folder.id }]"
          @click="selectFolder(folder.id)"
        >
          <button
            @click.stop="toggleFolder(folder.id)"
            class="btn-toggle"
          >
            {{ collapsedFolders[folder.id] ? '▶' : '▼' }}
          </button>
          <span class="folder-icon">📁</span>
          <span class="folder-name">{{ folder.name }}</span>
          <div class="folder-actions">
            <button
              @click.stop="createNoteInFolder(folder.id)"
              class="btn-add-note"
              title="新建笔记"
            >
              +
            </button>
            <button
              @click.stop="deleteFolder(folder.id)"
              class="btn-delete-folder"
              :class="{ disabled: folder.id === 'default' }"
              :disabled="folder.id === 'default'"
              :title="folder.id === 'default' ? '默认文件夹不可删除' : '删除文件夹'"
            >
              🗑️
            </button>
          </div>
        </div>

        <!-- 文件夹下的笔记列表 -->
        <div v-show="!collapsedFolders[folder.id]" class="notes-list">
          <div
            v-for="note in getFolderNotes(folder.id)"
            :key="note.id"
            :class="['note-item', { active: currentNoteId === note.id }]"
            @click="selectNote(note.id)"
          >
            <div class="note-title">{{ note.title }}</div>
            <div class="note-date">{{ formatDate(note.updatedAt) }}</div>
          </div>

          <div v-if="getFolderNotes(folder.id).length === 0" class="empty-state">
            暂无笔记
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useNotesStore } from '@/stores/notesStore'

const store = useNotesStore()
const fileInput = ref(null)
const collapsedFolders = reactive({})
const folderAreaCollapsed = ref(false)

const folders = computed(() => store.folders)
const currentFolderId = computed(() => store.currentFolderId)
const currentNoteId = computed(() => store.currentNoteId)

const getFolderNotes = (folderId) => {
  return store.notes.filter(n => n.folderId === folderId)
}

const createFolder = () => {
  const name = prompt('请输入文件夹名称：')
  if (name && name.trim()) {
    store.addFolder(name.trim())
  }
}

const deleteFolder = (folderId) => {
  if (confirm('确定删除此文件夹及其所有笔记吗？')) {
    store.deleteFolder(folderId)
  }
}

const selectFolder = (folderId) => {
  store.currentFolderId = folderId
}

const toggleFolder = (folderId) => {
  collapsedFolders[folderId] = !collapsedFolders[folderId]
}

const toggleFolderArea = () => {
  folderAreaCollapsed.value = !folderAreaCollapsed.value
}

const createNoteInFolder = (folderId) => {
  store.addNote('无标题笔记', folderId)
}

const selectNote = (noteId) => {
  store.currentNoteId = noteId
}

const openExternalFile = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const content = await file.text()
    const fileName = file.name.replace(/\.md$|\.markdown$/i, '')

    // 打开外部文件预览
    store.openExternalFile(fileName, content)
  } catch (error) {
    alert('读取文件失败：' + error.message)
  }

  // 清空input，允许重复选择同一文件
  event.target.value = ''
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`

  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #f0f0f0;
}

.folder-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.section-header {
  padding: 12px 16px 8px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.section-header:hover {
  background: #f0f0f0;
}

.btn-section-toggle {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 2px;
  color: #666;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background 0.2s;
}

.btn-section-toggle:hover {
  background: #e0e0e0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.folder-section {
  margin-bottom: 2px;
}

.folder-header {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  border-left: 3px solid transparent;
}

.folder-header:hover {
  background: #f5f5f5;
}

.folder-header.active {
  background: #e3f2fd;
  border-left-color: #2196f3;
}

.btn-toggle {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 2px;
  color: #666;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background 0.2s;
}

.btn-toggle:hover {
  background: #e0e0e0;
}

.folder-icon {
  font-size: 16px;
}

.folder-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.folder-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.folder-header:hover .folder-actions {
  opacity: 1;
}

.btn-add-note {
  background: none;
  border: none;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 3px;
  transition: all 0.2s;
  line-height: 1;
}

.btn-add-note:hover {
  background: #e0e0e0;
  color: #2196f3;
}

.btn-delete-folder {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.2s;
  line-height: 1;
}

.btn-delete-folder:not(.disabled):hover {
  background: #ffebee;
  transform: scale(1.1);
}

.btn-delete-folder.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-delete {
  background: none;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 3px;
  transition: all 0.2s;
  line-height: 1;
}

.btn-delete:hover {
  background: #ffebee;
  color: #f44336;
}

.notes-list {
  padding-left: 48px;
  padding-right: 12px;
  padding-top: 4px;
  padding-bottom: 8px;
  background: #fafafa;
  border-left: 2px solid #e0e0e0;
  margin-left: 16px;
}

.note-item {
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  background: #fff;
  border: 1px solid #e0e0e0;
}

.note-item:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.note-item.active {
  background: #e3f2fd;
  border-color: #2196f3;
}

.note-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-date {
  font-size: 11px;
  color: #999;
}

.empty-state {
  padding: 20px 12px;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>
