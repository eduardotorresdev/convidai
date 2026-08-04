<script lang="ts">
	import Botao from '$lib/components/Botao.svelte';
	import Campo from '$lib/components/Campo.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const entrada =
		'min-h-12 w-full rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4 text-tinta placeholder:text-suave/70';
</script>

<svelte:head>
	<title>Criar conta — Convidai</title>
	<meta name="description" content="Crie sua conta no Convidai com e-mail e senha." />
</svelte:head>

<main class="flex flex-1 flex-col justify-center gap-8 py-16">
	<div class="flex flex-col items-center gap-3 text-center">
		<a href="/" class="font-display text-2xl font-semibold tracking-tight">convidai</a>
		<h1 class="text-2xl">Criar sua conta</h1>
	</div>

	<form method="POST" class="flex flex-col gap-5">
		<!-- A action cria a conta e repassa este mesmo form pro signIn do Auth.js. -->
		<input type="hidden" name="providerId" value="credentials" />
		<input type="hidden" name="redirectTo" value={data.destino} />

		<Campo rotulo="E-mail" para="email" erro={form?.erro}>
			<input
				id="email"
				name="email"
				type="email"
				required
				autocomplete="email"
				value={form?.email ?? ''}
				placeholder="voce@exemplo.com"
				class={entrada}
			/>
		</Campo>

		<Campo rotulo="Senha" para="senha" dica="Pelo menos {data.minimo} caracteres.">
			<input
				id="senha"
				name="senha"
				type="password"
				required
				minlength={data.minimo}
				autocomplete="new-password"
				class={entrada}
			/>
		</Campo>

		<Campo rotulo="Repetir a senha" para="repetida">
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

		<Botao type="submit" largo>Criar conta</Botao>
	</form>

	<p class="text-center text-sm text-suave">
		Já tem conta?
		<a
			href="/entrar?destino={encodeURIComponent(data.destino)}"
			class="underline underline-offset-2 hover:text-terracota">Entrar</a
		>
	</p>
</main>
