const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Production URL - the live PinVerse website
const PRODUCTION_URL = 'https://pinverse.io';
// Development URL - local Next.js dev server
const DEV_URL = 'http://localhost:3000';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'PinVerse',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        backgroundColor: '#0f172a'
    });

    // Determine which URL to load
    const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
    const url = isDev ? DEV_URL : PRODUCTION_URL;

    mainWindow.loadURL(url);

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http') && !url.includes('pinverse.io') && !url.includes('localhost')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App ready
app.whenReady().then(createWindow);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Recreate window on macOS when dock icon is clicked
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
