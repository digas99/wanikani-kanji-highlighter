import { createRouter, createWebHashHistory } from 'vue-router'

import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Settings from '@/views/Settings.vue';
import Search from '@/views/Search.vue';
import Profile from '@/views/Profile.vue';
import About from '@/views/About.vue';
import Lessons from '@/views/Lessons.vue';
import Reviews from '@/views/Reviews.vue';

const router = createRouter({
	history: createWebHashHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'Home',
			component: Home
		},
		{
			path: '/login',
			name: 'Login',
			component: Login
		},
		{
			path: '/settings',
			name: 'Settings',
			component: Settings
		},
		{
			path: '/search',
			name: 'Search',
			component: Search
		},
		{
			path: '/profile',
			name: 'Profile',
			component: Profile
		},
		{
			path: '/about',
			name: 'About',
			component: About
		},
		{
			path: '/lessons',
			name: 'Lessons',
			component: Lessons
		},
		{
			path: '/reviews',
			name: 'Reviews',
			component: Reviews
		}
	]
});

export default router;