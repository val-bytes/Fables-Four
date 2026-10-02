const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

let win;
app.whenReady().then(() => {
    win = new BrowserWindow({ 
        width: 1366, 
        height: 768, 
        autoHideMenuBar: true,
        title: "Fables Four",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    win.loadFile('index.html');

    // Check the GCP server for latest.yml on boot
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates().catch(err => console.log(err));
});

// Route update telemetry to the UI
autoUpdater.on('update-available', (info) => {
    if(win) win.webContents.send('update_available', info.version);
});

autoUpdater.on('download-progress', (progressObj) => {
    if(win) win.webContents.send('download_progress', progressObj.percent);
});

autoUpdater.on('update-downloaded', () => {
    if(win) win.webContents.send('update_ready');
});

// Listen for UI commands
ipcMain.on('start_download', () => autoUpdater.downloadUpdate());
ipcMain.on('apply_update', () => autoUpdater.quitAndInstall(false, true));

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});