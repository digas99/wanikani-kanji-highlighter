<template>
	<div class="topNav">
		<!-- back, and the page's title (filled in by the router): one soft pill on hover -->
		<a title="Go back" id="goBackButton" class="topNav-back" @click="goBack"
			:style="{ pointerEvents: showGoBackButton ? 'auto' : 'none' }">
			<svg v-if="showGoBackButton" class="topNav-back-arrow" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M15 5l-7 7 7 7" />
			</svg>
			<span id="secPageTitle"></span>
		</a>
		<div id="secPageButtons"></div>

		<div v-if="showLessonsReviews" class="topNav-lessons">
			<RouterLink title="Lessons" :to="{ name: 'Lessons' }">
				<div class="lessons-icon">
					<div></div>
				</div>
				<div class="lessons-count">{{ wk.lessonsCount }}</div>
			</RouterLink>
			<RouterLink title="Reviews" :to="{ name: 'Reviews' }">
				<div class="reviews-icon">
					<div></div>
				</div>
				<div class="reviews-count">{{ wk.reviewsCount }}</div>
			</RouterLink>
		</div>
	</div>

</template>

<script>
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';

export default {
	name: 'Topbar',

	data() {
		return {
			showGoBackButton: false,
			showLessonsReviews: true,
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
	},

	watch: {
		$route(to) {
			this.showGoBackButton = to.name !== 'Home';
			this.showLessonsReviews = to.name !== 'Home';
		},
	},

	mounted() {
		this.showGoBackButton = this.$route.name !== 'Home';
		this.showLessonsReviews = this.$route.name !== 'Home';
		this.wk.refreshDashboard(false);
	},

	methods: {
		goBack() {
			this.$router.go(-1);
		},
	},

};
</script>

<style scoped>
.topNav {
	position: fixed;
	background-color: var(--default-color);
	border-top: 5px solid var(--wanikani);
	top: 0;
	left: var(--frame-left, 0px);
	width: var(--content-width);
	max-width: var(--content-width);
	display: flex;
	align-items: center;
	color: white;
	z-index: 11;
	height: var(--topbar-height);
}

.topNav * {
	-webkit-user-select: none;
	/* Safari */
	-ms-user-select: none;
	/* IE 10 and IE 11 */
	user-select: none;
	/* Standard syntax */
}

/* back + title: a pill with a soft highlight on hover (not the bar's whole height in pink) */
.topNav-back {
	display: flex;
	align-items: center;
	gap: 6px;
	height: 32px;
	margin-left: 6px;
	padding: 0 10px 0 6px;
	border-radius: 9px;
	color: white;
	cursor: pointer;
	opacity: unset;
	transition: background-color 0.15s;
}

.topNav-back:hover {
	background-color: rgba(255, 255, 255, 0.1);
}

.topNav-back:active {
	background-color: rgba(255, 255, 255, 0.16);
}

.topNav-back * {
	pointer-events: none;
}

.topNav-back-arrow {
	flex-shrink: 0;
	width: 18px;
	height: 18px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2.6;
	stroke-linecap: round;
	stroke-linejoin: round;
}

#secPageTitle {
	font-size: 14px;
	font-weight: 700;
	line-height: 1;
	white-space: nowrap;
}

.topNav .star {
	position: absolute;
	right: 70px;
	filter: invert(1);
}

.topNav .star>img {
	width: 20px;
}

.topNav-lessons {
	position: absolute;
	right: 10px;
	top: 0;
	display: flex;
	column-gap: 15px;
	height: 100%;
	align-items: center;
}

.topNav-lessons>a {
	display: flex;
	align-items: center;
	color: white;
	opacity: 1;
}

.topNav-lessons .lessons-icon,
.topNav-lessons .reviews-icon {
	width: 21px;
	height: 21px;
	overflow: hidden;
	border-top-left-radius: 50%;
	border-bottom-left-radius: 50%;
}

.topNav-lessons .lessons-icon {
	background-color: var(--wanikani);
	border: 2px solid var(--wanikani);
}

.topNav-lessons .reviews-icon {
	background-color: var(--wanikani-sec);
	border: 2px solid var(--wanikani-sec);
}

.topNav-lessons .lessons-icon>div,
.topNav-lessons .reviews-icon>div {
	width: 30px;
	height: 30px;
	background-size: cover;
	background-position: center;
	margin: auto;
	text-align: center;
	margin-left: -6px;
}

.topNav-lessons .lessons-icon>div {
	background-image: url(/images/bg_lessons-1-9c106fff33b5cbfbc1a01f82f9966bec87cc935ab91fc0275dc42dcbeb2e82ba.png);
}

.topNav-lessons .reviews-icon>div {
	background-image: url(/images/bg_reviews-500-eaacc89f5f04073e99bb83a655f9e084d7cf0c04b28461fc2ec2f2de3bd69a8c.png);
}

.topNav-lessons .lessons-count,
.topNav-lessons .reviews-count {
	color: white;
	padding: 0px 10px;
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
	font-weight: bold;
	border: 2px solid white;
	height: 21px;
	display: flex;
	align-items: center;
	min-width: 28px;
	justify-content: center;
}

.topNav-lessons>a:hover .lessons-count,
.topNav-lessons>a:hover .reviews-count {
	background-color: var(--fill-color);
	color: var(--heading-color, #2a2d48);
}

#goBack {
	margin: 2px;
	cursor: pointer;
}

#goBack i {
	border-color: white;
	padding: 4px;
}

#goBack * {
	pointer-events: none;
}
</style>
