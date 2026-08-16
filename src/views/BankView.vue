<script setup>
import { ref, onMounted, computed } from 'vue'
import { db, getBankStats } from '../db'
import { useAppStore } from '../store/app'
import { Icon } from 'vant'

const store = useAppStore()
const params = store.current.params || {}
const bankId = params.id

const bank = ref(null)
const stats = ref(null)
const shuffle = ref(false)

onMounted(async () => {
  bank.value = await db.banks.get(bankId)
  stats.value = await getBankStats(bankId)
})

function goBack() {
  store.pop()
}

async function start(mode) {
  const questions = await db.questions.where('bankId').equals(bankId).toArray()
  if (!questions.length) {
    store.$toast('该题库暂无题目')
    return
  }
  let list = questions.map((q) => q.id)
  if (shuffle.value) {
    list = list.sort(() => Math.random() - 0.5)
  }
  store.push('practice', { bankId, mode, questionIds: list })
}

const doneRate = computed(() =>
  stats.value && stats.value.total ? Math.round((stats.value.done / stats.value.total) * 100) : 0
)
</script>

<template>
  <div v-if="bank" class="bank-view">
    <van-nav-bar :title="bank.name" left-arrow fixed placeholder @click-left="goBack" />

    <div class="page-scroll bank-body">
      <div class="card">
        <div class="bank-brief">
          <div class="name">{{ bank.name }}</div>
          <div class="desc">{{ bank.description || '软件设计师真题' }}</div>
        </div>
        <div class="stats-row">
          <div class="item">
            <div class="num primary">{{ stats?.total ?? 0 }}</div>
            <div class="label">总题数</div>
          </div>
          <div class="item">
            <div class="num success">{{ stats?.done ?? 0 }}</div>
            <div class="label">已做</div>
          </div>
          <div class="item">
            <div class="num" :class="(stats?.rate ?? 0) >= 60 ? 'success' : 'danger'">
              {{ stats?.rate ?? 0 }}%
            </div>
            <div class="label">正确率</div>
          </div>
        </div>
        <div class="progress-row">
          <van-progress
            :percentage="doneRate"
            :show-pivot="false"
            stroke-width="6"
            color="#ff6a00"
          />
        </div>
      </div>

      <div class="card">
        <div class="card-title">开始练习</div>
        <div class="mode-btn practice" @click="start('practice')">
          <div class="mode-icon"><Icon name="edit" size="20" color="#fff" /></div>
          <div class="mode-info">
            <div class="mode-name">刷题模式</div>
            <div class="mode-desc">作答后点「确认答案」判分，记录成绩</div>
          </div>
          <Icon name="arrow" class="arrow" />
        </div>
        <div class="mode-btn recite" @click="start('recite')">
          <div class="mode-icon"><Icon name="eye-o" size="20" color="#fff" /></div>
          <div class="mode-info">
            <div class="mode-name">背题模式</div>
            <div class="mode-desc">选择即显对错并展开解析，快速过知识点</div>
          </div>
          <Icon name="arrow" class="arrow" />
        </div>

        <div class="shuffle-row">
          <span>乱序练习</span>
          <van-switch v-model="shuffle" active-color="#ff6a00" size="20px" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bank-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.bank-body {
  flex: 1;
}
.bank-brief .name {
  font-size: 19px;
  font-weight: 700;
}
.bank-brief .desc {
  font-size: 13px;
  color: var(--text-sub);
  margin-top: 6px;
}
.stats-row {
  display: flex;
  margin: 18px 0 8px;
}
.stats-row .item {
  flex: 1;
  text-align: center;
}
.stats-row .num {
  font-size: 22px;
  font-weight: 700;
}
.stats-row .label {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 4px;
}
.progress-row {
  margin-top: 6px;
}
.mode-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  cursor: pointer;
  color: #fff;
}
.mode-btn.practice {
  background: linear-gradient(135deg, #ff6a00, #ff8c2e);
}
.mode-btn.recite {
  background: linear-gradient(135deg, #34b274, #2fbf8f);
}
.mode-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.22);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.mode-info {
  flex: 1;
}
.mode-name {
  font-size: 16px;
  font-weight: 700;
}
.mode-desc {
  font-size: 12px;
  opacity: 0.92;
  margin-top: 2px;
}
.arrow {
  opacity: 0.85;
}
.shuffle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f2f2f4;
  font-size: 14px;
}
</style>
