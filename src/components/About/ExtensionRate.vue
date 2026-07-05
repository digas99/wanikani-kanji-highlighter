<template>
	<div class="extension-rate">
		<div class="rate-subtext">Please, consider giving me a review!</div>
		<div class="rate-stars">
			<a
				v-for="star in 5"
				:key="star"
				:href="storeUrl"
				target="_blank"
				rel="noopener"
				class="clickable icon"
				:title="`Rate ${star} star${star === 1 ? '' : 's'}`"
			>
				<img src="@/assets/icons/about/star.png" alt="star">
			</a>
		</div>
		<div class="rate-subtext">
			Having issues using the extension?<br>
			Let me know in the
			<a href="https://community.wanikani.com/t/browser-extension-wanikani-kanji-highlighter-2021/50455" target="_blank" rel="noopener">Forum</a>,
			via <a href="mailto:diogocorreia.dev@gmail.com?subject=Issue with Wanikani Kanji Highlighter">Email</a>
			or on <a href="https://github.com/digas99/wanikani-kanji-highlighter/issues" target="_blank" rel="noopener">Github</a>.
		</div>
	</div>
</template>

<script>
export default {
	name: 'ExtensionRate',

	data() {
		return {
			storeUrl:
				'https://chromewebstore.google.com/detail/wanikani-kanji-highlighte/pdbjikelneighjgjojikkmhiehpcokjm/reviews#:~:text=Write%20a%20Review',
		};
	},
};
</script>

<style scoped>
.extension-rate {
	text-align: center;
}

.rate-subtext {
	color: var(--muted-color);
	line-height: 1.5;
}

.rate-stars {
	display: flex;
	justify-content: center;
	gap: 6px;
	margin: 10px 0;
}

.rate-stars img {
	width: 28px;
}

.rate-stars a:hover img {
	filter: brightness(1.15);
}
</style>
