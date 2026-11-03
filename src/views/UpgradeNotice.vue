<template>
	<main class="upgrade-page">
		<header class="upgrade-hero">
			<img :src="logo" alt="WaniKani Kanji Highlighter" class="upgrade-logo">
			<div class="upgrade-badge">Version {{ version }}</div>
			<template v-if="fresh">
				<h1>Welcome to WaniKani Kanji Highlighter</h1>
				<p>
					It highlights the kanji and words you study on WaniKani on the pages you read, and
					follows your progress. To start, open the extension and log in with your WaniKani
					API key. Here's what's new in version 2.0:
				</p>
			</template>
			<template v-else>
				<h1>Welcome to WaniKani Kanji Highlighter 2.0</h1>
				<p>
					The extension was rebuilt from the ground up. Your settings and API key came along,
					and your subjects are being downloaded again in the background: highlighting picks up
					on its own in a minute or two.
				</p>
			</template>
		</header>

		<WhatsNewList :links="loggedIn" :link-base="popupUrl" :fresh="fresh">
			<template #fix-action>
				<a class="upgrade-fix-link" :href="settingsUrl" target="_blank" rel="noopener">Open Settings → Data ›</a>
			</template>
		</WhatsNewList>

		<div class="upgrade-actions">
			<template v-if="fresh">
				<a class="upgrade-primary" :href="popupUrl" target="_blank" rel="noopener">Open the extension to log in</a>
				<button type="button" class="upgrade-secondary" @click="closePage">Close</button>
			</template>
			<template v-else>
				<button type="button" class="upgrade-primary" @click="closePage">Got it</button>
				<a class="upgrade-secondary" :href="popupUrl" target="_blank" rel="noopener">Open the extension</a>
			</template>
		</div>

		<p class="upgrade-footnote">
			You can read this again any time in the extension: About → What's new in 2.0.
		</p>
	</main>
</template>

<script>
import { storage } from '#imports';
import logo from '@/assets/logo.png';
import WhatsNewList from '@/components/WhatsNewList.vue';
import { WHATS_NEW_VERSION } from '@/utils/scripts/whatsNew';

export default {
	name: 'UpgradeNotice',

	components: { WhatsNewList },

	data() {
		return {
			logo,
			version: WHATS_NEW_VERSION,
			/** opened for a first install (upgrade.html?fresh=1), not an update */
			fresh: new URLSearchParams(location.search).get('fresh') === '1',
			/** the cards link to their page in the extension only when it's logged in (else they'd
			 *  land on the login screen); a login in the meantime turns them on */
			loggedIn: false,
		};
	},

	async mounted() {
		const update = key => { this.loggedIn = typeof key === 'string' && key.trim().length > 0; };
		update(await storage.getItem('sync:apiKey'));
		this.unwatchKey = storage.watch('sync:apiKey', update);
	},

	beforeUnmount() {
		this.unwatchKey?.();
	},

	computed: {
		popupUrl() {
			return browser.runtime.getURL('/popup.html');
		},
		settingsUrl() {
			return browser.runtime.getURL('/popup.html#/settings?tab=data&section=storage');
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
