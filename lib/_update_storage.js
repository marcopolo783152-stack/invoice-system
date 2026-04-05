const fs = require('fs');
const path = require('path');

const libDir = __dirname;
const files = fs.readdirSync(libDir).filter(f => f.endsWith('-storage.ts') || f === 'service-tracking.ts' || f === 'firebase-storage.ts');

files.forEach(file => {
    if (file === 'user-storage.ts' || file === 'invoice-storage.ts') return; // already done

    let content = fs.readFileSync(path.join(libDir, file), 'utf8');
    let changed = false;

    // Add import if needed
    if (!content.includes("import { getStorePrefix }")) {
        content = "import { getStorePrefix } from './user-storage';\n" + content;
        changed = true;
    }

    // Replace const COLLECTION_NAME = '...'
    const colRegex = /const\s+COLLECTION_NAME\s*=\s*['"]([^'"]+)['"];/g;
    if (colRegex.test(content)) {
        content = content.replace(colRegex, "const getCollectionName = () => getStorePrefix() + '$1';");
        // Also replace usages of COLLECTION_NAME with getCollectionName()
        content = content.replace(/\bCOLLECTION_NAME\b/g, "getCollectionName()");
        changed = true;
    }

    // Replace DELETED_COLLECTION_NAME
    const delRegex = /const\s+DELETED_COLLECTION_NAME\s*=\s*['"]([^'"]+)['"];/g;
    if (delRegex.test(content)) {
        content = content.replace(delRegex, "const getDeletedCollectionName = () => getStorePrefix() + '$1';");
        content = content.replace(/\bDELETED_COLLECTION_NAME\b/g, "getDeletedCollectionName()");
        changed = true;
    }

    // Replace LOCAL_STORAGE_KEY
    const locRegex = /const\s+LOCAL_STORAGE_KEY\s*=\s*['"]([^'"]+)['"];/g;
    if (locRegex.test(content)) {
        content = content.replace(locRegex, "const getLocalStorageKey = () => getStorePrefix() + '$1';");
        content = content.replace(/\bLOCAL_STORAGE_KEY\b/g, "getLocalStorageKey()");
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(path.join(libDir, file), content, 'utf8');
        console.log('Updated ' + file);
    }
});
