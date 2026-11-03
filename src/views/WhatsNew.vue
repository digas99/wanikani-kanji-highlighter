<template>
	<div class="container whats-new-page">
		<header class="whats-new-hero">
			<img :src="logo" alt="" class="whats-new-logo">
			<div>
				<span class="whats-new-badge">Version {{ version }}</span>
				<h1>What's new</h1>
				<p>Rebuilt from the ground up. The main changes since v1.5:</p>
			</div>
		</header>

		<WhatsNewList compact>
			<template #fix-action>
				<RouterLink class="whats-new-fix-link" :to="{ name: 'Settings', query: { tab: 'data', section: 'storage' } }">Settings → Data ›</RouterLink>
			</template>
		</WhatsNewList>

		<RouterLink class="whats-new-more" :to="{ name: 'Features' }">
			<span><b>Every feature, with tips</b><small>What it can do</small></span>
			<span aria-hidden="true">›</span>
		</RouterLink>
	</div>
</template>

<script>
import logo from '@/assets/logo.png';
import WhatsNewList from '@/components/WhatsNewList.vue';
import { WHATS_NEW_VERSION } from '@/utils/scripts/whatsNew';

export default {
	name: 'WhatsNew',

	components: { WhatsNewList },

	data() {
		return { logo, version: WHATS_NEW_VERSION };
	},
};
</script>

<style scoped>
.whats-new-page {
	padding: 12px 10px 24px;
	color: var(--font-color);
}

/* WaniKani's pink to purple */
.whats-new-hero {
	position: relative;
	display: flex;
	align-items: center;
	gap: 14px;
	margin-bottom: 18px;
	padding: 18px 16px;
	border-radius: 14px;
	background: linear-gradient(135deg, #f100a1, #a100f1 70%, #6f3ff5);
	color: #fff;
	overflow: hidden;
	box-shadow: 0 6px 18px rgba(161, 0, 241, 0.25);
}

/* a soft glow in the corner */
.whats-new-hero::after {
	content: '';
	position: absolute;
	right: -40px;
	top: -60px;
	width: 180px;
	height: 180px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.12);
}

.whats-new-logo {
	position: relative;
	z-index: 1;
	width: 58px;
	height: 58px;
	flex-shrink: 0;
	padding: 6px;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.95);
	object-fit: contain;
}

.whats-new-hero > div {
	position: relative;
	z-index: 1;
}

.whats-new-badge {
	display: inline-block;
	margin-bottom: 4px;
	padding: 2px 9px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.22);
	font-size: 10.5px;
	font-weight: 800;
	letter-spacing: 0.05em;
	text-transform: uppercase;
}

.whats-new-hero h1 {
	margin: 0 0 2px;
	font-size: 22px;
	line-height: 1.2;
}

.whats-new-hero p {
	margin: 0;
	font-size: 12.5px;
	opacity: 0.9;
}

.whats-new-fix-link {
	display: inline-block;
	margin-top: 8px;
	font-size: 12px;
	font-weight: 700;
	color: #e5484d;
	text-decoration: none;
}

.whats-new-more {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 16px;
	padding: 12px 14px;
	border: 1px solid var(--surface-border-color);
	border-radius: 12px;
	background: var(--surface-muted-color);
	color: inherit;
	text-decoration: none;
	font-size: 18px;
	color: var(--font-sec-color, #747474);
}

.whats-new-more span:first-child {
	display: flex;
	flex-direction: column;
	line-height: 1.3;
}

.whats-new-more b {
	font-size: 13px;
	color: var(--heading-color, #2a2d48);
}

.whats-new-more small {
	font-size: 11px;
}
</style>
