const fs = require('fs');
const path = require('path');

// This script injects environment variables into .env.production during build
// Usage: node scripts/inject-env.js

const envPath = path.join(process.cwd(), '.env.production');

// List of critical variables to capture
const criticalVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ADMIN_EMAILS'
];

let envContent = '';

console.log('Injecting environment variables...');

criticalVars.forEach(key => {
    const value = process.env[key];
    if (value) {
        console.log(`✅ Found variable: ${key}`);
        envContent += `${key}=${value}\n`;
    } else {
        console.warn(`⚠️ Warning: Variable ${key} is missing in build environment`);
    }
});

if (envContent) {
    fs.writeFileSync(envPath, envContent);
    console.log(`Successfully wrote .env.production with ${criticalVars.length} variables`);
} else {
    console.warn('No variables found to inject!');
}
