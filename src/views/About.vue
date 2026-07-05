<template>
	<div class="container about-page">
		<div class="about-stack">
			<section class="about-card hero-card">
				<h2>Wanikani Kanji Highlighter</h2>
				<p class="muted">Unofficial kanji highlighter, matching kanji learned with Wanikani.</p>
				<div class="version-wrapper">
					<span class="version-tag">v{{ version }}</span>
					<div v-if="versionStatus" class="check-version">
						<div
							v-if="versionStatus === 'latest'"
							title="You are on the latest release"
						>
							<img src="@/assets/icons/about/check.png" alt="">
						</div>
						<div
							v-else-if="versionStatus === 'outdated'"
							title="A newer version is available"
						>
							<img src="@/assets/icons/about/remove.png" alt="">
						</div>
						<div
							v-else-if="versionStatus === 'dev'"
							title="You are running a newer or development build"
						>
							<img src="@/assets/icons/about/code.png" alt="">
						</div>
					</div>
				</div>
			</section>

			<section class="about-card">
				<div class="about-card-title">API Key</div>
				<div class="about-card-body">
					<div class="api-key">
						<code class="api-key-value">{{ displayedApiKey }}</code>
						<div class="api-key-actions">
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
				<div class="about-card-title">Features Information</div>
				<div class="about-card-body">
					<RouterLink class="features-info clickable" :to="{ name: 'Features' }">
						<img src="@/assets/icons/features/features.png" alt="features">
						<p>Click here to see usage recommendations and tips.</p>
						<i class="arrow right"></i>
					</RouterLink>
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
						Hi, my name is Diogo. I'm from Portugal and I'm a student at Universidade de Aveiro.
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
import ExtensionRate from '@/components/About/ExtensionRate.vue';
import ChangelogPanel from '@/components/About/ChangelogPanel.vue';
import {
	compareVersions,
	fetchLatestReleaseTag,
} from '@/utils/scripts/about';

import chartJsIcon from '@/assets/icons/about/chart_js.svg';
import dmakIcon from '@/assets/icons/about/dmak-logo.png';
import codeIcon from '@/assets/icons/about/code.png';

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
					name: 'Vue 3',
					url: 'https://vuejs.org/',
					icon: codeIcon,
					defaultIcon: true,
					description: 'Popup UI framework',
				},
				{
					name: 'Pinia',
					url: 'https://pinia.vuejs.org/',
					icon: codeIcon,
					defaultIcon: true,
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
			],
		};
	},

	computed: {
		wk() {
			return useWKStore();
		},
		displayedApiKey() {
			return this.wk.activeApiKey || 'Not available';
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
	gap: 14px;
}

.about-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 2px 10px var(--shadow-soft-color);
}

.hero-card {
	padding: 18px 16px;
	text-align: center;
}

.hero-card h2 {
	margin: 0 0 6px;
	font-size: 18px;
	color: var(--default-color);
}

.about-card-title {
	padding: 9px 14px;
	background: var(--default-color);
	color: white;
	font-weight: bold;
	font-size: 13px;
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
	display: inline-flex;
	align-items: center;
	gap: 8px;
	margin-top: 12px;
}

.version-tag {
	display: inline-block;
	padding: 4px 10px;
	border-radius: 999px;
	background: var(--surface-muted-color);
	color: var(--default-color);
	font-size: 13px;
	font-weight: 700;
}

.check-version img {
	width: 14px;
}

.check-version img[src*='check'] {
	filter: invert(80%) sepia(30%) saturate(5196%) hue-rotate(76deg) brightness(89%) contrast(74%);
}

.check-version img[src*='remove'] {
	filter: invert(28%) sepia(65%) saturate(1633%) hue-rotate(317deg) brightness(88%) contrast(97%);
}

.check-version img[src*='code'] {
	filter: invert(92%) sepia(100%) saturate(7229%) hue-rotate(337deg) brightness(91%) contrast(93%);
	width: 19px;
}

.api-key {
	display: flex;
	align-items: flex-start;
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
	margin-right: 8px;
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
	display: block;
	color: inherit;
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
