'use strict'

const express = require('express')
const Slapp = require('slapp')
const ConvoStore = require('slapp-convo-beepboop')
const Context = require('slapp-context-beepboop')
const BeepBoopPersist = require('beepboop-persist')
const config = require('./src/config').validate()

// use `PORT` env var on Beep Boop - default to 3000 locally
var port = process.env.PORT || 3000

var slapp = Slapp({
  // Beep Boop sets the SLACK_VERIFY_TOKEN env var
  verify_token: process.env.SLACK_VERIFY_TOKEN,
  convo_store: ConvoStore(),
  context: Context()
})

// attach Slapp to express server
var server = slapp.attachToExpress(express())

var app = {
  slapp,
  server,
  kv: BeepBoopPersist({ provider: config.persist_provider })
}

require('./src/flows')(app)

// start http server
server.listen(port, (err) => {
  if (err) {
    return console.error(err)
  }

  console.log(`Listening on port ${port}`)
})