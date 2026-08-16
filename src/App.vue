<script setup>
import { computed, h } from 'vue'
import { useAppStore } from './store/app'
import { Icon } from 'vant'

import HomeView from './views/HomeView.vue'
import BankView from './views/BankView.vue'
import PracticeView from './views/PracticeView.vue'
import ResultView from './views/ResultView.vue'
import ReviewView from './views/ReviewView.vue'
import StatsView from './views/StatsView.vue'
import SettingsView from './views/SettingsView.vue'
import QuestionPreview from './views/QuestionPreview.vue'

const store = useAppStore()
const current = computed(() => store.current)

// 页面组件映射
const views = {
  home: HomeView,
  bank: BankView,
  practice: PracticeView,
  result: ResultView,
  review: ReviewView,
  stats: StatsView,
  settings: SettingsView,
  preview: QuestionPreview
}

const tabs = [
  { name: 'home', label: '题库', icon: 'apps-o' },
  { name: 'review', label: '复习', icon: 'records-o' },
  { name: 'stats', label: '统计', icon: 'chart-trending-o' },
  { name: 'settings', label: '我的', icon: 'user-o' }
]

const isTabPage = computed(() =>
  tabs.some((t) => t.name === current.value.name)
)

function onTabChange(index) {
  store.setTab(index)
}

const Comp = computed(() => views[current.value.name] || HomeView)
</script>

<template>
  <div class="app-shell">
    <transition name="fade" mode="out-in">
      <component :is="Comp" :key="store.stack.length + '-' + current.name" />
    </transition>

    <van-tabbar
      v-if="isTabPage"
      :model-value="store.activeTab"
      active-color="#ff6a00"
      inactive-color="#999aa3"
      safe-area-inset-bottom
      @change="onTabChange"
    >
      <van-tabbar-item v-for="t in tabs" :key="t.name">
        <template #icon="props">
          <Icon :name="t.icon" :class="{ 'tab-active': props.active }" />
        </template>
        {{ t.label }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.tab-active {
  color: #ff6a00;
}
</style>
