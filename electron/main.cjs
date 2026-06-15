const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const APP_URL = 'https://financia-gestao.onrender.com';

function createWindow() {
  var win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 375,
    minHeight: 600,
    title: 'Financia',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(APP_URL);

  win.webContents.setWindowOpenHandler(function(details) {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  win.removeMenu();
}

app.whenReady().then(function() {
  createWindow();

  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});
