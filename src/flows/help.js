'use strict'

module.exports = (app) => {
  let slapp = app.slapp

  let help = `I don't have any help yet :(`

  slapp.command('/cfq', /^\s*help\s*$/, (msg) => {
    msg.respond(help)
  })

  slapp.message('help', ['direct_mention', 'direct_message'], (msg, text) => {
    msg.say(help)
  })

  slapp.message('who am i', ['mention', 'direct_message'], (msg) => {
      
      
      slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
          if (err) return msg.respond(`Sorry, something went wrong. Try again? (${err.message || err})`)
          msg.say(data.user.profile.real_name).say(data.user.name)
         })
  })
  
  return {}
}
