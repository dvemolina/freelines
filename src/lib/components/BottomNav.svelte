<script lang="ts">
	import { page } from '$app/state';

	const path = $derived(page.url.pathname);

	function active(prefix: string): boolean {
		if (prefix === '/') return path === '/';
		return path.startsWith(prefix);
	}

	function cls(prefix: string): string {
		return active(prefix)
			? 'flex flex-col items-center gap-0.5 text-white'
			: 'flex flex-col items-center gap-0.5 text-gray-500';
	}
</script>

<nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-950">
	<div class="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
		<!-- Track -->
		<a href="/track" class={cls('/track')} aria-label="Track">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.75"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 21c0 0-7-6.75-7-12a7 7 0 1 1 14 0c0 5.25-7 12-7 12z"
				/>
				<circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none" />
			</svg>
			<span class="text-xs leading-none">Track</span>
		</a>

		<!-- Runs -->
		<a href="/runs" class={cls('/runs')} aria-label="Runs">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.75"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
				/>
				<rect x="9" y="3" width="6" height="4" rx="1" stroke-linecap="round" stroke-linejoin="round" />
				<path stroke-linecap="round" d="M9 12h6M9 16h4" />
			</svg>
			<span class="text-xs leading-none">Runs</span>
		</a>

		<!-- Lines -->
		<a href="/lines" class={cls('/lines')} aria-label="Lines">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.75"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3 6l6 3 6-3 6 3M3 12l6 3 6-3 6 3M3 18l6 3 6-3 6 3"
				/>
			</svg>
			<span class="text-xs leading-none">Lines</span>
		</a>

		<!-- Profile -->
		<a href="/profile" class={cls('/profile')} aria-label="Profile">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.75"
			>
				<circle cx="12" cy="8" r="4" stroke-linecap="round" stroke-linejoin="round" />
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
				/>
			</svg>
			<span class="text-xs leading-none">Profile</span>
		</a>
	</div>
</nav>
