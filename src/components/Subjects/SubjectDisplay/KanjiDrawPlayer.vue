<template>
	<div v-if="item.characters" class="sd-detailsPopup_strokes" :class="{ 'sd-detailsPopup_dmakExpanded': expanded }">
		<div
			v-if="expanded"
			class="sd-detailsPopup_clickable"
			id="sd-detailsPopup_dmakExpandedClose"
			title="Close Drawing"
			@click.stop="expanded = false"
		>
			<img :src="iconsSource + 'close-thick.png'" alt="Close">
		</div>
		<div
			id="sd-popupDetails_dmak"
			ref="dmakContainer"
			class="sd-detailsPopup_clickable"
			@click="toggleExpanded"
		>
			<div v-if="strokesLoading" class="sd-popupDetails_svgLoading">
				<span class="sd-popupDetails_svgLoading-spinner"></span>
				Loading kanji strokes…
			</div>
			<KanjiDraw
				:key="`${item.id}-${strokeSize ?? 'auto'}`"
				:characters="item.characters"
				:size="strokeSize"
				@dmak="onDmak"
				@loaded="strokesLoading = false"
			/>
		</div>
		<div class="sd-popupDetails_drawButtons">
			<div @click="this.previous" title="Previous Stroke" class="sd-detailsPopup_clickable"
				data-action="prevStroke">
				<img :src="iconsSource + 'up-arrow-thick.png'" alt="Previous Stroke" style="rotate: -90deg;">
			</div>
			<div @click="this.pause" title="Pause Drawing" class="sd-detailsPopup_clickable" data-action="pause">
				<img :src="iconsSource + 'pause.png'" alt="Pause Drawing">
			</div>
			<div @click="this.resume" title="Resume Drawing" class="sd-detailsPopup_clickable" data-action="resume">
				<img :src="iconsSource + 'play-button-arrowhead.png'" alt="Resume Drawing">
			</div>
			<div @click="this.next" title="Next Stroke" class="sd-detailsPopup_clickable" data-action="nextStroke">
				<img :src="iconsSource + 'up-arrow-thick.png'" alt="Next Stroke" style="rotate: 90deg;">
			</div>
			<div @click="this.reload" title="Reload Strokes" class="sd-detailsPopup_clickable" data-action="reload"
				style="margin-left: 20px;">
				<img :src="iconsSource + 'reload.png'" alt="Reload">
			</div>
			<div @click="this.clear" title="Clear All Strokes" class="sd-detailsPopup_clickable" data-action="clear">
				<img :src="iconsSource + 'close-thick.png'" alt="Clear">
			</div>
			<a href="https://mbilbille.github.io/dmak/" target="_blank" class="sd-detailsPopup_clickable"
				style="margin-left: 20px; filter: unset;" title="https://mbilbille.github.io/dmak/">
				<img :src="iconsSource + 'dmak-logo.png'" alt="dmak" style="width: 25px;">
			</a>
			<a href="https://kanjivg.tagaini.net/" target="_blank" class="sd-detailsPopup_clickable"
				style="filter: unset; color: white;" title="https://kanjivg.tagaini.net/">
				<div>KanjiVG</div>
			</a>
		</div>
	</div>
</template>

<script>
import KanjiDraw from '@/components/Subjects/SubjectDisplay/KanjiDraw.vue';

export default {
	name: 'KanjiDrawPlayer',

	components: {
		KanjiDraw
	},
	props: {
		item: {
			type: Object,
			required: true,
		},
		allowExpand: {
			type: Boolean,
			default: false,
		},
		strokeSize: {
			type: Number,
			default: null,
		},
	},

	data() {
		return {
			iconsSource: browser.runtime.getURL('/icons/kanjiDraw/'),
			dmak: null,
			strokesLoading: true,
			expanded: false,
		};
	},

	watch: {
		'item.id'() {
			this.dmak = null;
			this.strokesLoading = true;
			this.expanded = false;
		},
	},

	methods: {
		onDmak(dmak) {
			this.dmak = dmak;
		},
		toggleExpanded(event) {
			if (!this.allowExpand) return;
			if (event.target.closest('.sd-popupDetails_drawButtons')) return;
			this.expanded = !this.expanded;
		},
		previous() {
			if (!this.dmak) return;
			this.dmak.pause();
			this.dmak.eraseLastStrokes(1);
		},
		pause() {
			if (!this.dmak) return;
			this.dmak.pause();
		},
		resume() {
			if (!this.dmak) return;
			this.dmak.render();
		},
		next() {
			if (!this.dmak) return;
			this.dmak.pause();
			this.dmak.renderNextStrokes(1);
		},
		reload() {
			if (!this.dmak) return;
			this.dmak.pause();
			this.dmak.erase();
			setTimeout(() => this.dmak.render(), 1000);
		},
		clear() {
			if (!this.dmak) return;
			this.dmak.pause();
			this.dmak.erase();
		}
	}
}
</script>

<style scoped>
.sd-detailsPopup_strokes>div {
	justify-content: center;
}
</style>