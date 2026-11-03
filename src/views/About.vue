<template>
	<div class="container about-page">
		<div class="about-stack">
			<section class="about-card hero-card">
				<div class="hero-top">
					<img :src="logo" alt="" class="hero-logo">
					<div class="hero-text">
						<h2>WaniKani Kanji Highlighter</h2>
						<p class="muted">Unofficial kanji highlighter, matching what you learn on WaniKani.</p>
						<div class="version-wrapper">
							<span class="version-tag">v{{ version }}</span>
							<span v-if="versionStatus" class="version-status" :class="versionStatus" :title="versionTitle">
								<img v-if="versionStatus === 'latest'" src="@/assets/icons/about/check.png" alt="">
								<img v-else-if="versionStatus === 'outdated'" src="@/assets/icons/about/remove.png" alt="">
								<img v-else src="@/assets/icons/about/code.png" alt="">
								{{ versionLabel }}
							</span>
						</div>
					</div>
				</div>
				<div class="hero-links">
					<RouterLink class="hero-link whats-new" :to="{ name: 'WhatsNew' }">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></svg>
						<span><b>What's new in 2.0</b><small>The main changes since v1.5</small></span>
					</RouterLink>
					<RouterLink class="hero-link" :to="{ name: 'Features' }">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" /></svg>
						<span><b>What it can do</b><small>Every feature, with tips</small></span>
					</RouterLink>
				</div>
			</section>

			<section class="about-card">
				<div class="about-card-title">API Key</div>
				<div class="about-card-body">
					<div class="api-key">
						<code class="api-key-value" :class="{ masked: !showApiKey && wk.activeApiKey }">{{ shownApiKey }}</code>
						<div class="api-key-actions">
							<button
								v-if="wk.activeApiKey"
								type="button"
								class="clickable icon-btn"
								:title="showApiKey ? 'Hide API key' : 'Show API key'"
								@click="showApiKey = !showApiKey"
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
									<circle cx="12" cy="12" r="3" />
									<path v-if="showApiKey" d="M4 4l16 16" />
								</svg>
							</button>
							<button
								type="button"
								class="clickable icon-btn"
								title="Copy API key"
								@click="copyApiKey"
							>
								<img src="@/assets/icons/search/copy.png" alt="copy">
							</button>
							<a
								href="https://www.wanikani.com/settings/personal_access_tokens"
								target="_blank"
								rel="noopener"
								title="Edit on WaniKani"
								class="icon-btn"
							>
								<img src="@/assets/icons/profile/edit.png" alt="edit">
							</a>
						</div>
					</div>
					<p v-if="copied" class="copied-message">Copied!</p>
				</div>
			</section>

			<section class="about-card">
				<div class="about-card-title">Support</div>
				<div class="about-card-body">
					<ExtensionRate />
				</div>
			</section>

			<section class="about-card">
				<div class="about-card-title">Used libraries</div>
				<div class="about-card-body libraries-body">
					<ul class="libraries">
						<li v-for="library in libraries" :key="library.name">
							<a :href="library.url" :title="library.url" target="_blank" rel="noopener">
								<img
									v-if="library.icon"
									:src="library.icon"
									:alt="library.name"
									:class="{ 'library-default': library.defaultIcon }"
								>
								<b>{{ library.name }}</b>
							</a>
							<p class="muted">{{ library.description }}</p>
							<ul v-if="library.dependencies?.length" class="library-deps">
								<li v-for="dep in library.dependencies" :key="dep.name">
									<a :href="dep.url" :title="dep.url" target="_blank" rel="noopener">
										<img
											v-if="dep.icon"
											:src="dep.icon"
											:alt="dep.name"
											class="library-dep-icon"
											:class="{ 'library-dark-tile': dep.darkTile }"
										>
										<b>{{ dep.name }}</b>
									</a>
									<p class="muted">{{ dep.description }}</p>
								</li>
							</ul>
						</li>
					</ul>
				</div>
			</section>

			<section class="about-card">
				<div class="about-card-title">Changelog</div>
				<div class="about-card-body changelog-body">
					<ChangelogPanel />
				</div>
			</section>

			<section class="about-card footer-card">
				<div class="about-card-body footer-body">
					<div class="footer-text">
						Building this project, I took huge inspiration from
						<a href="https://www.wanikani.com" target="_blank" rel="noopener">WaniKani</a>
						(obviously) and from
						<a href="https://play.google.com/store/apps/details?id=com.the_tinkering.wk" target="_blank" rel="noopener">Flaming Durtles</a>,
						an amazing app to use Wanikani on mobile.
						Certain images and data used in this application are the property of Tofugu LLC and are protected by copyright law. © Tofugu LLC.
					</div>
					<div class="footer-icons">
						<a
							href="https://github.com/digas99/wanikani-kanji-highlighter"
							target="_blank"
							rel="noopener"
							title="Source Code"
						>
							<img src="@/assets/icons/about/github-logo.png" alt="github">
						</a>
						<a href="https://www.wanikani.com" target="_blank" rel="noopener" title="WaniKani">
							<img src="@/assets/icons/about/wanikani-logo.png" alt="wanikani">
						</a>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>

