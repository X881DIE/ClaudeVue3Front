<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button @click="close" class="btn-close">×</button>
      </div>

      <div class="modal-body">
        <div
          v-for="folder in folders"
          :key="folder.id"
          :class="['folder-option', { selected: selectedId === folder.id }]"
          @click="selectFolder(folder.id)"
        >
          <span class="folder-icon">📁</span>
          <span class="folder-name">{{ folder.name }}</span>
          <span v-if="selectedId === folder.id" class="check-icon">✓</span>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-cancel">取消</button>
        <button @click="confirm" class="btn-confirm" :disabled="!selectedId">
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '选择文件夹'
  },
  folders: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'confirm'])

const selectedId = ref(null)

const selectFolder = (id) => {
  selectedId.value = id
}

const close = () => {
  selectedId.value = null
  emit('close')
}

const confirm = () => {
  if (selectedId.value) {
    emit('confirm', selectedId.value)
    selectedId.value = null
  }
}

const handleOverlayClick = () => {
  close()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f5f5f5;
  color: #333;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.folder-option {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  margin-bottom: 4px;
  border: 2px solid transparent;
}

.folder-option:hover {
  background: #f5f5f5;
}

.folder-option.selected {
  background: #e3f2fd;
  border-color: #2196f3;
}

.folder-icon {
  font-size: 20px;
}

.folder-name {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
}

.check-icon {
  color: #2196f3;
  font-size: 20px;
  font-weight: bold;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-confirm {
  background: #2196f3;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #1976d2;
}

.btn-confirm:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
