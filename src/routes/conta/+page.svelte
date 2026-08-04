<script lang="ts">
	import Botao from '$lib/components/Botao.svelte';
	import Campo from '$lib/components/Campo.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const entrada =
		'min-h-12 w-full rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4 text-tinta placeholder:text-suave/70';

	const titulo = $derived(data.temSenha ? 'Trocar senha' : 'Criar senha');
</script>

<svelte:head>
	<title>{titulo} · Convidai</title>
</svelte:head>

<header class="flex flex-col gap-2 pt-6 pb-6">
	<a
		href="/visualizar"
		class="inline-flex min-h-12 items-center text-sm text-suave hover:text-terracota"
	>
		&larr; Meus convites
	</a>
	<h1 class="text-3xl">{titulo}</h1>
	<p class="text-sm text-suave">{data.anfitriao.email}</p>
</header>

{#if !data.temSenha}
	<p class="pb-6 text-sm text-suave">
		Sua conta entra pelo Google. Com uma senha, você também passa a entrar por e-mail.
	</p>
{/if}

<form method="POST" action="?/salvar" class="flex flex-col gap-5 pb-12">
	{#if data.temSenha}
		<Campo rotulo="Senha atual" para="atual">
			<input
				id="atual"
				name="atual"
				type="password"
				required
				autocomplete="current-password"
				class={entrada}
			/>
		</Campo>
	{/if}

	<Campo
		rotulo="Nova senha"
		para="nova"
		dica="Pelo menos {data.minimo} caracteres."
		erro={form?.erro}
	>
		<input
			id="nova"
			name="nova"
			type="password"
			required
			minlength={data.minimo}
			autocomplete="new-password"
			class={entrada}
		/>
	</Campo>

	<Campo rotulo="Repetir a nova senha" para="repetida">
		<input
			id="repetida"
			name="repetida"
			type="password"
			required
			minlength={data.minimo}
			autocomplete="new-password"
			class={entrada}
		/>
	</Campo>

	{#if form?.salvo}
		<p role="status" class="text-sm font-medium text-sim">Senha salva.</p>
	{/if}

	<Botao type="submit" largo>Salvar senha</Botao>
</form>
