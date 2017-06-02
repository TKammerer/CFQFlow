'use strict'

let config = module.exports = {
  // Beep Boop Persist API provider (beepboop, fs, memory)
  persist_provider: process.env.PERSIST_PROVIDER || 'beepboop',

  validate: () => {
    let required = ['persist_provider']

    required.forEach((prop) => {
      if (!config[prop]) {
        throw new Error(`${prop.toUpperCase()} required but missing`)
      }
    })
    return config
  }

}