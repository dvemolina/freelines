<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';
	import type { Line } from '$lib/types';

	let pendingLines = $state<Line[]>([]);
	let approvedLines = $state<Line[]>([]);
	let rejectedLines = $state<Line[]>([]);
	let loading = $state(true);
	let error = $state('');
	let activeTab = $state<'pending' | 'approved' | 'rejected'>('pending');
	let actionInProgress = $state<string | null>(null);

	onMount(async () => {
		try {
			const check = await api.get<{ isAdmin: boolean }>('/admin/check');
			if (!check.isAdmin) {
				error = 'Admin access required';
				loading = false;
				return;
			}
			await loadAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load';
		} finally {
			loading = false;
		}
	});

	async function loadAll() {
		const [pending, approved, rejected] = await Promise.all([
			api.get<{ lines: Line[] }>('/admin/lines?status=pending'),
			api.get<{ lines: Line[] }>('/admin/lines?status=approved'),
			api.get<{ lines: Line[] }>('/admin/lines?status=rejected')
		]);
		pendingLines = pending.lines;
		approvedLines = approved.lines;
		rejectedLines = rejected.lines;
	}

	async function handleAction(lineId: string, action: 'approve' | 'reject') {
		actionInProgress = lineId;
		try {
			await api.patch(`/admin/lines/${lineId}`, { action });
			await loadAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Action failed';
		} finally {
			actionInProgress = null;
		}
	}

	const currentLines = $derived(
		activeTab === 'pending'
			? pendingLines
			: activeTab === 'approved'
				? approvedLines
				: rejectedLines
	);

	const typeLabels: Record<string, string> = {
		couloir: 'Couloir',
		face: 'Face',
		bowl: 'Bowl',
		tree_run: 'Tree Run',
		ridge: 'Ridge'
	};

	function difficultyLabel(d: number): string {
		return ['', 'Easy', 'Moderate', 'Challenging', 'Expert', 'Extreme'][d] ?? `${d}`;
	}

	function difficultyColor(d: number): string {
		return [
			'',
			'bg-green-900/50 text-green-300',
			'bg-blue-900/50 text-blue-300',
			'bg-yellow-900/50 text-yellow-300',
			'bg-orange-900/50 text-orange-300',
			'bg-red-900/50 text-red-300'
		][d] ?? 'bg-gray-800 text-gray-300';
	}

	function formatDistance(meters: number): string {
		if (meters < 1000) return `${meters} m`;
		return `${(meters / 1000).toFixed(1)} km`;
	}
</script>

<svelte:head>
	<title>Admin - Line Review - Freelines</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-950 text-white">
	<header class="flex items-center justify-center px-4 py-3">
		<h1 class="text-lg font-semibold">Line Review</h1>
	</header>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if error}
		<div class="mx-4 rounded-lg bg-red-900/50 p-3">
			<p class="text-sm text-red-200">{error}</p>
		</div>
	{:else}
		<!-- Tabs -->
		<div class="mx-4 mb-4 flex gap-1 rounded-xl bg-gray-900 p-1">
			<button
				class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors {activeTab ===
				'pending'
					? 'bg-gray-800 text-white'
					: 'text-gray-500'}"
				onclick={() => (activeTab = 'pending')}
			>
				Pending ({pendingLines.length})
			</button>
			<button
				class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors {activeTab ===
				'approved'
					? 'bg-gray-800 text-white'
					: 'text-gray-500'}"
				onclick={() => (activeTab = 'approved')}
			>
				Approved ({approvedLines.length})
			</button>
			<button
				class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors {activeTab ===
				'rejected'
					? 'bg-gray-800 text-white'
					: 'text-gray-500'}"
				onclick={() => (activeTab = 'rejected')}
			>
				Rejected ({rejectedLines.length})
			</button>
		</div>

		{#if currentLines.length === 0}
			<div class="flex flex-1 items-center justify-center">
				<p class="text-gray-500">No {activeTab} lines</p>
			</div>
		{:else}
			<div class="flex flex-col gap-3 px-4 pb-6">
				{#each currentLines as line (line.id)}
					<div class="rounded-xl bg-gray-900 p-4">
						<!-- Header -->
						<div class="mb-2 flex items-center justify-between">
							<h2 class="text-base font-semibold">{line.name}</h2>
							<div class="flex items-center gap-2">
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium {difficultyColor(
										line.difficulty
									)}"
								>
									{difficultyLabel(line.difficulty)}
								</span>
								<span class="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
									{typeLabels[line.type] ?? line.type}
								</span>
							</div>
						</div>

						{#if line.description}
							<p class="mb-2 text-sm text-gray-400">{line.description}</p>
						{/if}

						<!-- Location + stats -->
						<div class="mb-2 flex items-center gap-1 text-xs text-gray-500">
							{#if line.resort}
								<span>{line.resort}</span>
								<span>·</span>
							{/if}
							<span>{line.country}</span>
							<span>·</span>
							<span>{line.exposure}</span>
						</div>

						<div class="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
							<div>
								<p class="font-bold">{line.verticalDrop} m</p>
								<p class="text-xs text-gray-500">Vertical</p>
							</div>
							<div>
								<p class="font-bold">{formatDistance(line.distance)}</p>
								<p class="text-xs text-gray-500">Distance</p>
							</div>
							<div>
								<p class="font-bold">{line.startElevation} m</p>
								<p class="text-xs text-gray-500">Start Elev.</p>
							</div>
						</div>

						<!-- Actions -->
						{#if activeTab === 'pending'}
							<div class="flex gap-2">
								<button
									class="flex-1 rounded-lg bg-green-700 py-2 text-sm font-medium text-white active:bg-green-800 disabled:opacity-50"
									disabled={actionInProgress === line.id}
									onclick={() => handleAction(line.id, 'approve')}
								>
									{actionInProgress === line.id ? '...' : 'Approve'}
								</button>
								<button
									class="flex-1 rounded-lg bg-red-700 py-2 text-sm font-medium text-white active:bg-red-800 disabled:opacity-50"
									disabled={actionInProgress === line.id}
									onclick={() => handleAction(line.id, 'reject')}
								>
									{actionInProgress === line.id ? '...' : 'Reject'}
								</button>
							</div>
						{:else if activeTab === 'rejected'}
							<button
								class="w-full rounded-lg bg-gray-800 py-2 text-sm font-medium text-gray-300 active:bg-gray-700 disabled:opacity-50"
								disabled={actionInProgress === line.id}
								onclick={() => handleAction(line.id, 'approve')}
							>
								{actionInProgress === line.id ? '...' : 'Re-approve'}
							</button>
						{:else}
							<a
								href="/lines/{line.nameSlug}"
								class="block rounded-lg bg-gray-800 py-2 text-center text-sm font-medium text-gray-300 active:bg-gray-700"
							>
								View line
							</a>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
