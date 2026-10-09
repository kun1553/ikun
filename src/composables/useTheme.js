import { ref } from 'vue'

const STORAGE_KEY = 'theme'

function readInitialTheme() {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme) {
    return document.documentElement.dataset.theme
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* localStorage 在隐私模式下可能抛错，忽略即可 */
  }
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

// 模块级单例：整个应用共享同一份主题状态
const theme = ref(readInitialTheme())

function apply(next) {
  theme.value = next
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* 存不下就只在本次会话生效 */
  }
}

export function useTheme() {
  return {
    theme,
    toggleTheme: () => apply(theme.value === 'dark' ? 'light' : 'dark'),
  }
}
