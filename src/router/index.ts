import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from '../modules/home/HomePage.vue'

const routes = [
  { path: '/', component: HomeView },
]

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
})
