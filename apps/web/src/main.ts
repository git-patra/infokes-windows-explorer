import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/ExplorerPage.vue') },
  ],
})

const app = createApp(App)
app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)
app.mount('#app')
