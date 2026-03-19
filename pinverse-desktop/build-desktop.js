/**
 * Build script for PinVerse Desktop
 * 
 * This script:
 * 1. Builds the Next.js app in standalone mode
 * 2. Copies the standalone output to the Electron folder
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PLATFORM_DIR = path.join(__dirname, '..', 'pinverse-platform (sass)');
const STANDALONE_SRC = path.join(PLATFORM_DIR, '.next', 'standalone');
const STANDALONE_DEST = path.join(__dirname, 'standalone');
const STATIC_SRC = path.join(PLATFORM_DIR, '.next', 'static');
const PUBLIC_SRC = path.join(PLATFORM_DIR, 'public');

console.log('🔨 Building PinVerse Desktop...\n');

// Step 1: Build Next.js
console.log('📦 Step 1: Building Next.js in standalone mode...');
try {
    execSync('npm run build', {
        cwd: PLATFORM_DIR,
        stdio: 'inherit'
    });
    console.log('✅ Next.js build complete!\n');
} catch (error) {
    console.error('❌ Next.js build failed!');
    process.exit(1);
}

// Step 2: Copy standalone output
console.log('📁 Step 2: Copying standalone output...');
try {
    // Remove old standalone folder
    if (fs.existsSync(STANDALONE_DEST)) {
        fs.rmSync(STANDALONE_DEST, { recursive: true });
    }

    // Copy new standalone folder
    copyRecursive(STANDALONE_SRC, STANDALONE_DEST);

    // Copy static files
    const staticDest = path.join(STANDALONE_DEST, '.next', 'static');
    fs.mkdirSync(staticDest, { recursive: true });
    copyRecursive(STATIC_SRC, staticDest);

    // Copy public files
    const publicDest = path.join(STANDALONE_DEST, 'public');
    fs.mkdirSync(publicDest, { recursive: true });
    copyRecursive(PUBLIC_SRC, publicDest);

    console.log('✅ Standalone output copied!\n');
} catch (error) {
    console.error('❌ Failed to copy standalone output:', error);
    process.exit(1);
}

// Step 3: Copy environment file
console.log('📝 Step 3: Copying environment configuration...');
try {
    const envSrc = path.join(PLATFORM_DIR, '.env.local');
    const envDest = path.join(STANDALONE_DEST, '.env.local');

    if (fs.existsSync(envSrc)) {
        fs.copyFileSync(envSrc, envDest);
        console.log('✅ Environment file copied!\n');
    } else {
        console.log('⚠️ No .env.local file found. You may need to create one.\n');
    }
} catch (error) {
    console.error('⚠️ Failed to copy .env.local:', error);
}

console.log('🎉 Desktop build preparation complete!');
console.log('   Run "npm run build" to create the Windows installer.\n');

// Helper function to copy directories recursively
function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`Warning: Source does not exist: ${src}`);
        return;
    }

    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        const files = fs.readdirSync(src);
        for (const file of files) {
            copyRecursive(path.join(src, file), path.join(dest, file));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}
