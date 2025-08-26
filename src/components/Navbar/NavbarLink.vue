<template>
	<li class="side-panel-tab">
		<RouterLink :to="to" class="navbar_icon">
			<img :id="icon" :src="`/icons/sidebar/${icon}.png`" :title="icon.charAt(0).toUpperCase() + icon.slice(1)"
				style="width: 20px;">
			<span v-if="info" class="side-panel-info-alert" style="background-color: #f100a1; color: white;">{{ info
			}}</span>
		</RouterLink>
	</li>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'NavbarLink',
	props: {
		to: {
			type: [String, Object],
			required: true
		},
		icon: {
			type: String,
			required: true
		},
		info: {
			type: String,
			required: false
		}
	},
};
</script>

<style scoped>
.side-panel-tab {
	cursor: pointer;
	position: relative;
}

.side-panel-tab:hover {
	background-color: var(--wanikani);
}

.side-panel-tab a {
	opacity: unset !important;
	height: 100%;
	display: flex;
	align-items: center;
	width: 100%;
	justify-content: center;
}

.side-panel-tab>a img {
	filter: invert(1);
}

.side-panel>div>a {
	display: inline-block;
}

.side-panel>div>a>img {
	width: 26px;
	border-radius: 15px;
	pointer-events: none;
	border: 2px solid white;
	transition: 0.3s;
}

.side-panel-info-alert {
	padding: 3px;
	position: absolute;
	top: -3px;
	left: 26px;
	font-size: 10px;
	font-weight: bold;
	border-radius: 4px;
}
</style>