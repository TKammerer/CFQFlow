'use strict'

let config = module.exports = {
  // Beep Boop Persist API provider (beepboop, fs, memory)
  persist_provider: process.env.PERSIST_PROVIDER || 'beepboop',
}