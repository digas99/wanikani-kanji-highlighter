<template>
	<main class="upgrade-page">
		<header class="upgrade-hero">
			<img :src="logo" alt="WaniKani Kanji Highlighter" class="upgrade-logo">
			<div class="upgrade-badge">Version 2.0</div>
			<h1>Welcome to WKHighlighter 2.0</h1>
			<p>
				Your settings and API key were carried over automatically. The extension is
				rebuilding its cache in the background.
			</p>
		</header>

		<section class="upgrade-card">
			<h2>What&apos;s new</h2>
			<ul>
				<li>Rewritten popup with a faster dashboard, lessons, reviews, profile, and search.</li>
				<li>New caching system with progressive level sync and fewer API issues.</li>
				<li>Improved subject details popup, highlighting options, and settings layout.</li>
				<li>JLPT / Jōyō progress views and school-grade highlighting.</li>
			</ul>
		</section>

		<section class="upgrade-card upgrade-warning">
			<strong>Highlighting stopped working after the update?</strong>
			<p>
				This was a major rewrite, including how login and cached subject data are stored.
				Your API key should already be migrated, but if page highlighting does not work:
			</p>
			<ol>
				<li>Open the WKHighlighter extension popup.</li>
				<li>If prompted, log in again with your WaniKani API key.</li>
				<li>Wait for the background sync to finish, then reload the page you want to highlight.</li>
			</ol>
			<p>
				In most cases you will not need to do anything — the cache rebuilds itself after the update.
			</p>
		</section>

		<div class="upgrade-actions">
			<button type="button" class="upgrade-primary" @click="closePage">
				Got it
			</button>
			<a class="upgrade-secondary" :href="popupUrl" target="_blank" rel="noopener">
				Open extension
			</a>
		</div>

		<p class="upgrade-footnote">
			This notice is shown once after upgrading from v1.5.
		</p>
	</main>
</template>

<script>
import logo from '@/assets/logo.png';

export default {
	name: 'UpgradeNotice',

	data() {
		return { logo };
	},

	computed: {
		popupUrl() {
			return browser.runtime.getURL('/popup.html');
		},
	},

	methods: {
		closePage() {
			void browser.tabs.getCurrent().then(tab => {
				if (tab?.id != null) void browser.tabs.remove(tab.id);
				else window.close();
			});
		},
	},
};
</script>
