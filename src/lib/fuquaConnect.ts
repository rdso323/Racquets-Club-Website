export interface FuquaConnectImportResult {
    title: string;
    dateISO: string;
    date: string;
    startTime: string;
    endTime: string;
    time: string;
    location: string;
    image: string;
    link: string;
    fuquaConnectEventId: number;
}

export const importFuquaConnectEvent = async (url: string): Promise<FuquaConnectImportResult> => {
    const response = await fetch('/api/fuqua-connect/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });

    const payload = (await response.json()) as FuquaConnectImportResult & { error?: string };
    if (!response.ok) {
        throw new Error(payload.error || 'Failed to import from Fuqua Connect.');
    }
    return payload;
};
