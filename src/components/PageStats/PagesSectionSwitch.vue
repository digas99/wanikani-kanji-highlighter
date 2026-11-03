<template>
	<!-- Pages read / the sentences kept from them: the same history, two ways to look at it -->
	<nav class="pages-switch" aria-label="Pages read or sentences">
		<RouterLink :to="{ name: 'Pages' }" class="pages-switch-tab" :class="{ active: active === 'pages' }">Pages</RouterLink>
		<RouterLink :to="{ name: 'Sentences' }" class="pages-switch-tab" :class="{ active: active === 'sentences' }">Sentences</RouterLink>
	</nav>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'PagesSectionSwitch',
	components: { RouterLink },
	props: {
		/** 'pages' or 'sentences' */
		active: { type: String, required: true },
	},
};
</script>

<style scoped>
.pages-switch {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 2px;
	margin: 10px 4px 2px;
	padding: 3px;
	border-radius: 10px;
	background: rgba(255, 255, 255, 0.08);
}

.pages-switch-tab {
	padding: 6px 10px;
	border-radius: 8px;
	color: #c4c6da;
	font-size: 12.5px;
	font-weight: 800;
	text-align: center;
	text-decoration: none;
	transition: background-color 0.15s, color 0.15s;
}

.pages-switch-tab:hover {
	opacity: 1;
	color: #fff;
}

.pages-switch-tab.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}
</style>
