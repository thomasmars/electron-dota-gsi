# Installing game state cfg

When installing game state config use the following for choosing the Steam folder locally.

## Todo-list
- Make it possible to stop the server, and restart it
- Add some nice styles when config is set
- Add some nice styles when server is running
- Merge server into electron app
- Button for updating dota 2 db definitions ? (or just run this automatically when starting the dota 2 game state listener)
- Make something show in overlay of stream
- Make talents show in overlay of stream

## Postponed


## Done
- Hide server button when invalid configuration


# Resources

## Renderer process

const ipc = require('electron').ipcRenderer

const selectDirBtn = document.getElementById('select-directory')

selectDirBtn.addEventListener('click', function (event) {
  ipc.send('open-file-dialog')
})

ipc.on('selected-directory', function (event, path) {
  document.getElementById('selected-file').innerHTML = `You selected: ${path}`
})

## Main process

const ipc = require('electron').ipcMain
const dialog = require('electron').dialog

ipc.on('open-file-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  }, function (files) {
    if (files) event.sender.send('selected-directory', files)
  })
})

# To copy the CFG file into the cfg folder

- [Use file API ?](https://electronjs.org/docs/api/file-object)
- Or just use Node's FS module

# Save path in settings

- [Use electron-settings](https://github.com/nathanbuchar/electron-settings.git)
- Or perhaps Sindre sorhus' [electron-store](https://github.com/sindresorhus/electron-store)
