import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// 按需引入 Vant 组件与样式
import {
  Tabbar,
  TabbarItem,
  NavBar,
  Progress,
  ActionSheet,
  Field,
  Button,
  Dialog,
  showToast,
  showSuccessToast,
  showConfirmDialog,
  Switch,
  List,
  Empty,
  Cell,
  CellGroup,
  Popup,
  Tag,
  Stepper
} from 'vant'
import 'vant/lib/index.css'

const app = createApp(App)
app.use(createPinia())
app.use(Tabbar)
app.use(TabbarItem)
app.use(NavBar)
app.use(Progress)
app.use(ActionSheet)
app.use(Field)
app.use(Button)
app.use(Dialog)
app.use(Switch)
app.use(List)
app.use(Empty)
app.use(Cell)
app.use(CellGroup)
app.use(Popup)
app.use(Tag)
app.use(Stepper)

app.config.globalProperties.$toast = showToast
app.config.globalProperties.$success = showSuccessToast
app.config.globalProperties.$confirm = showConfirmDialog

app.mount('#app')