<script>
import { useWKStore } from '@/stores';
import logo from '@/assets/logo.png';
import ExtensionRate from '@/components/About/ExtensionRate.vue';
import ChangelogPanel from '@/components/About/ChangelogPanel.vue';
import {
	compareVersions,
	fetchLatestReleaseTag,
} from '@/utils/scripts/about';

import chartJsIcon from '@/assets/icons/about/chart_js.svg';
import dmakIcon from '@/assets/icons/about/dmak-logo.png';
import codeIcon from '@/assets/icons/about/code.png';
import vueIcon from '@/assets/icons/about/vue.svg';
import piniaIcon from '@/assets/icons/about/pinia.svg';
import wxtIcon from '@/assets/icons/about/wxt.svg';
import dexieIcon from '@/assets/icons/about/dexie.png';
import sortableIcon from '@/assets/icons/about/sortablejs.png';

export default {
	name: 'About',

	components: {
		ExtensionRate,
		ChangelogPanel,
	},

	data() {
		return {
			version: browser.runtime.getManifest().version,
			versionStatus: null,
			logo,
			/** hidden until asked: the page may be on screen while sharing it */
			showApiKey: false,
			copied: false,
			copyTimeout: null,
			libraries: [
				{
					name: 'Chart.js',
					url: 'https://www.chartjs.org/',
					icon: chartJsIcon,
					description: 'Stacked bar chart for future reviews per day on the Reviews page',
				},
				{
					name: 'WXT',
					url: 'https://wxt.dev/',
					icon: wxtIcon,
					description: 'Web extension framework: builds the popup, side panel, content and background scripts for each browser',
				},
				{
					name: 'Vue 3',
					url: 'https://vuejs.org/',
					icon: vueIcon,
					description: 'Popup UI framework',
				},
				{
					name: 'Pinia',
					url: 'https://pinia.vuejs.org/',
					icon: piniaIcon,
					description: 'Centralized extension state and WaniKani sync orchestration',
				},
				{
					name: 'wanikani-api-manager',
					url: 'https://github.com/digas99/wanikani-api-manager',
					icon: codeIcon,
					defaultIcon: true,
					description: 'WaniKani API v2 client with batching, caching, and sync events',
					dependencies: [
						{
							name: 'Dexie.js',
							url: 'https://dexie.org/',
							// white logo: shown on a dark tile so it works in light mode too
							icon: dexieIcon,
							darkTile: true,
							description: 'IndexedDB wrapper for the offline subject cache',
						},
						{
							name: 'EventEmitter3',
							url: 'https://github.com/primus/eventemitter3',
							description: 'Event bus for cache reads and background sync updates',
						},
					],
				},
				{
					name: 'Draw Me A Kanji',
					url: 'https://mbilbille.github.io/dmak/',
					icon: dmakIcon,
					description: 'Kanji stroke drawing animation in the subject details popup',
				},
				{
					name: 'KanjiVG',
					url: 'https://kanjivg.tagaini.net/',
					icon: codeIcon,
					defaultIcon: true,
					description: 'Source of the SVG kanji files used in dmak',
				},
				{
					name: 'Kanjium',
					url: 'https://github.com/mifunetoshiro/kanjium',
					icon: codeIcon,
					defaultIcon: true,
					description: 'Pitch accents of vocabulary, by Uros O. (CC BY-SA 4.0)',
				},
				{
					name: 'JLPT vocabulary lists',
					url: 'http://www.tanos.co.uk/jlpt/',
					icon: codeIcon,
					defaultIcon: true,
					description: 'JLPT levels of words, by Jonathan Waller (CC BY); parsed by Bluskyo/JLPT_Vocabulary (MIT)',
				},
				{
					name: 'wanakana',
					url: 'https://wanakana.com/',
					icon: codeIcon,
					defaultIcon: true,
					description: 'Romaji and kana conversion helpers',
				},
				{
					name: 'tiny-segmenter',
					url: 'https://github.com/tinysegmenter/tinysegmenter',
					icon: codeIcon,
					defaultIcon: true,
					description: 'Japanese word segmentation for kanji and vocabulary highlighting',
				},
				{
					name: 'SortableJS',
					url: 'https://sortablejs.github.io/Sortable/',
					icon: sortableIcon,
					description: 'Drag-and-drop reordering of the Home page sections',
				},
			],
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		shownApiKey() {
			const key = this.wk.activeApiKey;
			if (!key) return 'Not available';
			// its end only (enough to tell keys apart)
			return this.showApiKey ? key : `••••••••-••••-••••-••••-••••••${key.slice(-6)}`;
		},
		versionLabel() {
			return { latest: 'Up to date', outdated: 'Update available', dev: 'Development build' }[this.versionStatus] ?? '';
		},
		versionTitle() {
			return {
				latest: 'You are on the latest release',
				outdated: 'A newer version is available',
				dev: 'You are running a newer or development build',
			}[this.versionStatus] ?? '';
		},
	},

	async mounted() {
		const latestTag = await fetchLatestReleaseTag(
			'digas99',
			'wanikani-kanji-highlighter',
		);

		if (latestTag) {
			this.versionStatus = compareVersions(this.version, latestTag);
		}
	},

	beforeUnmount() {
		if (this.copyTimeout) clearTimeout(this.copyTimeout);
	},

	methods: {
		async copyApiKey() {
			if (!this.wk.activeApiKey) return;

			try {
				await navigator.clipboard.writeText(this.wk.activeApiKey);
				this.copied = true;

				if (this.copyTimeout) clearTimeout(this.copyTimeout);
				this.copyTimeout = setTimeout(() => {
					this.copied = false;
				}, 1500);
			} catch (error) {
				console.error('Error copying API key:', error);
			}
		},
	},
};
</script>

<style scoped>
.about-page {
	padding-top: 12px;
	padding-bottom: 24px;
}

.about-stack {
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.about-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 2px 10px var(--shadow-soft-color);
}

.hero-card {
	padding: 16px;
}

.hero-top {
	display: flex;
	align-items: center;
	gap: 14px;
}

.hero-logo {
	width: 64px;
	height: 64px;
	flex-shrink: 0;
	object-fit: contain;
}

.hero-text {
	min-width: 0;
}

.hero-card h2 {
	margin: 0 0 3px;
	font-size: 18px;
	color: var(--heading-color, #2a2d48);
}

.hero-links {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	margin-top: 14px;
}

.hero-link {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 12px;
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
	background: var(--surface-muted-color);
	color: inherit;
	text-decoration: none;
	transition: transform 0.12s, box-shadow 0.12s;
}

.hero-link:hover {
	transform: translateY(-1px);
	box-shadow: 0 3px 10px var(--shadow-soft-color);
}

.hero-link svg {
	width: 22px;
	height: 22px;
	flex-shrink: 0;
	fill: none;
	stroke: var(--font-sec-color, #747474);
	stroke-width: 1.8;
	stroke-linejoin: round;
}

.hero-link span {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: 1.3;
}

.hero-link b {
	font-size: 13px;
	color: var(--heading-color, #2a2d48);
}

.hero-link small {
	font-size: 11px;
	color: var(--font-sec-color, #747474);
}

/* the update's page: WaniKani's pink to purple */
.hero-link.whats-new {
	border-color: transparent;
	background: linear-gradient(135deg, #f100a1, #a100f1);
}

.hero-link.whats-new svg {
	fill: #fff;
	stroke: none;
}

.hero-link.whats-new b,
.hero-link.whats-new small {
	color: #fff;
}

.about-card-title {
	/* pink pill label, as in the subject details popup */
	display: block;
	width: fit-content;
	margin: 12px 12px 2px;
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-weight: 700;
	font-size: 11.5px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	line-height: 1.4;
}

.about-card-body {
	padding: 14px;
}

.muted {
	color: var(--muted-color);
	font-size: 12px;
	line-height: 1.45;
}

.hero-card .muted {
	font-size: 13px;
}

.version-wrapper {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 8px;
}

.version-tag {
	display: inline-block;
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--default-color, #2a2d48);
	color: #fff;
	font-size: 12px;
	font-weight: 700;
}

.version-status {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 11.5px;
	font-weight: 700;
	color: var(--font-sec-color, #747474);
}

.version-status img {
	width: 13px;
}

.version-status.latest {
	color: #2f9e5f;
}

.version-status.outdated {
	color: #e5484d;
}

.version-status.dev {
	color: #c9a227;
}

.version-status.latest img {
	filter: invert(80%) sepia(30%) saturate(5196%) hue-rotate(76deg) brightness(89%) contrast(74%);
}

.version-status.outdated img {
	filter: invert(28%) sepia(65%) saturate(1633%) hue-rotate(317deg) brightness(88%) contrast(97%);
}

.version-status.dev img {
	filter: invert(92%) sepia(100%) saturate(7229%) hue-rotate(337deg) brightness(91%) contrast(93%);
	width: 16px;
}

.api-key {
	display: flex;
	align-items: center;
	gap: 10px;
}

.api-key-value {
	flex: 1;
	min-width: 0;
	word-break: break-all;
	font-size: 11px;
	padding: 8px 10px;
	background: var(--surface-muted-color);
	border: 1px solid var(--surface-border-color);
	border-radius: 6px;
	color: var(--font-color);
}

.api-key-actions {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-shrink: 0;
}

.api-key-actions img {
	width: 15px;
}

.api-key-actions svg {
	width: 15px;
	height: 15px;
	fill: none;
	stroke: var(--font-color, #343434);
	stroke-width: 2;
	stroke-linecap: round;
}

.api-key-value.masked {
	color: var(--font-sec-color, #747474);
}

.icon-btn {
	border: none;
	background: var(--surface-muted-color);
	padding: 7px;
	border-radius: 6px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: opacity 0.2s;
}

.icon-btn:hover {
	opacity: 0.7;
}

.copied-message {
	color: var(--wanikani);
	font-size: 12px;
	margin-top: 8px;
}

.features-info {
	display: flex;
	align-items: center;
	gap: 12px;
	color: inherit;
	padding: 4px 0;
}

.features-info img {
	width: 28px;
	flex-shrink: 0;
}

.features-info p {
	flex: 1;
	color: var(--font-sec-color);
	margin: 0;
	font-size: 13px;
	line-height: 1.4;
}

.features-info .arrow {
	border-color: var(--border-color);
	padding: 4px;
	flex-shrink: 0;
}

.libraries-body {
	padding: 0;
}

.libraries {
	max-height: 240px;
	overflow-y: auto;
	padding: 0;
	margin: 0;
}

.libraries > li {
	padding: 7px 12px;
	border-bottom: 1px solid var(--row-border-color);
}

.libraries > li:last-child {
	border-bottom: none;
}

.libraries > li > a {
	display: flex;
	align-items: center;
	height: 24px;
	color: inherit;
}

.libraries > li > a > img {
	width: 22px;
	height: 22px;
	object-fit: contain;
	margin-right: 8px;
	border-radius: 4px;
}

.libraries > li > a > b {
	font-size: 13px;
}

.libraries > li > p {
	margin: 2px 0 0 30px;
	font-size: 11px;
	line-height: 1.35;
}

.libraries .library-default {
	width: 20px;
	margin-left: 1px;
	padding-right: 1px;
}

.library-deps {
	list-style: none;
	margin: 4px 0 0 30px;
	padding: 0 0 0 10px;
	border-left: 2px solid #efeff4;
}

.library-deps > li {
	padding: 5px 0;
}

.library-deps > li + li {
	border-top: 1px solid #f3f3f8;
}

.library-deps > li > a {
	display: flex;
	align-items: center;
	gap: 6px;
	color: inherit;
}

.library-dep-icon {
	width: 16px;
	height: 16px;
	object-fit: contain;
	border-radius: 3px;
}

/* light logos (white on transparent) */
.library-dark-tile {
	padding: 2px;
	box-sizing: content-box;
	background: #2a2d48;
}

.library-deps > li > a > b {
	font-size: 12px;
}

.library-deps > li > p {
	margin: 1px 0 0;
	font-size: 11px;
	line-height: 1.35;
}

.changelog-body {
	padding: 12px 14px 14px;
}

.footer-body {
	text-align: center;
}

.footer-text {
	color: var(--muted-color);
	line-height: 1.55;
	font-size: 12px;
}

.footer-text a {
	color: var(--wanikani);
}

.footer-icons {
	padding-top: 14px;
	display: flex;
	justify-content: center;
	gap: 14px;
}

.footer-icons img {
	width: 28px;
	opacity: 0.85;
	transition: opacity 0.2s;
}

.footer-icons a:hover img {
	opacity: 1;
}
</style>
