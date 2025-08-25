<template>

</template>

<script>
import { getWKManager } from '@/lib/apiClient';

export default {
	name: 'Home',

	mounted() {
		const wkManager = getWKManager();
	}
}
</script>

<style scoped></style>