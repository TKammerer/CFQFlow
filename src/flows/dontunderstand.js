'use strict'

module.exports = (app) => {
  let slapp = app.slapp

  slapp.message('(.*)', ['direct_mention', 'direct_message'], (msg) => {    
    slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
        if (err) return msg.respond(`Sorry, something went wrong. Try again? (${err.message || err})`)
            msg.say("Sorry " + data.user.name + ", I don't understand.");
        })
  })

}