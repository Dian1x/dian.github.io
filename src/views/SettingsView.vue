<script setup>
import { ref, onMounted } from 'vue'
import { db, exportAll, restoreAll, importBank } from '../db'
import { downloadFile, readFileAsText, readFileAsArrayBuffer } from '../utils/file'
import { showToast, showSuccessToast, showConfirmDialog } from 'vant'
import * as XLSX from 'xlsx'

const appVersion = '1.0.0'
const totalQuestions = ref(0)
const totalRecords = ref(0)
const totalNotes = ref(0)
const dbSize = ref('')

onMounted(async () => {
  totalQuestions.value = await db.questions.count()
  totalRecords.value = await db.records.count()
  totalNotes.value = await db.notes.count()
  // 估算大小
  const all = await exportAll()
  dbSize.value = formatBytes(new Blob([JSON.stringify(all)]).size)
})

function formatBytes(b) {
  if (b < 1024) return b + 'B'
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB'
  return (b / 1048576).toFixed(1) + 'MB'
}

// 导出备份
async function onExport() {
  const data = await exportAll()
  downloadFile(`QuizPWA_备份_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 1))
  showSuccessToast('导出成功')
}

// 导入备份
async function onImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async () => {
    const file = input.files[0]
    if (!file) return
    try {
      const text = await readFileAsText(file)
      const data = JSON.parse(text)
      await restoreAll(data, 'merge')
      showSuccessToast('恢复成功')
      totalQuestions.value = await db.questions.count()
      totalRecords.value = await db.records.count()
      totalNotes.value = await db.notes.count()
    } catch (e) {
      showToast('导入失败: ' + e.message)
    }
  }
  input.click()
}

// Excel 导入
async function onImportExcel() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls'
  input.onchange = async () => {
    const file = input.files[0]
    if (!file) return
    try {
      const buf = await readFileAsArrayBuffer(file)
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)
      if (!rows.length) {
        showToast('Excel 为空')
        return
      }
      const questions = rows.map((r) => ({
        type: r.type || 'single',
        content: r.content || r.题干 || '',
        options: r.options ? (typeof r.options === 'string' ? r.options.split('|') : []) : undefined,
        answer: r.answer || r.答案 || '',
        analysis: r.analysis || r.解析 || ''
      }))
      const name = prompt('请输入题库名称', file.name.replace(/\.(xlsx|xls)$/, ''))
      if (!name) return
      await importBank({ name, description: `从 ${file.name} 导入`, questions, overwrite: false })
      showSuccessToast(`导入 ${questions.length} 题`)
      totalQuestions.value = await db.questions.count()
    } catch (e) {
      showToast('导入失败: ' + e.message)
    }
  }
  input.click()
}

function clearAll() {
  showConfirmDialog({
    title: '清空数据',
    message: '确定清空所有数据（题库、记录、笔记）吗？此操作不可恢复。',
    confirmButtonColor: '#f53f3f'
  })
    .then(async () => {
      await Promise.all([db.banks.clear(), db.questions.clear(), db.records.clear(), db.notes.clear()])
      showSuccessToast('已清空')
      totalQuestions.value = 0
      totalRecords.value = 0
      totalNotes.value = 0
    })
    .catch(() => {})
}
</script>

<template>
  <div class="settings-view page-scroll">
    <div class="hero-banner" style="background: linear-gradient(135deg, #2b2b33, #444454)">
      <h2>我的</h2>
      <p>数据管理 · 备份 · 设置</p>
    </div>

    <div class="card">
      <div class="card-title">数据概览</div>
      <div class="data-row">
        <div class="data-item">
          <div class="num">{{ totalQuestions }}</div>
          <div class="label">题目</div>
        </div>
        <div class="data-item">
          <div class="num">{{ totalRecords }}</div>
          <div class="label">作答记录</div>
        </div>
        <div class="data-item">
          <div class="num">{{ totalNotes }}</div>
          <div class="label">笔记/收藏</div>
        </div>
      </div>
      <div class="db-size">本地数据大小：{{ dbSize }}</div>
    </div>

    <div class="card">
      <div class="card-title">数据管理</div>
      <div class="settings-item" @click="onExport">
        <span class="si-label">导出备份</span>
        <span class="si-desc">导出完整数据（题库 + 记录 + 笔记）</span>
      </div>
      <div class="settings-item" @click="onImport">
        <span class="si-label">导入备份</span>
        <span class="si-desc">从 JSON 备份恢复数据（合并模式）</span>
      </div>
      <div class="settings-item" @click="onImportExcel">
        <span class="si-label">Excel 导入题库</span>
        <span class="si-desc">从 .xlsx 文件导入题目</span>
      </div>
      <div class="settings-item danger" @click="clearAll">
        <span class="si-label">清空所有数据</span>
        <span class="si-desc">此操作不可恢复，请谨慎操作</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">关于</div>
      <div class="about-row">
        <span>极简刷题 QuizPWA</span>
        <span class="ver">v{{ appVersion }}</span>
      </div>
      <div class="about-row">
        <span>数据存储</span>
        <span class="ver">本地 IndexedDB（离线可用）</span>
      </div>
      <div class="about-row">
        <span>题库来源</span>
        <span class="ver">软考真题 · 考生回忆整理</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-row {
  display: flex;
  gap: 12px;
}
.data-item {
  flex: 1;
  text-align: center;
  padding: 10px;
  background: #f7f8fa;
  border-radius: 8px;
}
.data-item .num {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}
.data-item .label {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 2px;
}
.db-size {
  font-size: 12px;
  color: var(--text-sub);
  text-align: right;
  margin-top: 8px;
}
.settings-item {
  padding: 14px 0;
  border-bottom: 1px solid #f2f2f4;
  cursor: pointer;
}
.settings-item:last-child {
  border-bottom: none;
}
.si-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
}
.si-desc {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 2px;
}
.settings-item.danger .si-label {
  color: var(--danger);
}
.about-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 14px;
  border-bottom: 1px solid #f2f2f4;
}
.about-row:last-child {
  border-bottom: none;
}
.ver {
  color: var(--text-sub);
  font-size: 13px;
}
</style>