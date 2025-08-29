<template>
	<div class="search-menu">
		<div class="search-menu-section">Misceallaneous</div>
		<div class="search-menu-item clickable" data-id="targeted_search" title="Search exactly for the given prompt.">
			<div class="search-menu-item-label">
				<img class="icon" src="/icons/search/target.png" alt="">
				<label>Precise Search</label>
			</div>
			<div class="checkbox_wrapper">
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-item clickable" data-id="disabled_subjects" title="Show Wanikani disabled subjects.">
			<div class="search-menu-item-label">
				<img class="icon" src="/icons/search/no-stopping.png" alt="">
				<label>Disabled Subjects</label>
			</div>
			<div class="checkbox_wrapper checkbox-enabled">
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-section">Subjects</div>
		<div class="search-menu-item clickable" data-id="radicals" title="Search for radicals.">
			<div class="search-menu-item-label">
				<div class="subject-type-icon" style="color: var(--radical-tag-color)">部首</div>
				<label>Radicals</label>
			</div>
			<div class="checkbox_wrapper checkbox-enabled">
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-item clickable" data-id="kanji" title="Search for kanji.">
			<div class="search-menu-item-label">
				<div class="subject-type-icon" style="color: var(--kanji-tag-color)">漢字</div>
				<label>Kanji</label>
			</div>
			<div class="checkbox_wrapper checkbox-enabled">
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-item clickable" data-id="vocabulary" title="Search for vocabulary.">
			<div class="search-menu-item-label">
				<div class="subject-type-icon" style="color: var(--vocabulary-tag-color)">単語</div>
				<label>Vocabulary</label>
			</div>
			<div class="checkbox_wrapper checkbox-enabled">
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-section">Progress</div>
		<div class="search-menu-item clickable" data-id="passed" title="Show passed subjects.">
			<div class="search-menu-item-label">
				<img class="icon" src="/icons/search/check.png" alt="">
				<label>Passed</label>
			</div>
			<div class="checkbox_wrapper checkbox-enabled">
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-item clickable" data-id="in_progress" title="Show subjects in progress.">
			<div class="search-menu-item-label">
				<img class="icon" src="/icons/search/time.png" alt="">
				<label>In Progress</label>
			</div>
			<div class="checkbox_wrapper checkbox-enabled">
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-item clickable" data-id="locked" title="Show locked subjects.">
			<div class="search-menu-item-label">
				<img class="icon" src="/icons/search/padlock.png" alt="">
				<label>Locked</label>
			</div>
			<div class="checkbox_wrapper checkbox-enabled">
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'SearchMenu',
}
</script>

<style scoped>
.search-menu {
	background-color: white;
	position: absolute;
	top: 40px;
	right: 10px;
	transition: 0.2s;
	z-index: 10;
}

.search-menu-section {
	padding: 8px 10px;
	background-color: var(--default-color);
	color: white;
}

.search-menu-item {
	display: flex;
	align-items: center;
	white-space: nowrap;
	padding: 8px 10px;
	justify-content: space-between;
	column-gap: 20px;
}

.search-menu-item img {
	width: 20px;
	padding: 0 3px;
}

.search-menu-item-label {
	display: flex;
	align-items: center;
}

.search-menu-item-label label {
	padding: 0 10px;
	font-size: 15px;
	line-height: 0px;
	opacity: unset;
}

.search-menu-slide-in {
	right: 0px !important;
}
</style>