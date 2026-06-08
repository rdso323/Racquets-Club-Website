import fs from 'fs';
import path from 'path';
import os from 'os';

// 1. Read token from the Firebase CLI config
const homeDir = os.homedir();
const configPath = path.join(homeDir, '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(configPath)) {
    console.error("Firebase CLI config not found at", configPath);
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.tokens?.access_token;
if (!token) {
    console.error("No access token found in firebase-tools.json. Please run 'npx firebase-tools login'.");
    process.exit(1);
}

// 2. Read input data from the local JSON file
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

const projectId = 'fuqua-racquets-club';
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
async function writeDoc(docPath, fields, updateFields = null) {
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
    console.log("Updating live ticker text...");
    const tickerFields = toFirestoreFields({ text: tickerText });
    await writeDoc('settings/ticker', tickerFields, ['text']);
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
        
        await writeDoc(`news/${docId}`, newsFields);
        console.log(`Updated news slot ${docId}: ${item.title}`);
    }

    console.log("All updates written successfully to Firestore!");
    process.exit(0);
}

main().catch(err => {
    console.error("Error updating Firestore:", err);
    process.exit(1);
});
