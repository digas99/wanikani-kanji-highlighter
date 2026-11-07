<template>
	<!--
		The HanziHero Companion, installed and answering: its user's picture, rank and its logo, to
		show the two found each other (they share pages: partnerExtension.ts). Nothing without it.
	-->
	<span v-if="partner" class="partner-pill" :title="title">
		<span class="partner-pill-avatar">
			<img v-if="profile?.avatar && !avatarFailed" :src="profile.avatar" alt="" referrerpolicy="no-referrer" @error="avatarFailed = true">
			<span v-else aria-hidden="true">{{ initial }}</span>
		</span>
		<span v-if="profile?.level" class="partner-pill-level">{{ profile.level }}</span>
		<img class="partner-pill-logo" :src="PARTNER.logo" alt="">
	</span>
</template>

<script>
import { PARTNER, findPartner } from '@/utils/scripts/partnerExtension';

export default {
	name: 'PartnerPill',

	data() {
		return { partner: null, avatarFailed: false, PARTNER };
	},

	computed: {
		profile() {
			return this.partner?.about?.profile ?? null;
		},
		initial() {
			return (this.profile?.name ?? PARTNER.name).charAt(0).toUpperCase();
		},
		title() {
			const who = [this.profile?.name, this.profile?.level].filter(Boolean).join(', ');
			return `The ${PARTNER.fullName} is on${who ? ` (${who})` : ''}: the two share pages, each highlighting its own text`;
		},
	},

	async mounted() {
		this.partner = await findPartner();
	},
};
</script>

<style scoped>
/* the hero's top right corner, clear of the level bar under the name */
.partner-pill {
	position: absolute;
	top: 8px;
	right: 12px;
	z-index: 1;
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 1px 3px 1px 1px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
	font-size: 10px;
	font-weight: 700;
	line-height: 1;
}

.partner-pill-avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	overflow: hidden;
	border-radius: 50%;
	background: #fd2f68;
	font-size: 11px;
}

.partner-pill-avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.partner-pill-logo {
	width: 15px;
	height: 15px;
	border-radius: 4px;
}
</style>
