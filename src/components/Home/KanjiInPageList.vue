<template>
	<div class="kanji-list">
		<span v-if="kanji.length === 0" class="no-kanji">No kanji found in this page</span>
	</div>
</template>

<script>

export default {
	name: 'KanjiInPageList',

	data() {
		return {
			kanji: []
		};
	}
}
</script>

<style scoped>
.kanji-list {
	padding: 12px 16px;
	background-color: white;
	border: 1px solid #eee;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.no-kanji {
	color: #b3b3b3;
}
</style>