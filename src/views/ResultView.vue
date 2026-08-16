<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../db'
import { useAppStore } from '../store/app'
import { renderMd } from '../utils/md'
import { showConfirmDialog } from 'vant'

const store = useAppStore()
const params = store.current.params || {}
const { bankId, stats, questionIds } = params

const wrongQuestions = ref([])

const rate = computed(() =>
  stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0
)

onMounted(async () => {
  const qs = await db.questions.bulkGet(questionIds)
  // 从 records 中找出本场做错或未答的题目（本场为做错）
  const recs = await db.records
    .where('questionId')
    .anyOf(questionIds)
    .reverse()
    .sortBy('createAt')
  const wrongMap = new Map()
  recs.forEach((r) => {
    if (r.isCorrect === false) wrongMap.set(r.questionId, r)
  })
  const qMap = new Map(qs.filter(Boolean).map((q) => [q.id, q]))
  wrongQuestions.value = [...wrongMap.keys()]
    .map((id) => ({ q: qMap.get(id), rec: wrongMap.get(id) }))
    .filter((x) => x.q)
})

function goHome() {
  store.backToHome()
}

function redoWrong() {
  const ids = wrongQuestions.value.map((x) => x.q.id)
  if (!ids.length) return
  store.replace('practice', { bankId, mode: 'practice', questionIds: ids })
}

function redoAll() {
  store.replace('practice', { bankId, mode: 'practice', questionIds })
}
</script>

<template>
  <div class="result-view page-scroll">
    <div class="result-hero">
      <div class="ring" :style="{ '--rate': rate }">
        <div class="ring-inner">
          <div class="rate-num">{{ rate }}%</div>
          <div class="rate-label">正确率</div>
        </div>
      </div>
      <div class="result-summary">
        <div class="sum-row">
          <span>作答</span>
          <strong>{{ stats.answered }}/{{ stats.total }}</strong>
        </div>
        <div class="sum-row">
          <span>答对</span>
          <strong class="ok">{{ stats.correct }}</strong>
        </div>
        <div class="sum-row">
          <span>答错</span>
          <strong class="bad">{{ stats.answered - stats.correct }}</strong>
        </div>
      </div>
    </div>

    <div class="result-actions">
      <button class="rbtn primary" @click="redoAll">再做一遍</button>
      <button v-if="wrongQuestions.length" class="rbtn plain" @click="redoWrong">
        重做错题（{{ wrongQuestions.length }}）
      </button>
      <button class="rbtn ghost" @click="goHome">返回题库</button>
    </div>

    <template v-if="wrongQuestions.length">
      <div class="card">
        <div class="card-title">本次错题</div>
        <div v-for="item in wrongQuestions" :key="item.q.id" class="wrong-item">
          <div class="wrong-q md" v-html="renderMd(item.q.content)"></div>
          <div class="wrong-ans">
            你的答案：<span class="bad">{{ item.rec.userAnswer || '未作答' }}</span>
            · 正确答案：<span class="ok">{{ item.q.answer }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.result-view {
  padding-bottom: 40px;
}
.result-hero {
  background: linear-gradient(135deg, #ff6a00, #ff9a3c);
  color: #fff;
  padding: 30px 20px 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  border-radius: 0 0 22px 22px;
}
.ring {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: conic-gradient(#fff calc(var(--rate) * 1%), rgba(255, 255, 255, 0.3) 0);
  display: grid;
  place-items: center;
}
.ring-inner {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: #ff7a1a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.rate-num {
  font-size: 24px;
  font-weight: 800;
}
.rate-label {
  font-size: 12px;
  opacity: 0.9;
}
.result-summary .sum-row {
  display: flex;
  justify-content: space-between;
  min-width: 120px;
  margin: 8px 0;
  font-size: 14px;
}
.result-summary .ok {
  color: #d9f7e6;
}
.result-summary .bad {
  color: #ffe0dd;
}
.result-actions {
  display: flex;
  gap: 10px;
  padding: 16px 16px 0;
}
.rbtn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.rbtn.primary {
  background: linear-gradient(135deg, #ff6a00, #ff8c2e);
  color: #fff;
}
.rbtn.plain {
  background: #fff;
  color: var(--primary);
  border: 1px solid var(--primary);
}
.rbtn.ghost {
  background: #f2f3f5;
  color: var(--text);
  flex: none;
  padding: 0 16px;
}
.wrong-item {
  padding: 10px 0;
  border-bottom: 1px solid #f2f2f4;
}
.wrong-item:last-child {
  border-bottom: none;
}
.wrong-q {
  font-size: 14px;
}
.wrong-ans {
  font-size: 13px;
  color: var(--text-sub);
  margin-top: 6px;
}
.bad {
  color: var(--danger);
}
.ok {
  color: var(--success);
}
</style>
