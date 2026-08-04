<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[env(safe-area-inset-bottom)]">
	{@render children()}
</div>
