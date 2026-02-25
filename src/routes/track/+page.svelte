<script lang="ts">
	import { tracker } from '$lib/services/gps-tracker.svelte';
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';
	import type { LineMatchResult } from '$lib/types';

	let permissionError = $state('');
	let recoveredSession = $state(false);
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveError = $state('');
	let matchResult = $state<LineMatchResult | null>(null);
	let savedRunId = $state('');
	let wasQueued = $state(false);
	let sessionStopped = $state(false);
	let queueCount = $state(0);
	let syncing = $state(false);

	// Propose new line
	let showPropose = $state(false);
	let proposeName = $state('');
	let proposeDescription = $state('');
	let proposeType = $state('face');
	let proposeDifficulty = $state(3);
	let proposeExposure = $state('N');
	let proposeState = $state<'idle' | 'submitting' | 'done' | 'error'>('idle');
	let proposeError = $state('');

	onMount(async () => {
		const saved = await tracker.restoreSession();
		if (saved && saved.points.length > 0) {
			recoveredSession = true;
		}
		queueCount = await tracker.getQueueCount();

		// Auto-sync queued runs when online
		if (queueCount > 0 && navigator.onLine) {
			await handleSync();
		}
	});

	async function handleStart() {
		permissionError = '';
		saveState = 'idle';
		matchResult = null;
		sessionStopped = false;
		try {
			await tracker.start();
		} catch (err) {
			permissionError = err instanceof Error ? err.message : 'Failed to start tracking';
		}
	}

	async function handleStop() {
		await tracker.stop();
		sessionStopped = true;
	}

	async function handleSave() {
		saveState = 'saving';
		saveError = '';
		matchResult = null;
		try {
			const result = await tracker.saveRun();
			matchResult = result.match;
			savedRunId = result.run.id;
			wasQueued = result.queued ?? false;
			if (wasQueued) {
				queueCount = await tracker.getQueueCount();
			}
			saveState = 'saved';
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save run';
			saveState = 'error';
		}
	}

	function handleDiscard() {
		tracker.reset();
		saveState = 'idle';
		recoveredSession = false;
		sessionStopped = false;
	}

	async function handlePropose() {
		if (!proposeName.trim()) return;
		proposeState = 'submitting';
		proposeError = '';
		try {
			await api.post('/lines', {
				runId: savedRunId,
				name: proposeName.trim(),
				description: proposeDescription.trim() || undefined,
				type: proposeType,
				difficulty: proposeDifficulty,
				exposure: proposeExposure
			});
			proposeState = 'done';
		} catch (err) {
			proposeError = err instanceof Error ? err.message : 'Failed to submit line';
			proposeState = 'error';
		}
	}

	async function handleSync() {
		syncing = true;
		try {
			const result = await tracker.syncQueue();
			queueCount = await tracker.getQueueCount();
			if (result.synced > 0) {
				console.log(`[Sync] Uploaded ${result.synced} queued run(s)`);
			}
		} catch {
			// Sync failed silently
		} finally {
			syncing = false;
		}
	}

	function handleRequestPermission() {
		permissionError = '';
		tracker.requestPermissions().then((granted) => {
			if (!granted) {
				permissionError = 'Location permission denied. Please enable it in your device settings.';
			}
		});
	}

	// Whether we have a completed (unsaved) session to show
	const hasUnsavedSession = $derived(
		!tracker.isTracking &&
			(tracker.points.length > 0 || sessionStopped) &&
			saveState !== 'saved'
	);

	const canSave = $derived(tracker.points.length >= 10);

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
		<span class="w-10"></span>
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
	{#if recoveredSession && !tracker.isTracking && saveState === 'idle'}
		<div class="mx-4 mb-4 rounded-lg bg-blue-900/50 p-3">
			<p class="text-sm text-blue-200">
				Found an interrupted session with {tracker.points.length} points.
			</p>
			<div class="mt-2 flex gap-2">
				<button
					onclick={handleStart}
					class="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white"
				>
					Resume tracking
				</button>
				<button
					onclick={handleDiscard}
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

	<!-- Queued runs banner -->
	{#if queueCount > 0 && saveState !== 'saved'}
		<div class="mx-4 mb-4 rounded-lg bg-orange-900/50 p-3">
			<p class="text-sm text-orange-200">
				{queueCount} run{queueCount > 1 ? 's' : ''} waiting to upload
			</p>
			<button
				onclick={handleSync}
				disabled={syncing}
				class="mt-2 rounded bg-orange-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
			>
				{syncing ? 'Syncing...' : 'Sync now'}
			</button>
		</div>
	{/if}

	<!-- Saved success -->
	{#if saveState === 'saved'}
		<div class="mx-4 mb-4 rounded-lg {wasQueued ? 'bg-orange-900/50' : 'bg-green-900/50'} p-3">
			{#if wasQueued}
				<p class="text-sm text-orange-200">
					Run saved offline. It will upload when you're back online.
				</p>
			{:else if matchResult}
				<p class="text-lg font-bold text-green-100">
					You skied {matchResult.lineName}!
				</p>
				<p class="mt-1 text-sm text-green-300">
					{Math.round(matchResult.confidence * 100)}% confidence match
				</p>
			{:else}
				<p class="text-sm text-green-200">Run saved successfully!</p>
			{/if}
			<div class="mt-2 flex gap-2">
				{#if !wasQueued}
					<a
						href={savedRunId ? `/runs/${savedRunId}` : '/runs'}
						class="rounded bg-green-700 px-3 py-1 text-sm font-medium text-white"
					>
						View run
					</a>
				{/if}
				<button
					onclick={() => { saveState = 'idle'; matchResult = null; wasQueued = false; }}
					class="rounded bg-gray-700 px-3 py-1 text-sm font-medium text-gray-300"
				>
					New run
				</button>
			</div>
		</div>

		<!-- Propose new line (when saved with no match) -->
		{#if !matchResult && !wasQueued && savedRunId}
			{#if proposeState === 'done'}
				<div class="mx-4 mb-4 rounded-lg bg-blue-900/50 p-3">
					<p class="text-sm text-blue-200">
						Line proposed! It will be visible once approved.
					</p>
				</div>
			{:else if !showPropose}
				<div class="mx-4 mb-4">
					<button
						onclick={() => (showPropose = true)}
						class="w-full rounded-lg bg-gray-800 p-3 text-sm text-gray-300 active:bg-gray-700"
					>
						No matching line found. Propose a new one?
					</button>
				</div>
			{:else}
				<div class="mx-4 mb-4 rounded-lg bg-gray-900 p-4 space-y-3">
					<p class="text-sm font-medium text-gray-300">Propose a new line</p>

					{#if proposeState === 'error'}
						<p class="text-sm text-red-300">{proposeError}</p>
					{/if}

					<input
						type="text"
						bind:value={proposeName}
						placeholder="Line name (e.g. North Couloir)"
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
					/>

					<textarea
						bind:value={proposeDescription}
						placeholder="Description (optional)"
						rows="2"
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
					></textarea>

					<div class="grid grid-cols-3 gap-2">
						<div>
							<label for="propose-type" class="mb-1 block text-xs text-gray-500">Type</label>
							<select
								id="propose-type"
								bind:value={proposeType}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white"
							>
								<option value="couloir">Couloir</option>
								<option value="face">Face</option>
								<option value="bowl">Bowl</option>
								<option value="tree_run">Tree Run</option>
								<option value="ridge">Ridge</option>
							</select>
						</div>
						<div>
							<label for="propose-diff" class="mb-1 block text-xs text-gray-500">Difficulty</label>
							<select
								id="propose-diff"
								bind:value={proposeDifficulty}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white"
							>
								{#each [1, 2, 3, 4, 5] as d}
									<option value={d}>{d}/5</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="propose-exp" class="mb-1 block text-xs text-gray-500">Exposure</label>
							<select
								id="propose-exp"
								bind:value={proposeExposure}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white"
							>
								{#each ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as dir}
									<option value={dir}>{dir}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="flex gap-2">
						<button
							onclick={handlePropose}
							disabled={!proposeName.trim() || proposeState === 'submitting'}
							class="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white active:bg-blue-700 disabled:opacity-50"
						>
							{proposeState === 'submitting' ? 'Submitting...' : 'Submit'}
						</button>
						<button
							onclick={() => (showPropose = false)}
							class="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 active:bg-gray-700"
						>
							Cancel
						</button>
					</div>
				</div>
			{/if}
		{/if}
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

	<!-- Action buttons -->
	<div class="p-6 space-y-3">
		{#if saveState === 'error'}
			<div class="rounded-lg bg-red-900/50 p-3 text-center">
				<p class="text-sm text-red-200">{saveError}</p>
			</div>
		{/if}

		{#if tracker.isTracking}
			<button
				onclick={handleStop}
				class="w-full rounded-2xl bg-red-600 py-4 text-lg font-bold text-white active:bg-red-700"
			>
				Stop Tracking
			</button>
		{:else if hasUnsavedSession}
			{#if !canSave}
				<div class="rounded-lg bg-yellow-900/30 p-3 text-center">
					<p class="text-sm text-yellow-200">
						Not enough GPS points to save ({tracker.points.length}/10).
						{#if !tracker.isNative()}
							Indoor GPS accuracy is too low — try moving outdoors.
						{/if}
					</p>
				</div>
			{/if}
			<button
				onclick={handleSave}
				disabled={saveState === 'saving' || !canSave}
				class="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white active:bg-blue-700 disabled:opacity-50"
			>
				{saveState === 'saving' ? 'Saving...' : 'Save Run'}
			</button>
			<button
				onclick={handleDiscard}
				class="w-full rounded-2xl bg-gray-800 py-3 text-sm font-medium text-gray-400 active:bg-gray-700"
			>
				Discard
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
