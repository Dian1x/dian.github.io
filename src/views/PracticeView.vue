<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { db } from '../db'
import { useAppStore } from '../store/app'
import { renderMd } from '../utils/md'
import { showToast, showSuccessToast, showConfirmDialog, Icon } from 'vant'

const store = useAppStore()
const params = store.current.params || {}
const { bankId, mode, questionIds } = params

const questions = ref([])
const index = ref(0)
const answers = ref({}) // qid -> { userAnswer, isCorrect, timeSpent }
const analysisOpen = ref(false)
const notePopup = ref(false)
const noteText = ref('')
const currentNote = ref(null)
const stars = ref({})
const startAt = ref(Date.now())
const fillAnswer = ref('')

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const isRecite = mode === 'recite'

onMounted(async () => {
  const qs = await db.questions.bulkGet(questionIds)
  questions.value = qs.filter(Boolean)
  startAt.value = Date.now()
  const notes = await db.notes.where('type').equals('star').toArray()
  notes.forEach((n) => {
    stars.value[n.questionId] = true
  })
  loadNote()
})

function loadNote() {
  const q = current.value
  if (!q) return
  db.notes
    .where('[questionId+type]')
    .equals([q.id, 'note'])
    .first()
    .then((n) => {
      currentNote.value = n || null
      noteText.value = n ? n.content : ''
    })
}

const current = computed(() => questions.value[index.value])
const total = computed(() => questions.value.length)
const currentAnswer = computed(() => (current.value ? answers.value[current.value.id] : null))
const progress = computed(() =>
  total.value ? Math.round((index.value / total.value) * 100) : 0
)

function typeLabel(q) {
  const map = { single: '单选', multi: '多选', judge: '判断', fill: '填空', essay: '简答', material: '材料' }
  return map[q.type] || '单选'
}

function answerText() {
  const q = current.value
  const a = q.answer
  if (Array.isArray(a)) return a.join('、')
  return String(a)
}

function goBack() {
  if (Object.keys(answers.value).length && index.value < questions.value.length - 1) {
    showConfirmDialog({
      title: '退出练习',
      message: '当前进度将保留，确定退出吗？',
      confirmButtonColor: '#ff6a00'
    })
      .then(() => store.pop())
      .catch(() => {})
  } else {
    store.pop()
  }
}

// 选项点击
function selectOption(opt) {
  if (currentAnswer.value) return
  const q = current.value
  if (q.type === 'single' || q.type === 'judge') {
    answers.value[q.id] = { userAnswer: opt }
  } else if (q.type === 'multi') {
    const prev = answers.value[q.id]?.userAnswer || []
    const set = prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    answers.value[q.id] = { userAnswer: set }
  }
  if (isRecite) confirmAnswer()
}

// 计算选项样式
function optionClass(opt) {
  const q = current.value
  const a = currentAnswer.value
  const userAnswer = a?.userAnswer
  const correct = Array.isArray(q.answer) ? q.answer : [q.answer]
  const user = userAnswer == null ? [] : Array.isArray(userAnswer) ? userAnswer : [userAnswer]
  const cls = []
  if (!a) {
    if (user.includes(opt)) cls.push('selected')
  } else {
    if (correct.includes(opt)) cls.push('correct')
    else if (user.includes(opt)) cls.push('wrong')
    cls.push('disabled')
  }
  return cls
}

// 确认答案
function confirmAnswer() {
  const q = current.value
  let userAnswer = answers.value[q.id]?.userAnswer
  if (userAnswer == null) {
    if (q.type === 'fill' || q.type === 'essay') {
      userAnswer = fillAnswer.value.trim()
      if (!userAnswer) {
        showToast('请先作答')
        return
      }
      answers.value[q.id] = { userAnswer }
    } else {
      showToast('请先作答')
      return
    }
  }
  const timeSpent = Date.now() - (startAt.value || Date.now())
  startAt.value = Date.now()
  let isCorrect = false
  if (Array.isArray(q.answer)) {
    isCorrect =
      Array.isArray(userAnswer) &&
      q.answer.length === userAnswer.length &&
      q.answer.every((x) => userAnswer.includes(x))
  } else {
    isCorrect = String(userAnswer).trim() === String(q.answer).trim()
  }
  answers.value[q.id].isCorrect = isCorrect
  answers.value[q.id].timeSpent = timeSpent
  db.records.add({
    questionId: q.id,
    userAnswer,
    isCorrect,
    timeSpent,
    practiceMode: mode,
    createAt: new Date()
  })
  analysisOpen.value = true
}

function nextQuestion() {
  if (index.value < questions.value.length - 1) {
    index.value++
    analysisOpen.value = false
    fillAnswer.value = ''
    loadNote()
  } else {
    finish()
  }
}
function prevQuestion() {
  if (index.value > 0) {
    index.value--
    analysisOpen.value = false
    fillAnswer.value = ''
    loadNote()
  }
}

// 滑动切换
let touchX = 0
function onTouchStart(e) {
  touchX = e.changedTouches[0].clientX
}
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 60) {
    if (dx < 0) nextQuestion()
    else prevQuestion()
  }
}

