const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const outputFilePath = path.join('C:\\Users\\GetYo\\.gemini\\antigravity\\brain\\5fbf37ee-22cd-460e-a465-68ad50304ddd', 'full_project_context.md');

// Files/Dirs to exclude
const excludes = [
    'node_modules',
    '.git',
    '.next',
    '.vscode',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.DS_Store',
    'public', // Exclude public assets to save space, usually binary or large
    'dist',
    'build',
    '.gemini'
];

// Extensions to include (text files)
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.md', '.sql', '.html', '.mjs'];

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!excludes.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            const ext = path.extname(file);
            if (extensions.includes(ext) && !excludes.includes(file)) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

// Specific files in root to include provided they exist
const rootFilesToInclude = [
    'package.json',
    'tsconfig.json',
    'next.config.ts',
    'next.config.js',
    'tailwind.config.ts',
    'tailwind.config.js',
    '.env.example',
    'postcss.config.mjs',
    'middleware.ts',
    'README.md'
];

let content = '# Full Project Context\n\n';
content += `Generated on: ${new Date().toISOString()}\n\n`;

// Process specific root files
rootFilesToInclude.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`Adding ${file}...`);
        content += `## File: ${file}\n\`\`\`${path.extname(file).substring(1) || 'text'}\n`;
        content += fs.readFileSync(filePath, 'utf8');
        content += '\n\`\`\`\n\n';
    }
});

// Process directories: src, supabase
const dirsToScan = ['src', 'supabase'];

dirsToScan.forEach(dirName => {
    const dirPath = path.join(rootDir, dirName);
    if (fs.existsSync(dirPath)) {
        console.log(`Scanning ${dirName}...`);
        const files = getAllFiles(dirPath);
        files.forEach(filePath => {
            const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
            console.log(`Adding ${relativePath}...`);
            content += `## File: ${relativePath}\n\`\`\`${path.extname(filePath).substring(1) || 'text'}\n`;
            content += fs.readFileSync(filePath, 'utf8');
            content += '\n\`\`\`\n\n';
        });
    }
});

fs.writeFileSync(outputFilePath, content);
console.log(`Successfully wrote to ${outputFilePath}`);
