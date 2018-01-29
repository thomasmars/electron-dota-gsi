const ipc = require('electron').ipcRenderer;
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const store = new Store();
const axios = require('axios');
const generateDbFiles = require('./DbGenerator');
const { initializeGsiListener, setTwitchToken } = require('./gsi-server/index');

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const configureSteam = document.getElementById('configure-steam');
const clearSteamSettings = document.getElementById('clean-up-steam');
const steamPathElement = document.getElementById('steam-path');
const twitchConnectionButton = document.getElementById('twitch-connection-button');
const twitchContainer = document.getElementById('twitch-connection-container');
const twitchToken = document.getElementById('twitch-broadcaster-id');
const twitchClearConnection = document.getElementById('twitch-broadcaster-cleanup');
const startServerButton = document.getElementById('start-server');
const serverContainerButton = document.getElementById('dota-server-container');
const steamConfigurationContainer = document.getElementById('steam-configuration');

let steamPath = store.get('steamPath');
let broadcasterToken = store.get('broadcasterToken');
let server;

// Config specific file/dir names
// "steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration_test.cfg"
const cfgFolders = [
  'steamapps',
  'common',
  'dota 2 beta',
  'game',
  'dota',
  'cfg'
];
const gsiCfgFileName = 'gamestate_integration_test.cfg';


function connectWithTwitch() {
  twitchContainer.classList.add('info-set');
  twitchContainer.classList.remove('connection-error');
  startServerButton.disabled = !(steamPath && broadcasterToken);
  twitchToken.disabled = true;
}

function clearTwitchConnection() {
  serverContainerButton.classList.remove('running');
  twitchContainer.classList.remove('info-set');
  twitchContainer.classList.remove('connection-error');
  twitchToken.innerText = '';
  startServerButton.disabled = !(steamPath && broadcasterToken);
  twitchToken.disabled = false;
}

function showPath() {
  steamConfigurationContainer.classList.add('path-set');
  clearErrors();
  startServerButton.disabled = !(steamPath && broadcasterToken);
}

function hidePath() {
  steamConfigurationContainer.classList.remove('path-set');

  // Remove config file if it exists
  const gsiFolder = path.resolve(
    steamPath,
    ...cfgFolders,
    'gamestate_integration'
  );
  const gsiFile = path.resolve(gsiFolder, gsiCfgFileName);
  if (steamPath && fs.existsSync(gsiFile)) {
    fs.unlinkSync(gsiFile);
  }

  // Remove gsi folder if empty
  const gsiFolderContents = fs.readdirSync(gsiFolder);
  if (gsiFolderContents.length === 0) {
    fs.rmdirSync(gsiFolder);
  }

  // Remove from store
  store.delete('steamPath');
  steamPath = store.get('steamPath');
  startServerButton.disabled = !(steamPath && broadcasterToken);
  clearErrors();
}

function clearErrors() {
  steamConfigurationContainer.classList.remove('has-error');
}

function setError() {
  steamConfigurationContainer.classList.add('has-error');
}

configureSteam.addEventListener('click', () => {
  ipc.send('open-file-dialog');
});

clearSteamSettings.addEventListener('click', () => {
  hidePath();
});

twitchConnectionButton.addEventListener('click', () => {
  broadcasterToken = twitchToken.value;
  store.set('broadcasterToken', broadcasterToken);
  twitchToken.innerText = broadcasterToken;
  setTwitchToken(broadcasterToken);
  connectWithTwitch();
});

twitchClearConnection.addEventListener('click', () => {
  store.delete('broadcasterToken');
  broadcasterToken = store.get('broadcasterToken');
  clearTwitchConnection();
});

startServerButton.addEventListener('click', () => {
  // Always update DB definitions first, so they are up to date
  generateDbFiles();

  // Initialize server here.
  setTimeout(() => {
    server = initializeGsiListener(broadcasterToken, () => {
      // On error let user know that token must be updated
      twitchContainer.classList.add('connection-error');
    });
  }, 5000);

  // Show that Server is running
  // Make it possible to stop server
  serverContainerButton.classList.add('running');
});

ipc.on('selected-directory', (event, selectedPaths) => {
  // Check that path current folder is steam
  const selectedPath = selectedPaths[0];

  // Check that folder contains:
  const cfgFolder = path.resolve(selectedPath, ...cfgFolders);
  if (fs.existsSync(cfgFolder)) {
    // Create gamestate_integration dir if it doesn't exist
    const gsiFolder = path.resolve(cfgFolder, 'gamestate_integration');
    if (!fs.existsSync(gsiFolder)) {
      fs.mkdirSync(gsiFolder);
    }

    // Folder exists, copy .cfg file to folder
    store.set('steamPath', selectedPath);
    fs
      .createReadStream(path.resolve(__dirname, 'config', gsiCfgFileName))
      .pipe(fs.createWriteStream(path.resolve(gsiFolder, gsiCfgFileName)));
    steamPath = selectedPath;
    steamPathElement.innerHTML = selectedPath;
    showPath();
  } else {
    setError();
  }
});

if (steamPath) {
  steamPathElement.innerHTML = steamPath;
  showPath();
}

if (broadcasterToken) {
  twitchToken.innerText = broadcasterToken;
  connectWithTwitch();
}

// Un-register broadcaster when exiting
const dotaIlluminateBackend = 'https://www.dotailluminate.pro';
window.onbeforeunload = () => {
  axios.post(`${dotaIlluminateBackend}/byebye`, { token: broadcasterToken });
};