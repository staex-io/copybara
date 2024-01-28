import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AzeroIdView from '../views/AzeroIdView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/azero-id',
            name: 'azero-id',
            component: AzeroIdView,
        },
    ],
})

export default router
