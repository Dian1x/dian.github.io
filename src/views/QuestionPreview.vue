<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../db'
import { useAppStore } from '../store/app'
import { renderMd } from '../utils/md'

const store = useAppStore()
const params = store.current.params || {}
const q = ref(null)
const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

onMounted(async () => {
  q.value = await db.questions.get(params.qId)
})

function goBack() {
  store.pop()
}
</script>

<template>
  <div v-if="q" class="preview-view">
    <van-nav-bar title="题目详情" left-arrow fixed placeholder @click-left="goBack" />

    <div class="page-scroll preview-body">
      <div class="card">
        <div class="q-content md" v-html="renderMd(q.content)"></div>

        <div v-if="['single', 'judge', 'multi'].includes(q.type)" class="options">
          <div v-for="(opt, i) in q.options" :key="i" class="option-item disabled">
            <span class="opt-letter">{{ letters[i] }}</span>
            <span class="opt-text" v-html="renderMd(opt)"></span>
          </div>
        </div>

        <div class="analysis-box md">
          <div class="analysis-title">参考答案：{{ Array.isArray(q.answer) ? q.answer.join('、') : q.answer }}</div>
          <div v-html="renderMd(q.analysis)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.preview-body {
  flex: 1;
}
.options {
  pointer-events: none;
  margin-top: 16px;
}
</style>