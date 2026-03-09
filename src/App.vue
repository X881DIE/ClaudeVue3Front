<template>
  <div class="app-container">
    <Sidebar />
    <Editor />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Editor from './components/Editor.vue'
import { useNotesStore } from './stores/notesStore'

const store = useNotesStore()

onMounted(() => {
  store.loadData()
})
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
</style>
