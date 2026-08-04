<script lang="ts">
	import Botao from '$lib/components/Botao.svelte';
	import Campo from '$lib/components/Campo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const entrada =
		'min-h-12 w-full rounded-[var(--radius-controle)] border border-linha-forte bg-papel px-4 text-tinta placeholder:text-suave/70';
</script>

<svelte:head>
	<title>Entrar — Convidai</title>
	<meta name="description" content="Entre na sua conta para criar convites no Convidai." />
</svelte:head>

<main class="flex flex-1 flex-col justify-center gap-8 py-16">
	<div class="flex flex-col items-center gap-3 text-center">
		<a href="/" class="font-display text-2xl font-semibold tracking-tight">convidai</a>
		<h1 class="text-2xl">Faça seu convite e saiba quem vai</h1>
	</div>

	<form method="POST" class="flex flex-col gap-5">
		<!-- A action do @auth/sveltekit lê o provedor e o retorno destes dois campos do form. -->
		<input type="hidden" name="providerId" value="credentials" />
		<input type="hidden" name="redirectTo" value={data.destino} />

		<Campo rotulo="E-mail" para="email" erro={data.erro ?? undefined}>
			<input
				id="email"
				name="email"
				type="email"
				required
				autocomplete="email"
				placeholder="voce@exemplo.com"
				class={entrada}
			/>
		</Campo>

		<Campo rotulo="Senha" para="senha">
			<input
				id="senha"
				name="senha"
				type="password"
				required
				autocomplete="current-password"
				class={entrada}
			/>
		</Campo>

		<Botao type="submit" largo>Entrar</Botao>
	</form>

	<p class="text-center text-sm text-suave">
		Não tem conta?
		<a
			href="/cadastrar?destino={encodeURIComponent(data.destino)}"
			class="underline underline-offset-2 hover:text-terracota">Criar uma</a
		>
	</p>

	<div class="flex items-center gap-3">
		<span class="h-px flex-1 bg-linha"></span>
		<span class="text-xs text-suave">ou</span>
		<span class="h-px flex-1 bg-linha"></span>
	</div>

	<form method="POST" class="flex flex-col gap-4">
		<input type="hidden" name="providerId" value="google" />
		<input type="hidden" name="redirectTo" value={data.destino} />
		<Botao type="submit" tom="secundario" largo>
			<svg viewBox="0 0 48 48" class="size-5" aria-hidden="true" focusable="false">
				<path
					fill="#EA4335"
					d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
				/>
				<path
					fill="#4285F4"
					d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
				/>
				<path
					fill="#FBBC05"
					d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z"
				/>
				<path
					fill="#34A853"
					d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
				/>
			</svg>
			Entrar com Google
		</Botao>
	</form>

	<p class="text-center text-xs text-suave">
		Usamos só seu nome e seu e-mail, pra identificar os convites que são seus.
	</p>
</main>
