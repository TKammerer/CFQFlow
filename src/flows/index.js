'use strict'

// list out explicitly to control order
module.exports = (app) => {
  app.flows = {
    help: require('./help')(app),
    userManagement: require('./userManagement')(app),
    // chatter: require('./chatter')(app)
  }
}