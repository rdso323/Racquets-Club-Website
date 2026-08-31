import { fetchFuquaConnectImport } from './fuquaConnectParser';

interface Env {
    ASSETS: { fetch: typeof fetch };
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });

const handleFuquaConnectImport = async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    let body: { url?: string };
    try {
        body = (await request.json()) as { url?: string };
    } catch {
        return json({ error: 'Invalid JSON body.' }, 400);
    }

    const rawUrl = body.url?.trim();
    if (!rawUrl) {
        return json({ error: 'Missing url in request body.' }, 400);
    }

    try {
        const payload = await fetchFuquaConnectImport(rawUrl);
        return json(payload);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to import Fuqua Connect event.';
        return json({ error: message }, 422);
    }
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const { pathname } = new URL(request.url);

        if (pathname === '/api/fuqua-connect/import') {
            return handleFuquaConnectImport(request);
        }

        return env.ASSETS.fetch(request);
    },
} satisfies ExportedHandler<Env>;
