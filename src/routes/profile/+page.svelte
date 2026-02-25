<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';
	import { auth } from '$lib/auth-client';

	interface ProfileData {
		user: { id: string; name: string; email: string };
		stats: {
			totalRuns: number;
			totalVerticalMeters: number;
			totalDistanceMeters: number;
			totalDurationSeconds: number;
		};
		isAdmin: boolean;
	}

	let profile = $state<ProfileData | null>(null);
	let loading = $state(true);
	let error = $state('');
	let signingOut = $state(false);

	onMount(async () => {
		try {
			profile = await api.get<ProfileData>('/profile');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load profile';
		} finally {
			loading = false;
		}
	});

	async function handleSignOut() {
		signingOut = true;
		try {
			await auth.signOut();
			window.location.href = '/';
		} catch {
			signingOut = false;
		}
	}

	function formatDistance(meters: number): string {
		if (meters < 1000) return `${meters} m`;
		return `${(meters / 1000).toFixed(1)} km`;
	}

	function formatDuration(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	function initials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<svelte:head>
	<title>Profile - Freelines</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-950 text-white">
	<header class="flex items-center justify-center px-4 py-3">
		<h1 class="text-lg font-semibold">Profile</h1>
	</header>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if error}
		<div class="mx-4 rounded-lg bg-red-900/50 p-3">
			<p class="text-sm text-red-200">{error}</p>
		</div>
	{:else if profile}
		<!-- Avatar + name -->
		<div class="flex flex-col items-center px-4 pb-6 pt-4">
			<div
				class="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-green-700 text-2xl font-bold text-white"
			>
				{initials(profile.user.name)}
			</div>
			<h2 class="text-xl font-bold">{profile.user.name}</h2>
			<p class="text-sm text-gray-500">{profile.user.email}</p>
			{#if profile.isAdmin}
				<span class="mt-1 rounded-full bg-amber-700/40 px-2 py-0.5 text-xs text-amber-300">
					Admin
				</span>
			{/if}
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-2 gap-3 px-4">
			<div class="rounded-xl bg-gray-900 p-4 text-center">
				<p class="text-3xl font-bold">{profile.stats.totalRuns}</p>
				<p class="text-xs text-gray-500">Total Runs</p>
			</div>
			<div class="rounded-xl bg-gray-900 p-4 text-center">
				<p class="text-3xl font-bold">{profile.stats.totalVerticalMeters.toLocaleString()} m</p>
				<p class="text-xs text-gray-500">Total Vertical</p>
			</div>
			<div class="rounded-xl bg-gray-900 p-4 text-center">
				<p class="text-3xl font-bold">{formatDistance(profile.stats.totalDistanceMeters)}</p>
				<p class="text-xs text-gray-500">Total Distance</p>
			</div>
			<div class="rounded-xl bg-gray-900 p-4 text-center">
				<p class="text-3xl font-bold">{formatDuration(profile.stats.totalDurationSeconds)}</p>
				<p class="text-xs text-gray-500">Time on Snow</p>
			</div>
		</div>

		<!-- Admin link -->
		{#if profile.isAdmin}
			<div class="mx-4 mt-4">
				<a
					href="/admin/lines"
					class="flex items-center justify-between rounded-xl bg-amber-900/30 p-4 active:bg-amber-900/50"
				>
					<span class="font-medium text-amber-300">Admin: Line Review</span>
					<svg class="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</div>
		{/if}

		<!-- Sign out -->
		<div class="mx-4 mt-4">
			<button
				class="w-full rounded-xl bg-gray-900 p-4 text-left font-medium text-red-400 active:bg-gray-800 disabled:opacity-50"
				disabled={signingOut}
				onclick={handleSignOut}
			>
				{signingOut ? 'Signing out...' : 'Sign Out'}
			</button>
		</div>
	{/if}
</div>
