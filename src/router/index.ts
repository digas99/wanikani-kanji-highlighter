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
import WhatsNew from '@/views/WhatsNew.vue';
import Lessons from '@/views/Lessons.vue';
import Reviews from '@/views/Reviews.vue';
import Subjects from '@/views/Subjects.vue';
import SchoolSubjects from '@/views/SchoolSubjects.vue';
import SubjectGroups from '@/views/SubjectGroups.vue';
import Subject from '@/views/Subject.vue';
import Accolades from '@/views/Accolades.vue';
import Practice from '@/views/Practice.vue';
import ReviewedSubjects from '@/views/ReviewedSubjects.vue';
import DaySubjects from '@/views/DaySubjects.vue';
import TroubleSubjects from '@/views/TroubleSubjects.vue';
import SchoolLists from '@/views/SchoolLists.vue';
import Friends from '@/views/Friends.vue';
import Notifications from '@/views/Notifications.vue';
import PageHistory from '@/views/PageHistory.vue';
import PageHistoryEntry from '@/views/PageHistoryEntry.vue';
import SentenceLibrary from '@/views/SentenceLibrary.vue';
import { recordSearchHistorySubject } from '@/utils/scripts/searchHistory';

const router = createRouter({
	history: createWebHashHistory(import.meta.env.BASE_URL),
	// another page starts at the top; back / forward return to where it was;
	// staying on the same page (e.g. Profile's level, the next practice card) keeps the scroll
	scrollBehavior(to, from, savedPosition) {
		// pages fill in their content just after opening: restore once there's room for it
		if (savedPosition) return new Promise(resolve => setTimeout(() => resolve(savedPosition), 300));
		if (to.name === from.name) return false;
		return { top: 0 };
	},
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
			path: '/whats-new',
			name: 'WhatsNew',
			meta: { title: "What's new" },
			component: WhatsNew
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
			// every row of a progress card, a section each (?list=levels | school&school=…&kind=…)
			path: '/subjects/groups',
			name: 'SubjectGroups',
			component: SubjectGroups,
			meta: { title: 'Subjects' },
		},
		{
			path: '/subject/:id',
			name: 'Subject',
			component: Subject
		},
		{
			path: '/accolades',
			name: 'Accolades',
			component: Accolades
		},
		{
			path: '/practice',
			name: 'Practice',
			component: Practice
		},
		{
			// the activity calendar's day: started / passed / burned (?date=YYYY-MM-DD&jump=…)
			path: '/day',
			name: 'Day',
			component: DaySubjects,
			meta: { title: 'Activity' },
		},
		{
			// subjects reviewed on a day (?date=YYYY-MM-DD, default today), by result
			path: '/reviewed',
			name: 'Reviewed',
			component: ReviewedSubjects
		},
		{
			// JLPT / Jōyō: progress per level, kanji and words (?school=jlpt|joyo)
			path: '/school',
			name: 'School',
			component: SchoolLists,
			meta: { title: 'JLPT & Jōyō' },
		},
		{
			// the subjects you keep getting wrong (utils/scripts/troubleSubjects.ts)
			path: '/trouble',
			name: 'Trouble',
			component: TroubleSubjects
		},
		{
			// other users' levels, from their public WaniKani profiles (+ yours)
			path: '/friends',
			name: 'Friends',
			component: Friends
		},
		{
			// the history behind the toasts (the sidebar's bell)
			path: '/notifications',
			name: 'Notifications',
			component: Notifications
		},
		{
			// pages read, with their reading level (Settings → Page reading level → Keep a history)
			path: '/pages',
			name: 'Pages',
			component: PageHistory
		},
		{
			path: '/pages/page',
			name: 'Page',
			component: PageHistoryEntry
		},
		{
			// the sentences kept from the pages read (Settings → Reading → Keep example sentences)
			path: '/pages/sentences',
			name: 'Sentences',
			component: SentenceLibrary
		}
	]
});

export default router;

// middleware
router.afterEach(async (to, from) => {
	const routeName = to.name ? String(to.name) : '';
	// a page's own title (meta.title), else its name
	const title = !to.name || to.name === 'Home' ? 'WaniKani Kanji Highlighter' : String(to.meta?.title ?? routeName);
	setPageTitle(title);

	if (to.name === 'Subject' && from.name === 'Search' && to.params.id) {
		const id = parseInt(String(to.params.id), 10);
		if (!Number.isNaN(id)) {
			void recordSearchHistorySubject(id);
		}
	}

	// reset list scroll save
	if (!['Subjects', 'SchoolSubjects', 'Subject', 'Practice', 'Reviewed'].includes(routeName)) {
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