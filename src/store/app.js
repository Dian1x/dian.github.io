// 全局导航与应用状态（轻量路由，模拟栈式页面跳转）
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    // 路由栈：{ name, params }
    stack: [{ name: 'home' }],
    activeTab: 0,
    pendingImport: null // 等待导入的题库数据 { name, description, questions }
  }),
  getters: {
    current: (s) => s.stack[s.stack.length - 1]
  },
  actions: {
    push(name, params = {}) {
      this.stack.push({ name, params })
    },
    replace(name, params = {}) {
      this.stack.pop()
      this.stack.push({ name, params })
    },
    pop() {
      if (this.stack.length > 1) this.stack.pop()
    },
    backToHome() {
      this.stack = [{ name: 'home' }]
    },
    setTab(i) {
      this.activeTab = i
      this.backToHome()
    }
  }
})
