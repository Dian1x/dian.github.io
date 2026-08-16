<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { db, importBank, getBankStats } from '../db'
import { useAppStore } from '../store/app'
import { showToast, showSuccessToast, showConfirmDialog, Icon, ActionSheet } from 'vant'

const store = useAppStore()
const banks = ref([])
const loading = ref(true)
const showSheet = ref(false)

const sheetActions = [
  { name: '导入内置真题库（2024上/下、2025上/下）', subname: '已随应用内置，一键导入', color: '#ff6a00' },
  { name: '从 Excel(.xlsx) 导入题库' },
  { name: '从 JSON 备份导入' }
]

function formatTime(t) {
  const d = new Date(t)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return '今天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

async function load() {
  loading.value = true
  banks.value = await db.banks.orderBy('createTime').reverse().toArray()
  for (const b of banks.value) {
    b.stats = await getBankStats(b.id)
  }
  loading.value = false
}

onMounted(load)
onActivated(load)

// 导入内置真题库
async function importPreset() {
  const { seedBanks } = await import('../data/seed.js')
  let total = 0
  for (const bank of seedBanks) {
    const r = await importBank({
      name: bank.name,
      description: bank.description,
      questions: bank.questions,
      overwrite: false
    })
    total += r.count
  }
  showSuccessToast(`已导入 ${total} 道真题`)
  load()
}

function onAdd() {
  showSheet.value = true
}

function onSheetSelect(item, index) {
  showSheet.value = false
  if (index === 0) importPreset()
  else if (index === 1) importExcel()
  else if (index === 2) importJson()
}

function importExcel() {
  showToast('请在"我的-题库导入"中使用 Excel 导入功能')
}

function importJson() {
  showToast('请在"我的-题库导入"中使用 JSON 导入功能')
}

function openBank(bank) {
  store.push('bank', { id: bank.id })
}

function deleteBank(bank) {
  showConfirmDialog({
    title: '删除题库',
    message: `确定删除「${bank.name}」吗？相关做题记录与笔记将一并删除。`,
    confirmButtonColor: '#f53f3f'
  })
    .then(async () => {
      await db.transaction('rw', db.questions, db.records, db.notes, db.banks, async () => {
        const qs = await db.questions.where('bankId').equals(bank.id).toArray()
        const ids = qs.map((q) => q.id)
        if (ids.length) {
          await db.records.where('questionId').anyOf(ids).delete()
          await db.notes.where('questionId').anyOf(ids).delete()
        }
        await db.questions.where('bankId').equals(bank.id).delete()
        await db.banks.delete(bank.id)
      })
      showSuccessToast('已删除')
      load()
    })
    .catch(() => {})
}
</script>

<template>
  <div class="home page-scroll">
    <div class="hero-banner">
      <h2>极简刷题</h2>
      <p>软考中级软件设计师 · 历年真题 · 本地离线可用</p>
    </div>

    <div class="bank-list">
      <div v-if="!banks.length && !loading" class="card">
        <p style="color: var(--text-sub); text-align: center; margin-bottom: 12px">
          还没有题库，先导入内置真题库开始刷题吧
        </p>
        <button class="btn-block" @click="importPreset">导入内置真题库</button>
      </div>

      <div v-for="b in banks" :key="b.id" class="card bank-card" @click="openBank(b)">
        <div class="bank-top">
          <div class="bank-name">{{ b.name }}</div>
          <Icon name="arrow" class="arrow" />
        </div>
        <div class="bank-desc">{{ b.description }}</div>
        <div class="bank-meta">
          <span class="pill pill-primary">{{ b.stats.total }} 题</span>
          <span v-if="b.stats.done" class="pill pill-gray">已做 {{ b.stats.done }}</span>
          <span v-if="b.stats.done" class="pill" :class="b.stats.rate >= 60 ? 'pill-rate-ok' : 'pill-rate-low'">
            正确率 {{ b.stats.rate }}%
          </span>
          <span v-if="b.stats.lastTime" class="pill pill-gray">最近 {{ formatTime(b.stats.lastTime) }}</span>
        </div>
        <div class="bank-progress">
          <van-progress
            :percentage="b.stats.total ? Math.round((b.stats.done / b.stats.total) * 100) : 0"
            :show-pivot="false"
            stroke-width="6"
            color="#ff6a00"
          />
        </div>
      </div>
    </div>

    <button class="fab" @click="onAdd">
      <Icon name="plus" size="22" color="#fff" />
    </button>

    <ActionSheet
      v-model:show="showSheet"
      :actions="sheetActions"
      cancel-text="取消"
      close-on-click-action
      @select="onSheetSelect"
    />
  </div>
</template>

<style scoped>
.home {
  position: relative;
}
.bank-list {
  padding-bottom: 80px;
}
.bank-card {
  cursor: pointer;
}
.bank-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bank-name {
  font-size: 17px;
  font-weight: 700;
}
.bank-desc {
  font-size: 13px;
  color: var(--text-sub);
  margin: 6px 0 10px;
}
.bank-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.pill-rate-ok {
  background: #e9f9f0;
  color: var(--success);
  font-weight: 600;
}
.pill-rate-low {
  background: #fff1e6;
  color: var(--primary);
  font-weight: 600;
}
.bank-progress {
  margin-top: 4px;
}
.btn-block {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--primary), #ff8c2e);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.fab {
  position: fixed;
  right: 18px;
  bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 14px);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--primary), #ff8c2e);
  box-shadow: 0 6px 18px rgba(255, 106, 0, 0.4);
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 20;
}
</style>
