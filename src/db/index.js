// IndexedDB 数据层 —— Dexie 封装
// 库：QuizDB v1
// 表：banks 题库元数据 / questions 题目 / records 做题记录 / notes 笔记收藏
import Dexie from 'dexie'

export const db = new Dexie('QuizDB')

db.version(1).stores({
  banks: 'id, name, createTime',
  questions: 'id, bankId, type, difficulty, createdAt',
  records: '++id, questionId, createAt, isCorrect, practiceMode',
  notes: '++id, questionId, type, [questionId+type]'
})

// ---------- 工具函数 ----------
export const uid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

// 批量导入题库（事务，任一失败整体回滚）
export async function importBank({ name, description, questions, overwrite }) {
  return db.transaction('rw', db.banks, db.questions, async () => {
    const bankId = uid()
    const now = new Date()
    const items = questions.map((q, i) => ({
      id: uid(),
      bankId,
      type: q.type || 'single',
      content: q.content,
      options: q.options || undefined,
      answer: q.answer,
      analysis: q.analysis || '',
      difficulty: q.difficulty || 3,
      tags: q.tags || [],
      score: q.score,
      createdAt: now,
      seq: i
    }))
    if (overwrite) {
      // 覆盖模式：删除同名题库
      const same = await db.banks.where('name').equals(name).toArray()
      for (const b of same) {
        await db.questions.where('bankId').equals(b.id).delete()
        await db.banks.delete(b.id)
      }
    }
    await db.banks.put({ id: bankId, name, description: description || '', totalCount: items.length, createTime: now })
    await db.questions.bulkPut(items)
    return { bankId, count: items.length }
  })
}

// 删除题库（级联删除题目、记录、笔记）
export async function deleteBank(bankId) {
  return db.transaction('rw', db.questions, db.records, db.notes, db.banks, async () => {
    const qs = await db.questions.where('bankId').equals(bankId).toArray()
    const qIds = qs.map((q) => q.id)
    if (qIds.length) {
      await db.records.where('questionId').anyOf(qIds).delete()
      await db.notes.where('questionId').anyOf(qIds).delete()
    }
    await db.questions.where('bankId').equals(bankId).delete()
    await db.banks.delete(bankId)
  })
}

// 备份：导出完整数据
export async function exportAll() {
  const [banks, questions, records, notes] = await Promise.all([
    db.banks.toArray(),
    db.questions.toArray(),
    db.records.toArray(),
    db.notes.toArray()
  ])
  return { app: 'QuizPWA', version: 1, exportedAt: new Date().toISOString(), banks, questions, records, notes }
}

// 恢复：导入备份数据（支持合并/覆盖）
export async function restoreAll(data, mode = 'merge') {
  if (!data || data.app !== 'QuizPWA') throw new Error('不是有效的 QuizPWA 备份文件')
  return db.transaction('rw', db.banks, db.questions, db.records, db.notes, async () => {
    if (mode === 'overwrite') {
      await Promise.all([db.banks.clear(), db.questions.clear(), db.records.clear(), db.notes.clear()])
    }
    if (data.banks?.length) await db.banks.bulkPut(data.banks)
    if (data.questions?.length) await db.questions.bulkPut(data.questions)
    if (data.records?.length) await db.records.bulkPut(data.records)
    if (data.notes?.length) await db.notes.bulkPut(data.notes)
  })
}

export async function getBankStats(bankId) {
  const questions = await db.questions.where('bankId').equals(bankId).toArray()
  const qIds = questions.map((q) => q.id)
  const records = qIds.length
    ? await db.records.where('questionId').anyOf(qIds).toArray()
    : []
  const done = new Set()
  let correct = 0
  records.forEach((r) => {
    if (!done.has(r.questionId)) {
      done.add(r.questionId)
      if (r.isCorrect) correct++
    }
  })
  let lastTime = null
  if (records.length) {
    lastTime = records.reduce((m, r) => (r.createAt > m ? r.createAt : m), records[0].createAt)
  }
  return {
    total: questions.length,
    done: done.size,
    correct,
    wrong: done.size - correct,
    rate: done.size ? Math.round((correct / done.size) * 100) : 0,
    lastTime
  }
}