// 收藏
async function toggleStar() {
  const q = current.value
  if (stars.value[q.id]) {
    await db.notes.where('questionId').equals(q.id).filter((n) => n.type === 'star').delete()
    stars.value[q.id] = false
    showToast('已取消收藏')
  } else {
    await db.notes.add({ questionId: q.id, type: 'star', content: '' })
    stars.value[q.id] = true
    showToast('已收藏')
  }
}

async function openNote() {
  await nextTick()
  notePopup.value = true
}

async function saveNote() {
  const q = current.value
  const content = noteText.value.trim()
  if (!content) {
    if (currentNote.value) {
      await db.notes.delete(currentNote.value.id)
      currentNote.value = null
    }
    notePopup.value = false
    showToast('已清空笔记')
    return
  }
  if (currentNote.value) {
    await db.notes.update(currentNote.value.id, { content })
  } else {
    await db.notes.add({ questionId: q.id, type: 'note', content })
  }
  currentNote.value = null
  notePopup.value = false
  showSuccessToast('笔记已保存')
}

function finish() {
  const list = questions.value.map((q) => q.id)
  const stats = {
    total: list.length,
    answered: Object.keys(answers.value).length,
    correct: Object.values(answers.value).filter((a) => a.isCorrect).length
  }
  store.replace('result', { bankId, stats, questionIds: list })
}
</script>

<template>
  <div v-if="current" class="practice-view" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <van-nav-bar
      :title="`${index + 1} / ${total}`"
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
    >
      <template #right>
        <span class="type-tag">{{ typeLabel(current) }}</span>
      </template>
    </van-nav-bar>

    <div class="progress-track">
      <van-progress :percentage="progress" :show-pivot="false" stroke-width="5" color="#ff6a00" />
    </div>

    <div class="page-scroll question-body">
      <div class="card q-card">
        <div class="q-content md" v-html="renderMd(current.content)"></div>

        <div class="options">
          <template v-if="['single', 'judge', 'multi'].includes(current.type)">
            <div
              v-for="(opt, i) in current.options"
              :key="i"
              class="option-item"
              :class="optionClass(letters[i])"
              @click="selectOption(letters[i])"
            >
              <span class="opt-letter">{{ letters[i] }}</span>
              <span class="opt-text" v-html="renderMd(opt)"></span>
            </div>
          </template>
          <div v-else class="answer-area">
            <div v-if="currentAnswer" class="user-answer">你的答案：{{ currentAnswer.userAnswer }}</div>
            <textarea
              v-else
              v-model="fillAnswer"
              class="fill-area"
              placeholder="在此输入你的答案…"
              rows="4"
            ></textarea>
          </div>
        </div>

        <div v-if="currentAnswer" class="analysis-box md">
          <div class="analysis-title">
            {{ currentAnswer.isCorrect ? '✓ 回答正确' : '✗ 回答错误' }}
            <span style="font-weight: 400; color: var(--text-sub)">（参考答案：{{ answerText() }}）</span>
          </div>
          <div v-html="renderMd(current.analysis)"></div>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <button class="btn-ghost" @click="toggleStar">
        <Icon :name="stars[current.id] ? 'star' : 'star-o'" :color="stars[current.id] ? '#ff9f1c' : '#999aa3'" size="22" />
      </button>
      <button class="btn-ghost" @click="openNote">
        <Icon name="notes-o" color="#999aa3" size="22" />
      </button>
      <button class="btn-ghost" @click="analysisOpen = !analysisOpen">
        <Icon name="info-o" color="#999aa3" size="22" />
      </button>

      <template v-if="!currentAnswer">
        <button v-if="!isRecite" class="btn btn-primary" @click="confirmAnswer">确认答案</button>
        <button v-else class="btn btn-primary" @click="nextQuestion">下一题</button>
      </template>
      <button v-else class="btn btn-primary" @click="nextQuestion">
        {{ index < total - 1 ? '下一题' : '完成' }}
      </button>
    </div>

    <van-popup v-model:show="notePopup" position="bottom" round>
      <div class="note-pop">
        <div class="note-title">我的笔记</div>
        <textarea v-model="noteText" class="note-area" rows="5" placeholder="记录这道题的思路、易错点…"></textarea>
        <button class="btn btn-primary note-save" @click="saveNote">保存笔记</button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.practice-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.type-tag {
  font-size: 12px;
  color: var(--primary);
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.progress-track {
  background: #fff;
  padding: 4px 0 0;
}
.question-body {
  flex: 1;
}
.q-card {
  min-height: calc(100vh - 190px);
}
.answer-area .user-answer {
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 8px;
  padding: 10px 12px;
  font-weight: 600;
  font-size: 14px;
}
.fill-area {
  width: 100%;
  border: 1px solid #ececf0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  background: #fff;
}
.note-pop {
  padding: 16px 16px 20px;
}
.note-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}
.note-area {
  width: 100%;
  border: 1px solid #ececf0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}
.note-save {
  margin-top: 12px;
  width: 100%;
}
</style>
