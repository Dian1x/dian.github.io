<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '../db'
import * as echarts from 'echarts'

const stats = ref({ total: 0, done: 0, correct: 0, wrong: 0, rate: 0 })
const tagStats = ref([])
const chartRef = ref(null)
let chart = null

onMounted(async () => {
  const records = await db.records.toArray()
  if (records.length) {
    const done = new Set()
    let correct = 0
    records.forEach((r) => {
      if (!done.has(r.questionId)) {
        done.add(r.questionId)
        if (r.isCorrect) correct++
      }
    })
    stats.value = {
      total: (await db.questions.count()),
      done: done.size,
      correct,
      wrong: done.size - correct,
      rate: done.size ? Math.round((correct / done.size) * 100) : 0
    }
    // 薄弱考点：按 tags 聚合正确率
    tagStats.value = await computeTagStats(records)
  }

  // 近7天刷题量折线图
  initChart(records)
})

// 按知识点标签聚合正确率（只统计已做题目）
async function computeTagStats(records) {
  const doneMap = new Map() // questionId -> isCorrect（取首次作答结果）
  records.forEach((r) => {
    if (!doneMap.has(r.questionId)) doneMap.set(r.questionId, !!r.isCorrect)
  })
  const qIds = [...doneMap.keys()]
  if (!qIds.length) return []
  const questions = await db.questions.bulkGet(qIds)
  const agg = {}
  questions.filter(Boolean).forEach((q) => {
    const correct = doneMap.get(q.id)
    ;(q.tags || []).forEach((t) => {
      if (!agg[t]) agg[t] = { total: 0, correct: 0 }
      agg[t].total++
      if (correct) agg[t].correct++
    })
  })
  return Object.entries(agg)
    .map(([name, v]) => ({
      name,
      total: v.total,
      correct: v.correct,
      rate: Math.round((v.correct / v.total) * 100)
    }))
    .filter((t) => t.total >= 1)
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
}

onUnmounted(() => {
  chart?.dispose()
})

function initChart(records) {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  const days = []
  const counts = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    days.push(dateStr)

    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const end = new Date(start.getTime() + 86400000)
    const cnt = records.filter((r) => {
      const t = new Date(r.createAt)
      return t >= start && t < end
    }).length
    counts.push(cnt)
  }

  chart.setOption({
    grid: { left: 40, right: 16, top: 20, bottom: 24 },
    xAxis: {
      type: 'category',
      data: days,
      axisLabel: { fontSize: 11, color: '#999' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 11, color: '#999' }
    },
    series: [
      {
        data: counts,
        type: 'line',
        smooth: true,
        lineStyle: { color: '#ff6a00', width: 2 },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: 'rgba(255,106,0,0.25)' },
            { offset: 1, color: 'rgba(255,106,0,0.02)' }
          ]}
        },
        itemStyle: { color: '#ff6a00' },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  })
}

// 薄弱考点标签分发（预留：按 tags 聚合正确率）
</script>

<template>
  <div class="stats-view page-scroll">
    <div class="hero-banner" style="background: linear-gradient(135deg, #5b6abf, #7c8de0)">
      <h2>学习统计</h2>
      <p>掌握数据，高效备考</p>
    </div>

    <div class="stat-grid">
      <div class="stat-cell">
        <div class="num primary">{{ stats.done }}</div>
        <div class="label">已做题</div>
      </div>
      <div class="stat-cell">
        <div class="num success">{{ stats.correct }}</div>
        <div class="label">正确</div>
      </div>
      <div class="stat-cell">
        <div class="num danger">{{ stats.wrong }}</div>
        <div class="label">错误</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">刷题趋势（近 7 天）</div>
      <div ref="chartRef" style="height: 200px"></div>
    </div>

    <div class="card">
      <div class="card-title">薄弱考点（正确率偏低）</div>
      <div v-if="!tagStats.length" class="empty-tip">刷题后自动统计各知识点正确率，帮助定位薄弱环节</div>
      <div v-else class="tag-row" v-for="t in tagStats" :key="t.name">
        <span class="tag-name">{{ t.name }}</span>
        <div class="tag-bar"><i :style="{ width: t.rate + '%', background: t.rate >= 60 ? '#34b274' : '#f53f3f' }"></i></div>
        <span class="tag-rate" :class="t.rate >= 60 ? 'ok' : 'warn'">{{ t.rate }}%</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">学习概况</div>
      <div class="summary-list">
        <div class="summary-item">
          <span>总题数</span>
          <strong>{{ stats.total }}</strong>
        </div>
        <div class="summary-item">
          <span>总体正确率</span>
          <strong>{{ stats.rate }}%</strong>
        </div>
        <div class="summary-item">
          <span>完成度</span>
          <strong>{{ stats.total ? Math.round((stats.done / stats.total) * 100) : 0 }}%</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-list {
  padding: 0;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f2f2f4;
  font-size: 14px;
}
.summary-item:last-child {
  border-bottom: none;
}
.summary-item strong {
  color: var(--text);
}
.empty-tip {
  font-size: 13px;
  color: var(--text-sub);
  text-align: center;
  padding: 12px 0;
}
.tag-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
}
.tag-name {
  width: 88px;
  font-size: 13px;
  color: var(--text);
  flex-shrink: 0;
}
.tag-bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: #f0f0f3;
  overflow: hidden;
}
.tag-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.tag-rate {
  width: 42px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
}
.tag-rate.ok {
  color: #34b274;
}
.tag-rate.warn {
  color: #f53f3f;
}
</style>