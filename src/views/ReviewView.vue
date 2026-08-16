<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../db'
import { useAppStore } from '../store/app'
import { renderMd } from '../utils/md'
import { Icon } from 'vant'

const store = useAppStore()
const wrongQuestions = ref([])
const starQuestions = ref([])
const tab = ref('wrong')

onMounted(async () => {
  // 错题：按错误次数排
  const records = await db.records.where('isCorrect').equals(false).toArray()
  const countMap = new Map()
  records.forEach((r) => {
    countMap.set(r.questionId, (countMap.get(r.questionId) || 0) + 1)
  })
  const qIds = [...countMap.keys()]
  const qs = await db.questions.bulkGet(qIds)
  wrongQuestions.value = qs
    .filter(Boolean)
    .map((q) => ({ ...q, wrongCount: countMap.get(q.id) }))
    .sort((a, b) => b.wrongCount - a.wrongCount)

  // 收藏
  const stars = await db.notes.where('type').equals('star').toArray()
  const sqs = await db.questions.bulkGet(stars.map((s) => s.questionId))
  starQuestions.value = sqs.filter(Boolean)
})

function startPractice(ids) {
  if (!ids.length) {
    store.$toast('没有题目')
    return
  }
  store.push('practice', { bankId: 'review', mode: 'practice', questionIds: ids })
}

function preview(q) {
  store.push('preview', { qId: q.id })
}
</script>

<template>
  <div class="review-view page-scroll">
    <div class="hero-banner" style="background: linear-gradient(135deg, #34b274, #45c98a)">
      <h2>复习中心</h2>
      <p>错题重做 · 收藏夹 · 巩固薄弱点</p>
    </div>

    <div class="tabs">
      <span
        class="tab-item"
        :class="{ active: tab === 'wrong' }"
        @click="tab = 'wrong'"
      >
        <Icon name="warning-o" size="16" />
        错题本 ({{ wrongQuestions.length }})
      </span>
      <span
        class="tab-item"
        :class="{ active: tab === 'star' }"
        @click="tab = 'star'"
      >
        <Icon name="star-o" size="16" />
        收藏夹 ({{ starQuestions.length }})
      </span>
    </div>

    <template v-if="tab === 'wrong'">
      <div class="card">
        <div class="card-title">
          错题本
          <span
            v-if="wrongQuestions.length"
            class="redo-btn"
            @click="startPractice(wrongQuestions.map((q) => q.id))"
          >
            全部重做
          </span>
        </div>
        <div v-if="!wrongQuestions.length" class="empty-hint">暂无错题，继续保持！</div>
        <div v-for="q in wrongQuestions" :key="q.id" class="review-item" @click="preview(q)">
          <div class="ri-top">
            <span class="ri-tag pill pill-primary">错{{ q.wrongCount }}次</span>
          </div>
          <div class="ri-content md" v-html="renderMd(q.content)"></div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="card">
        <div class="card-title">
          收藏夹
          <span
            v-if="starQuestions.length"
            class="redo-btn"
            @click="startPractice(starQuestions.map((q) => q.id))"
          >
            全部练习
          </span>
        </div>
        <div v-if="!starQuestions.length" class="empty-hint">还没有收藏的题目</div>
        <div v-for="q in starQuestions" :key="q.id" class="review-item" @click="preview(q)">
          <div class="ri-content md" v-html="renderMd(q.content)"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  margin: 12px 12px 0;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.tab-item.active {
  color: var(--primary);
  border-bottom: 2px solid var(--primary);
}
.redo-btn {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
  float: right;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-light);
}
.empty-hint {
  text-align: center;
  color: var(--text-sub);
  padding: 30px 0;
  font-size: 14px;
}
.review-item {
  padding: 12px 0;
  border-bottom: 1px solid #f2f2f4;
  cursor: pointer;
}
.review-item:last-child {
  border-bottom: none;
}
.ri-top {
  margin-bottom: 6px;
}
.ri-content {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>