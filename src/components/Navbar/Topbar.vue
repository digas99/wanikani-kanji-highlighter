<template>
	<div class="topNav">
		<a v-if="showGoBackButton" href="#" title="Go back" id="goBackButton">
			<div>
				<i class="left"></i>
				<div id="secPageTitle"></div>
			</div>
		</a>
		<div id="secPageButtons"></div>

		<div class="topNav-lessons">
			<RouterLink title="Lessons" :to="{ name: 'Lessons' }">
				<div class="lessons-icon">
					<div></div>
				</div>
				<div class="lessons-count">0</div>
			</RouterLink>
			<RouterLink title="Reviews" :to="{ name: 'Reviews' }">
				<div class="reviews-icon">
					<div></div>
				</div>
				<div class="lessons-count">0</div>
			</RouterLink>
		</div>
	</div>

</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: "Topbar",

	data() {
		return {
			showGoBackButton: false
		};
	},

	watch: {
		$route(to, from) {
			this.showGoBackButton = to.name !== 'Home';
		}
	}

};
</script>

<style scoped>
.topNav {
	position: fixed;
	background-color: var(--default-color);
	border-top: 5px solid var(--wanikani);
	top: 0;
	width: 100%;
	display: flex;
	align-items: center;
	color: white;
	z-index: 11;
	height: 45px;
}

.topNav * {
	-webkit-user-select: none;
	/* Safari */
	-ms-user-select: none;
	/* IE 10 and IE 11 */
	user-select: none;
	/* Standard syntax */
}

.topNav>a {
	cursor: pointer;
	height: 100%;
	align-items: center;
	display: flex;
	padding: 0 10px;
	opacity: unset;
	transition: unset;
}

.topNav>a:hover {
	background-color: var(--wanikani);
}

.topNav>a * {
	pointer-events: none;
}

.topNav>a>div {
	display: flex;
	align-items: center;
}

.topNav>a>div>i {
	border-color: white;
	padding: 4px;
}

.topNav>a>div>div {
	margin-left: 10px;
	color: white;
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
	right: 60px;
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

.topNav-lessons .lessons-count {
	color: white;
	padding: 0px 10px;
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
	font-weight: bold;
	border: 2px solid white;
	height: 21px;
	display: flex;
	align-items: center;
}

.topNav-lessons>a:hover .lessons-count {
	background-color: white;
	color: var(--default-color);
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