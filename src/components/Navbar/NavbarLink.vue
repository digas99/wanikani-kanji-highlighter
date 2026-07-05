<template>
	<li class="side-panel-tab" :data-label="icon">
		<RouterLink :to="to" class="navbar_icon" @click="onClick">
			<div>
				<img :id="icon" :src="`/icons/sidebar/${icon}.png`"
					:title="linkTitle" style="width: 20px;">
				<span
					v-if="info"
					class="side-panel-info-alert"
					:style="infoStyle"
				>{{ info }}</span>
			</div>
			<p style="pointer-events: none;">{{ linkLabel }}</p>
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
			required: true,
		},
		icon: {
			type: String,
			required: true,
		},
		info: {
			type: String,
			required: false,
		},
		infoStyle: {
			type: Object,
			default: () => ({
				backgroundColor: '#f100a1',
				color: 'white',
			}),
		},
		title: {
			type: String,
			required: false,
		},
		label: {
			type: String,
			required: false,
		},
	},

	computed: {
		linkTitle() {
			return this.title || this.icon.charAt(0).toUpperCase() + this.icon.slice(1);
		},
		linkLabel() {
			return this.label || this.linkTitle;
		},
	},

	emits: ['click'],

	methods: {
		onClick(event) {
			if (this.to === '#') {
				event.preventDefault();
			}
			this.$emit('click', event);
		},
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

.side-panel-tab>a p {
	display: none;
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
	right: 0px;
	font-size: 10px;
	font-weight: bold;
	border-radius: 4px;
	transition: 0.3s;
}

.side-panel-focus>ul li>a {
	display: inline-flex;
	align-items: center;
	width: 100%;
	padding-left: 15px !important;
}

.side-panel-focus>ul li>a:hover {
	opacity: unset !important;
}

.side-panel-focus>ul li>a>p {
	color: white;
	padding-left: 12px;
	width: 100%;
	display: block;
}

.side-panel-focus .side-panel-info-alert {
	right: unset;
	left: 35px;
}

.side-panel-focus>div>a>img {
	width: 45px;
	border-radius: 30px;
}
</style>