const { app, BrowserWindow, Menu, shell, Tray, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const PORT = 3456; // Use a different port to avoid conflicts
const LOCAL_URL = `http://localhost:${PORT}`;

// Detect if running in development mode
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let tray;
let nextServer;

// Get the path to the Next.js standalone server
function getNextServerPath() {
    if (isDev) {
        // In development, use the platform folder
        return path.join(__dirname, '..', 'pinverse-platform (sass)');
    } else {
        // In production, the standalone build is bundled with the app
        return path.join(process.resourcesPath, 'app', 'standalone');
    }
}

// Start the embedded Next.js server
function startNextServer() {
    return new Promise((resolve, reject) => {
        const serverPath = getNextServerPath();

        if (isDev) {
            // In dev mode, assume the dev server is already running
            console.log('Development mode: Using external dev server');
            resolve();
            return;
        }

        // Start the standalone Next.js server
        const serverScript = path.join(serverPath, 'server.js');
        console.log(`Starting Next.js server from: ${serverScript}`);

        nextServer = spawn('node', [serverScript], {
            cwd: serverPath,
            env: {
                ...process.env,
                PORT: PORT.toString(),
                HOSTNAME: '127.0.0.1'
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        nextServer.stdout.on('data', (data) => {
            console.log(`Next.js: ${data}`);
            if (data.toString().includes('Ready') || data.toString().includes('started')) {
                resolve();
            }
        });

        nextServer.stderr.on('data', (data) => {
            console.error(`Next.js Error: ${data}`);
        });

        nextServer.on('error', (err) => {
            console.error('Failed to start Next.js server:', err);
            reject(err);
        });

        // Give the server time to start
        setTimeout(resolve, 3000);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        title: 'PinVerse',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'default',
        backgroundColor: '#0F172A',
        show: false,
    });

    // Use a standard browser User Agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // Load from local server (or dev server in development)
    const url = isDev ? 'http://localhost:3000' : LOCAL_URL;
    console.log(`Loading: ${url} (isDev: ${isDev})`);

    mainWindow.loadURL(url, { userAgent });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Allow internal navigation
        if (url.startsWith(LOCAL_URL) || url.startsWith('http://localhost')) {
            return { action: 'allow' };
        }
        // Open external links in browser
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle crashes/errors
    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error('Render process gone:', details);
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open PinVerse',
            click: () => mainWindow.show()
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('PinVerse - Pinterest Marketing Tools');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow.show());
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: () => {
                        app.isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                { role: 'toggleDevTools' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Contact Support',
                    click: () => shell.openExternal('https://pinverse.io/contact')
                },
                { type: 'separator' },
                {
                    label: 'About PinVerse',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About PinVerse',
                            message: 'PinVerse Desktop',
                            detail: `Version: ${app.getVersion()}\nPinterest Marketing Tools\n\n© 2025 Ecomverse LLC`
                        });
                    }
                }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// App lifecycle
app.whenReady().then(async () => {
    try {
        // Start the embedded Next.js server first
        await startNextServer();

        createWindow();
        createTray();
        createMenu();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            } else {
                mainWindow.show();
            }
        });
    } catch (error) {
        console.error('Failed to start app:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;

    // Stop the Next.js server
    if (nextServer) {
        nextServer.kill();
    }
});
