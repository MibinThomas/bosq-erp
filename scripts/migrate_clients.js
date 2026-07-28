const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputCsvPath = path.join(__dirname, '..', 'public', 'olddata', 'UPDATED_Manual Quotation Tracker - 27-07-2026.csv');
const outputCsvPath = path.join(__dirname, '..', 'public', 'olddata', 'Cleaned_Client_Data.csv');
const templateCsvPath = path.join(__dirname, '..', 'public', 'olddata', 'ERP_Client_Bulk_Upload_Template.csv');

// Helper to normalize client names for duplicate checking (Fuzzy matching)
function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '') // remove special characters & spaces
        .replace(/(llc|l\.l\.c|co\.|trading|general|furniture|industries|company|ltd|limited)/g, '');
}

async function processCsv() {
    console.log('Reading:', inputCsvPath);
    if (!fs.existsSync(inputCsvPath)) {
        console.error('File not found. Please ensure the CSV is at public/olddata/UPDATED_Manual Quotation Tracker - 27-07-2026.csv');
        process.exit(1);
    }
    
    const fileStream = fs.createReadStream(inputCsvPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const headers = ['Client Name', 'Client Code', 'Category', 'Contact Person', 'Phone', 'Email', 'Price Category', 'Duplicate Warning'];
    
    // Create template
    fs.writeFileSync(templateCsvPath, headers.map(h => `"${h}"`).join(',') + '\n', 'utf8');

    let isFirstLine = true;
    let dataRows = [];
    let seenNormalizedNames = new Map(); // normalizedName -> original Name
    let originalCodeRegex = /^\d+$/; // To check if it's just a number

    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false;
            continue;
        }

        // Split by comma ignoring commas inside quotes
        let columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (columns.length < 9) continue;
        
        let clientName = columns[1].trim().replace(/^"|"$/g, '');
        if (!clientName) continue;

        let originalCode = columns[2].trim().replace(/^"|"$/g, '');
        let clientCategory = columns[3].trim().toUpperCase().replace(/^"|"$/g, '');
        let contactPerson = columns[4].trim().replace(/^"|"$/g, '');
        let phone = columns[5].trim().replace(/^"|"$/g, '');
        let email = columns[6].trim().replace(/^"|"$/g, '');

        // 1. Map Price Category based on Client Category
        let priceCategory = '';
        let prefix = 'CL'; // default fallback prefix
        if (clientCategory === 'DEALER') {
            priceCategory = 'D PRICE';
            prefix = 'D';
        } else if (clientCategory === 'PROJECT') {
            priceCategory = 'P PRICE';
            prefix = 'P';
        } else if (clientCategory === 'INTERIOR') {
            priceCategory = 'I PRICE';
            prefix = 'I';
        } else {
            // Default if unknown
            clientCategory = 'PROJECT'; 
            priceCategory = 'P PRICE';
            prefix = 'P';
        }

        // 2. Format Client Code (e.g., D-0001)
        let numericCode = originalCode.replace(/\D/g, '');
        if (numericCode) {
            numericCode = numericCode.padStart(4, '0');
        } else {
            numericCode = '0000';
        }
        let newClientCode = `${prefix}-${numericCode}`;

        // 3. Clean fields
        if (phone === '#N/A' || phone === '0' || !phone) phone = '';
        if (email === '#N/A' || email === '0' || !email) email = '';

        // 4. Fuzzy Matching (Normalized string matching)
        let normName = normalizeName(clientName);
        let duplicateWarning = '';
        if (normName.length > 3) {
            if (seenNormalizedNames.has(normName)) {
                duplicateWarning = `POTENTIAL DUPLICATE OF: ${seenNormalizedNames.get(normName)}`;
            } else {
                seenNormalizedNames.set(normName, clientName);
            }
        }

        // Helper to safely quote fields
        const safe = (str) => `"${str.replace(/"/g, '""')}"`;

        dataRows.push([
            safe(clientName),
            safe(newClientCode),
            safe(clientCategory),
            safe(contactPerson),
            safe(phone),
            safe(email),
            safe(priceCategory),
            safe(duplicateWarning)
        ].join(','));
    }

    // Write processed data
    const outputContent = headers.map(h => `"${h}"`).join(',') + '\n' + dataRows.join('\n');
    fs.writeFileSync(outputCsvPath, outputContent, 'utf8');

    console.log(`Successfully processed ${dataRows.length} client records.`);
    console.log(`Cleaned data with new client codes & deduplication warnings saved to:\n -> ${outputCsvPath}`);
    console.log(`New Bulk Upload Template saved to:\n -> ${templateCsvPath}`);
}

processCsv().catch(console.error);
