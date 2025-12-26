
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Define path to store data (UserData/GasMonitoringData)
const DATA_DIR = path.join(app.getPath('userData'), 'GasMonitoringData');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let mainWindow;

function createWindow() {
  const isDev = !app.isPackaged;
  
  // Logic to handle icon path correctly in both Dev and Production
  // In Dev: icon is in public/icon.ico relative to root
  // In Prod: Vite copies public assets to dist/, so it's in dist/icon.ico
  const iconPath = isDev 
    ? path.join(__dirname, '../public/icon.ico') 
    : path.join(__dirname, '../dist/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // Hide default menu bar
    icon: iconPath // Set the dynamic icon path
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Uncomment for debugging
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // --- IPC Handlers for File System ---

  // Save Data
  ipcMain.handle('save-data', async (event, filename, data) => {
    try {
      const filePath = path.join(DATA_DIR, `${filename}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Saved ${filename}`);
      return { success: true };
    } catch (error) {
      console.error('Error saving data:', error);
      return { success: false, error: error.message };
    }
  });

  // Load Data
  ipcMain.handle('load-data', async (event, filename) => {
    try {
      const filePath = path.join(DATA_DIR, `${filename}.json`);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error loading data:', error);
      return null;
    }
  });

  // Open Data Folder
  ipcMain.handle('open-data-folder', async () => {
    await shell.openPath(DATA_DIR);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
