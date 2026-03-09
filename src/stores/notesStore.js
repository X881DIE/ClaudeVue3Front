import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useNotesStore = defineStore('notes', () => {
  const folders = ref([])
  const notes = ref([])
  const currentNoteId = ref(null)
  const currentFolderId = ref(null)
  const externalFile = ref(null) // 外部文件预览

  // 从localStorage加载数据
  const loadData = () => {
    const savedFolders = localStorage.getItem('notes_folders')
    const savedNotes = localStorage.getItem('notes_notes')

    if (savedFolders) {
      folders.value = JSON.parse(savedFolders)
    } else {
      // 初始化默认文件夹
      folders.value = [
        { id: 'default', name: '我的笔记', parentId: null, createdAt: Date.now() }
      ]
    }

    if (savedNotes) {
      notes.value = JSON.parse(savedNotes)
    }
  }

  // 保存数据到localStorage
  const saveData = () => {
    localStorage.setItem('notes_folders', JSON.stringify(folders.value))
    localStorage.setItem('notes_notes', JSON.stringify(notes.value))
  }

  // 文件夹操作
  const addFolder = (name, parentId = null) => {
    const folder = {
      id: Date.now().toString(),
      name,
      parentId,
      createdAt: Date.now()
    }
    folders.value.push(folder)
    saveData()
    return folder
  }

  const deleteFolder = (folderId) => {
    folders.value = folders.value.filter(f => f.id !== folderId)
    notes.value = notes.value.filter(n => n.folderId !== folderId)
    saveData()
  }

  const renameFolder = (folderId, newName) => {
    const folder = folders.value.find(f => f.id === folderId)
    if (folder) {
      folder.name = newName
      saveData()
    }
  }

  // 笔记操作
  const addNote = (title, folderId = 'default') => {
    const note = {
      id: Date.now().toString(),
      title: title || '无标题笔记',
      content: '',
      folderId,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    notes.value.push(note)
    currentNoteId.value = note.id
    saveData()
    return note
  }

  const deleteNote = (noteId) => {
    notes.value = notes.value.filter(n => n.id !== noteId)
    if (currentNoteId.value === noteId) {
      currentNoteId.value = null
    }
    saveData()
  }

  const updateNote = (noteId, updates) => {
    const note = notes.value.find(n => n.id === noteId)
    if (note) {
      Object.assign(note, updates, { updatedAt: Date.now() })
      saveData()
    }
  }

  // 外部文件操作
  const openExternalFile = (title, content) => {
    externalFile.value = {
      title,
      content,
      isExternal: true
    }
    currentNoteId.value = null // 清除当前笔记选择
  }

  const saveExternalFile = (folderId = 'default') => {
    if (!externalFile.value) return

    const note = addNote(externalFile.value.title, folderId)
    updateNote(note.id, { content: externalFile.value.content })
    externalFile.value = null
    return note
  }

  const closeExternalFile = () => {
    externalFile.value = null
  }

  // 计算属性
  const currentNote = computed(() => {
    return notes.value.find(n => n.id === currentNoteId.value)
  })

  const currentView = computed(() => {
    if (externalFile.value) return externalFile.value
    return currentNote.value
  })

  const folderNotes = computed(() => {
    if (!currentFolderId.value) return notes.value
    return notes.value.filter(n => n.folderId === currentFolderId.value)
  })

  return {
    folders,
    notes,
    currentNoteId,
    currentFolderId,
    externalFile,
    currentNote,
    currentView,
    folderNotes,
    loadData,
    saveData,
    addFolder,
    deleteFolder,
    renameFolder,
    addNote,
    deleteNote,
    updateNote,
    openExternalFile,
    saveExternalFile,
    closeExternalFile
  }
})
