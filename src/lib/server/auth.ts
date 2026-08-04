import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Credentials from '@auth/sveltekit/providers/credentials';
import Google from '@auth/sveltekit/providers/google';
import { SvelteKitAuth } from '@auth/sveltekit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { conferir } from './senha';
import { accounts, sessions, users, verificationTokens } from './db/schema';

/**
 * Senha recusada não volta do `signIn` como redirect: o @auth/sveltekit deixa a
 * exceção do @auth/core subir, e sem filtrar isto a tela de login responde 500.
 * O `type` é o campo que todo AuthError carrega — checá-lo evita importar da
 * árvore interna do @auth/core e evita engolir erro de verdade.
 */
export function ehCredencialRecusada(erro: unknown): boolean {
	return (
		erro instanceof Error && 'type' in erro && (erro as { type?: string }).type === 'CredentialsSignin'
	);
}

export const { handle: authHandle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens
	}),
	/*
	 * Sessão em JWT, e não em banco, porque o provider Credentials do Auth.js só
	 * funciona assim: ele não passa pelo adapter e não teria linha de sessão pra
	 * criar. O adapter continua valendo pro Google — user e account seguem no
	 * banco; é só a tabela `session` que ficou ociosa.
	 */
	session: { strategy: 'jwt' },
	providers: [
		Google({
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET
		}),
		Credentials({
			credentials: { email: {}, senha: {} },
			/*
			 * Devolver null é a única resposta de fracasso: e-mail inexistente, conta
			 * sem senha e senha errada saem iguais daqui. Distinguir os casos
			 * entregaria de graça a lista de quem tem conta no Convidai.
			 */
			async authorize(credenciais) {
				const email = String(credenciais?.email ?? '')
					.trim()
					.toLowerCase();
				const senha = String(credenciais?.senha ?? '');
				if (!email || !senha) return null;

				const pessoa = db.select().from(users).where(eq(users.email, email)).get();
				if (!pessoa) return null;
				if (!(await conferir(senha, pessoa.senha))) return null;

				return { id: pessoa.id, name: pessoa.name, email: pessoa.email, image: pessoa.image };
			}
		})
	],
	callbacks: {
		/*
		 * `user` só chega na passada do login; nas seguintes o token já vem montado.
		 * Sem gravar o id aqui, `anfitriaoAtual` não o acha, toda guarda de rota
		 * conclui "não logado" e o login entra em loop de volta pro /entrar.
		 */
		jwt({ token, user }) {
			if (user) {
				token.sub = user.id;
				token.name = user.name;
				token.email = user.email;
				token.picture = user.image;
			}
			return token;
		},
		/*
		 * Monta a sessão do zero em vez de mutar a recebida: /auth/session é um
		 * endpoint público, e devolver o objeto inteiro entregaria pro JavaScript
		 * da página campos que só o cookie httpOnly deveria carregar.
		 */
		session({ session, token }) {
			return {
				expires: session.expires,
				user: {
					id: token.sub as string,
					name: token.name ?? null,
					email: token.email ?? '',
					image: token.picture ?? null
				}
			};
		}
	},
	pages: { signIn: '/entrar' },
	trustHost: true
});
