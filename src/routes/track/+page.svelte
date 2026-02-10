<script lang="ts">
	import { tracker } from '$lib/services/gps-tracker.svelte';
	import { msToKmh } from '$lib/utils/geo';
	import { onMount } from 'svelte';

	let permissionGranted = $state(false);
	let permissionError = $state('');
	let recoveredSession = $state(false);

	onMount(async () => {
		// Check for a crashed/interrupted session to recover
		const saved = await tracker.restoreSession();
		if (saved && saved.points.length > 0) {
			recoveredSession = true;
		}
	});

	async function handleRequestPermission() {
		permissionError = '';
		try {
			permissionGranted = await tracker.requestPermissions();
			if (!permissionGranted) {
				permissionError = 'Location permission denied. Please enable it in your device settings.';
			}
		} catch (err) {
			permissionError = err instanceof Error ? err.message : 'Failed to request permissions';
		}
	}

	async function handleStart() {
		permissionError = '';
		try {
			await tracker.start();
		} catch (err) {
			permissionError = err instanceof Error ? err.message : 'Failed to start tracking';
		}
	}

	async function handleStop() {
		const session = await tracker.stop();
		console.log('[Track] Session completed:', session.id, `${session.points.length} points`);
		// TODO Phase 2: save session to server
	}

	function handleDiscardRecovery() {
		recoveredSession = false;
		// Tracker already loaded the points; just clear the flag
	}

	function formatDuration(ms: number): string {
		const totalSec = Math.floor(ms / 1000);
		const h = Math.floor(totalSec / 3600);
		const m = Math.floor((totalSec % 3600) / 60);
		const s = totalSec % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function formatDistance(meters: number): string {
		if (meters < 1000) return `${Math.round(meters)} m`;
		return `${(meters / 1000).toFixed(2)} km`;
	}
</script>

<svelte:head>
	<title>Track - Freelines</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-950 text-white">
	<!-- Header -->
	<header class="flex items-center justify-between px-4 py-3">
		<a href="/" class="text-sm text-gray-400">Back</a>
		<h1 class="text-lg font-semibold">Track</h1>
		<span
			class="rounded-full px-2 py-0.5 text-xs font-medium {tracker.isNative()
				? 'bg-green-900 text-green-300'
				: 'bg-yellow-900 text-yellow-300'}"
		>
			{tracker.isNative() ? 'Native' : 'Web'}
		</span>
	</header>

	<!-- Recovered session banner -->
	{#if recoveredSession && !tracker.isTracking}
		<div class="mx-4 mb-4 rounded-lg bg-blue-900/50 p-3">
			<p class="text-sm text-blue-200">
				Found an interrupted session with {tracker.points.length} points. You can resume or discard
				it.
			</p>
			<div class="mt-2 flex gap-2">
				<button
					onclick={handleStart}
					class="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white"
				>
					Resume tracking
				</button>
				<button
					onclick={handleDiscardRecovery}
					class="rounded bg-gray-700 px-3 py-1 text-sm font-medium text-gray-300"
				>
					Discard
				</button>
			</div>
		</div>
	{/if}

	<!-- Permission error -->
	{#if permissionError}
		<div class="mx-4 mb-4 rounded-lg bg-red-900/50 p-3">
			<p class="text-sm text-red-200">{permissionError}</p>
			{#if tracker.isNative()}
				<button
					onclick={handleRequestPermission}
					class="mt-2 rounded bg-red-700 px-3 py-1 text-sm font-medium text-white"
				>
					Retry permission
				</button>
			{/if}
		</div>
	{/if}

	<!-- Web fallback warning -->
	{#if !tracker.isNative()}
		<div class="mx-4 mb-4 rounded-lg bg-yellow-900/30 p-3">
			<p class="text-sm text-yellow-200">
				Running in web mode. Background tracking is not available — keep the browser tab open.
			</p>
		</div>
	{/if}

	<!-- Stats grid -->
	<div class="grid grid-cols-2 gap-3 px-4">
		<div class="rounded-xl bg-gray-900 p-4">
			<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Duration</p>
			<p class="mt-1 text-2xl font-bold tabular-nums">
				{formatDuration(tracker.stats.duration)}
			</p>
		</div>
		<div class="rounded-xl bg-gray-900 p-4">
			<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Vertical Drop</p>
			<p class="mt-1 text-2xl font-bold tabular-nums">
				{Math.round(tracker.stats.verticalDrop)} m
			</p>
		</div>
		<div class="rounded-xl bg-gray-900 p-4">
			<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Distance</p>
			<p class="mt-1 text-2xl font-bold tabular-nums">
				{formatDistance(tracker.stats.distance)}
			</p>
		</div>
		<div class="rounded-xl bg-gray-900 p-4">
			<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Speed</p>
			<p class="mt-1 text-2xl font-bold tabular-nums">
				{tracker.stats.currentSpeed.toFixed(1)} km/h
			</p>
		</div>
		<div class="rounded-xl bg-gray-900 p-4">
			<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Max Speed</p>
			<p class="mt-1 text-2xl font-bold tabular-nums">
				{tracker.stats.maxSpeed.toFixed(1)} km/h
			</p>
		</div>
		<div class="rounded-xl bg-gray-900 p-4">
			<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">GPS Points</p>
			<p class="mt-1 text-2xl font-bold tabular-nums">
				{tracker.stats.pointCount}
			</p>
		</div>
	</div>

	<!-- Elevation range -->
	{#if tracker.stats.pointCount > 0}
		<div class="mx-4 mt-3 rounded-xl bg-gray-900 p-4">
			<div class="flex justify-between text-sm">
				<span class="text-gray-400">
					Elevation range: {Math.round(tracker.stats.minElevation)} m – {Math.round(
						tracker.stats.maxElevation
					)} m
				</span>
			</div>
		</div>
	{/if}

	<!-- Spacer -->
	<div class="flex-1"></div>

	<!-- Start / Stop button -->
	<div class="p-6">
		{#if tracker.isTracking}
			<button
				onclick={handleStop}
				class="w-full rounded-2xl bg-red-600 py-4 text-lg font-bold text-white active:bg-red-700"
			>
				Stop Tracking
			</button>
		{:else}
			<button
				onclick={handleStart}
				class="w-full rounded-2xl bg-green-600 py-4 text-lg font-bold text-white active:bg-green-700"
			>
				Start Tracking
			</button>
		{/if}
	</div>
</div>
