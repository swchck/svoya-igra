import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./pages/HomePage.vue') },
    { path: '/editor/:id', name: 'editor', component: () => import('./pages/EditorPage.vue'), props: true },
    { path: '/play/:id', name: 'play', component: () => import('./pages/PlayPage.vue'), props: true },
    { path: '/host/:id', name: 'host', component: () => import('./pages/HostPage.vue'), props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
