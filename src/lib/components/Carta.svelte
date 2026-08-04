<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = { children: Snippet; classe?: string };
	let { children, classe = '' }: Props = $props();
</script>

<div
	class="rounded-[var(--radius-carta)] border border-linha bg-papel shadow-[var(--shadow-carta)] {classe}"
>
	{@render children()}
</div>
