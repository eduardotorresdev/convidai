<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = { aberto: boolean; titulo: string; aoFechar: () => void; children: Snippet };
	let { aberto = $bindable(), titulo, aoFechar, children }: Props = $props();

	let dialogo = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialogo) return;
		if (aberto && !dialogo.open) dialogo.showModal();
		if (!aberto && dialogo.open) dialogo.close();
	});
</script>

<!--
  <dialog> nativo: foco preso, Esc e inerte no resto da página vêm de graça.
  No mobile ele entra por baixo, como uma folha — é onde o polegar já está.
-->
<dialog
	bind:this={dialogo}
	onclose={aoFechar}
	onclick={(e) => e.target === dialogo && aoFechar()}
	class="m-0 mt-auto w-full max-w-md rounded-t-[var(--radius-carta)] bg-papel p-0 text-tinta
	       shadow-[var(--shadow-flutuante)] backdrop:bg-tinta/40
	       sm:m-auto sm:rounded-[var(--radius-carta)]"
>
	<div class="flex flex-col gap-5 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
		<div class="flex items-start justify-between gap-4">
			<h2 class="text-xl">{titulo}</h2>
			<button
				type="button"
				onclick={aoFechar}
				aria-label="Fechar"
				class="-mt-1 -mr-1 flex size-9 items-center justify-center rounded-full text-suave hover:bg-creme"
			>
				&times;
			</button>
		</div>
		{@render children()}
	</div>
</dialog>
