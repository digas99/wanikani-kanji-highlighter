<template>
	<!-- WaniKani's mnemonic drawing (radicals); nothing while loading or when there's none -->
	<figure v-if="image" class="sd-mnemonicImage">
		<img :src="image.dataUrl" :alt="image.alt" :title="image.alt" @error="image = null">
	</figure>
</template>

<script>
import { getMnemonicImage } from '@/utils/scripts/mnemonicImages';

export default {
	name: 'SubjectMnemonicImage',

	props: {
		item: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			image: null,
		};
	},

	watch: {
		'item.id': {
			handler() {
				void this.load();
			},
			immediate: true,
		},
	},

	methods: {
		async load() {
			const id = this.item.id;
			this.image = null;
			const image = await getMnemonicImage({ id, document_url: this.item.document_url });
			if (this.item.id === id) this.image = image;
		},
	},
};
</script>

<style scoped>
/* the drawings are dark lines on transparent: a white card (as on WaniKani) in any theme */
.sd-mnemonicImage {
	width: min(100%, 220px);
	margin: 10px auto 0;
	padding: 10px;
	box-sizing: border-box;
	border-radius: 10px;
	background: #fff;
}

.sd-mnemonicImage img {
	display: block;
	width: 100%;
	height: auto;
	aspect-ratio: 1 / 1;
}
</style>
