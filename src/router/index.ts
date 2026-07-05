import { createRouter, createWebHashHistory } from 'vue-router'
import { useWKStore } from '@/stores';

import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Settings from '@/views/Settings.vue';
import Search from '@/views/Search.vue';
import Profile from '@/views/Profile.vue';
import Levels from '@/views/Levels.vue';
import About from '@/views/About.vue';
import Features from '@/views/Features.vue';
import Lessons from '@/views/Lessons.vue';
import Reviews from '@/views/Reviews.vue';
import Subjects from '@/views/Subjects.vue';
import SchoolSubjects from '@/views/SchoolSubjects.vue';
import Subject from '@/views/Subject.vue';
import { recordSearchHistorySubject } from '@/utils/scripts/searchHistory';

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
			path: '/levels',
			name: 'Levels',
			component: Levels
		},
		{
			path: '/about',
			name: 'About',
			component: About
		},
		{
			path: '/features',
			name: 'Features',
			component: Features
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
		},
		{
			path: '/subjects',
			name: 'Subjects',
			component: Subjects
		},
		{
			path: '/subjects/school',
			name: 'SchoolSubjects',
			component: SchoolSubjects
		},
		{
			path: '/subject/:id',
			name: 'Subject',
			component: Subject
		}
	]
});

export default router;

// middleware
router.afterEach(async (to, from) => {
	const title = !to.name || to.name === 'Home' ? 'WaniKani Kanji Highlighter' : to.name ? String(to.name) : '';
	setPageTitle(title);

	if (to.name === 'Subject' && from.name === 'Search' && to.params.id) {
		const id = parseInt(String(to.params.id), 10);
		if (!Number.isNaN(id)) {
			void recordSearchHistorySubject(id);
		}
	}

	// reset list scroll save
	if (!['Subjects', 'SchoolSubjects', 'Subject'].includes(title)) {
		const wk = useWKStore();
		wk.subjectsListScroll = 0;
	}
});

const setPageTitle = (title: string) => {
	document.title = title;
	if (document.querySelector('#secPageTitle'))
		document.querySelector('#secPageTitle').innerText = title;
	
	// wait until the dom is rendered
	setTimeout(() => {	
		document.title = title;
		if (document.querySelector('#secPageTitle'))
			document.querySelector('#secPageTitle').innerText = title;
	}, 100);
};