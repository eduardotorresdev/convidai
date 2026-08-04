// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			/** Id do navegador atual. Sempre presente — o hook cria se faltar. */
			visitanteId: string;
			/** Injetado pelo @auth/sveltekit. Retorna null pra quem não é Anfitrião logado. */
			auth(): Promise<import('@auth/sveltekit').Session | null>;
		}
	}
}

export {};
