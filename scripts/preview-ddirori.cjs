const { app } = require('electron')
const { mkdtempSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

// Preview the real product with isolated preferences, recents and autosave.
app.setPath('userData', mkdtempSync(join(tmpdir(), 'chromatics-ddirori-preview-')))
require('../out/main/index.js')
