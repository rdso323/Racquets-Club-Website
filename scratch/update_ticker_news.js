import fs from 'fs';
import path from 'path';
import os from 'os';

async function getAccessToken() {
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.config', 'configstore', 'firebase-tools.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const cliToken = config.tokens?.access_token;
        if (cliToken) {
            console.log('Using Firebase CLI access token.');
            return cliToken;
        }
    }

    const email = process.env['Admin Email'];
    const password = process.env['Admin Password'];
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!email || !password || !apiKey) {
        throw new Error(
            'No Firebase credentials found. Log in via firebase-tools or set Admin Email, Admin Password, and VITE_FIREBASE_API_KEY.',
        );
    }

    console.log('Signing in via Firebase Auth REST API...');
    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
    );
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Firebase sign-in failed (${response.status}): ${errText}`);
    }

    const { idToken } = await response.json();
    if (!idToken) {
        throw new Error('Firebase sign-in succeeded but no idToken was returned.');
    }

    return idToken;
}

// Read input data from the local JSON file
const dataPath = 'scratch/ticker_news_data.json';
if (!fs.existsSync(dataPath)) {
    console.error(`No update data found in ${dataPath}`);
    process.exit(1);
}

const rawData = fs.readFileSync(dataPath, 'utf8');
const updateData = JSON.parse(rawData);
const { tickerText, newsItems } = updateData;

if (!tickerText || !Array.isArray(newsItems)) {
    console.error(`Invalid data format in ${dataPath}`);
    process.exit(1);
}

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
    console.error('VITE_FIREBASE_PROJECT_ID is not set.');
    process.exit(1);
}
const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

// Helper to convert JS object to Firestore REST document field structure
function toFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            fields[key] = { stringValue: value };
        } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                fields[key] = { integerValue: value.toString() };
            } else {
                fields[key] = { doubleValue: value };
            }
        } else if (typeof value === 'boolean') {
            fields[key] = { booleanValue: value };
        } else if (value === null) {
            fields[key] = { nullValue: null };
        } else if (Array.isArray(value)) {
            fields[key] = {
                arrayValue: {
                    values: value.map(v => {
                        if (typeof v === 'string') return { stringValue: v };
                        return { stringValue: String(v) };
                    })
                }
            };
        } else if (typeof value === 'object') {
            fields[key] = {
                mapValue: {
                    fields: toFirestoreFields(value)
                }
            };
        }
    }
    return fields;
}

// Helper to write a document using REST API (PATCH creates if not exists)
async function writeDoc(token, docPath, fields, updateFields = null) {
    let url = `${firestoreBaseUrl}/${docPath}`;
    if (updateFields && updateFields.length > 0) {
        const queryParams = updateFields.map(f => `updateMask.fieldPaths=${f}`).join('&');
        url += `?${queryParams}`;
    }
    
    console.log(`Writing to ${docPath}...`);
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to write to ${docPath}: ${response.statusText} (${response.status}) - ${errText}`);
    }
}

async function main() {
    const token = await getAccessToken();

    console.log("Updating live ticker text...");
    const tickerFields = toFirestoreFields({ text: tickerText });
    await writeDoc(token, 'settings/ticker', tickerFields, ['text']);
    console.log("Ticker updated successfully!");

    console.log("Updating news items...");
    for (let i = 0; i < newsItems.length; i++) {
        const item = newsItems[i];
        const docId = `news-${i + 1}`;
        const newsFields = toFirestoreFields({
            title: item.title,
            excerpt: item.excerpt,
            date: item.date || 'Today',
            category: item.category,
            link: item.link
        });
        
        await writeDoc(token, `news/${docId}`, newsFields);
        console.log(`Updated news slot ${docId}: ${item.title}`);
    }

    console.log("All updates written successfully to Firestore!");
    process.exit(0);
}

main().catch(err => {
    console.error("Error updating Firestore:", err);
    process.exit(1);
});
