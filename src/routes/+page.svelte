<svelte:head>
	<title>Freelines</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
	<h1 class="mb-2 text-4xl font-bold">Freelines</h1>
	<p class="mb-8 text-gray-400">Track your freeride ski lines</p>
	<div class="flex flex-col gap-3">
		<a
			href="/track"
			class="rounded-2xl bg-green-600 px-8 py-4 text-center text-lg font-bold text-white active:bg-green-700"
		>
			Start Tracking
		</a>
		<a
			href="/runs"
			class="rounded-2xl bg-gray-800 px-8 py-4 text-center text-lg font-bold text-white active:bg-gray-700"
		>
			My Runs
		</a>
	</div>
</div>
