import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Google from '@auth/sveltekit/providers/google';
import { SvelteKitAuth } from '@auth/sveltekit';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { accounts, sessions, users, verificationTokens } from './db/schema';

export const { handle: authHandle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens
	}),
	providers: [
		Google({
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET
		})
	],
	callbacks: {
		/*
		 * Com sessão em banco, o Auth.js NÃO devolve `user.id` na sessão por padrão —
		 * só name/email/image. Sem isto, `anfitriaoAtual` não acha o id, toda guarda
		 * de rota conclui "não logado" e o login entra em loop de volta pro /entrar
		 * com a sessão já criada no banco.
		 */
		session({ session, user }) {
			/*
			 * Monta a sessão do zero em vez de mutar a recebida: a sessão do adapter
			 * carrega o sessionToken, e /auth/session é um endpoint público — devolver
			 * o objeto inteiro entregaria o token pro JavaScript da página, anulando o
			 * httpOnly do cookie.
			 */
			return {
				expires: session.expires,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image
				}
			};
		}
	},
	pages: { signIn: '/entrar' },
	trustHost: true
});
