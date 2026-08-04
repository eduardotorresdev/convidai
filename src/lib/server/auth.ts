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
	pages: { signIn: '/entrar' },
	trustHost: true
});
