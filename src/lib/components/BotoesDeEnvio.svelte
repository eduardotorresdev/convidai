<script lang="ts">
	import Botao from './Botao.svelte';
	import ConvidarModal from './ConvidarModal.svelte';
	import { caminhoDoConvite } from '$lib/ids';

	type Props = { hash: string; slug: string; titulo: string; origem: string };
	let { hash, slug, titulo, origem }: Props = $props();

	let convidando = $state(false);
	let recado = $state('');

	const linkAberto = $derived(`${origem}${caminhoDoConvite(hash, slug)}`);

	function compartilhar() {
		if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
			navigator.share({ title: titulo, text: titulo, url: linkAberto }).catch(() => {});
			return;
		}
		navigator.clipboard
			?.writeText(linkAberto)
			.then(() => (recado = 'Link aberto copiado.'))
			.catch(() => (recado = 'Não deu pra copiar. Selecione o endereço acima e copie na mão.'));
	}
</script>

<div class="flex flex-col gap-3">
	<Botao tom="accent" largo type="button" onclick={() => (convidando = true)}>Convidar</Botao>

	<div class="flex flex-col">
		<Botao tom="secundario" largo type="button" onclick={compartilhar}>Compartilhar</Botao>

		<div
			role="note"
			class="relative mt-3 rounded-[var(--radius-controle)] bg-terracota-fraca px-4 py-3
			       text-xs leading-relaxed text-tinta"
		>
			<span
				aria-hidden="true"
				class="absolute -top-1 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-terracota-fraca"
			></span>
			<strong class="font-semibold">O link aberto não identifica ninguém.</strong>
			Quem responder por ele entra na sua lista como anônimo, e você nunca saberá quem foi. Para saber
			quem confirmou, use <strong class="font-semibold">Convidar</strong> e mande um link por pessoa.
		</div>
	</div>

	<p aria-live="polite" class="text-sm text-suave">{recado}</p>
</div>

<ConvidarModal
	bind:aberto={convidando}
	{hash}
	{slug}
	{titulo}
	{origem}
	aoFechar={() => (convidando = false)}
/>
