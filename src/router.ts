import { createRouter, createWebHashHistory } from 'vue-router'
import { localeChosen } from './i18n'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./pages/HomePage.vue') },
    { path: '/editor/:id', name: 'editor', component: () => import('./pages/EditorPage.vue'), props: true },
    { path: '/play/:id', name: 'play', component: () => import('./pages/PlayPage.vue'), props: true },
    { path: '/host/:id', name: 'host', component: () => import('./pages/HostPage.vue'), props: true },
    { path: '/welcome', name: 'welcome', component: () => import('./pages/WelcomePage.vue') },
    { path: '/settings', name: 'settings', component: () => import('./pages/SettingsPage.vue') },
    { path: '/print/:id', name: 'print', component: () => import('./pages/PrintPage.vue'), props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// the first visit to the library asks for a language; deep links (a host window, an opened
// file) go straight through and the library asks later
router.beforeEach((to) => {
  if (to.name === 'home' && !localeChosen()) return { name: 'welcome' }
})
