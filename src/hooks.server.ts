import { sequence } from '@sveltejs/kit/hooks';
import { authHandle } from '$lib/server/auth';
import { visitanteHandle } from '$lib/server/visitante';

export const handle = sequence(authHandle, visitanteHandle);
