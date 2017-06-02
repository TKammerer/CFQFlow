'use strict'

module.exports = (app) => {
  let slapp = app.slapp

  let help = `
  view (owners|reviewers|developers)
  add myself (owners|reviewers|developers)
  remove myself (owners|reviewers|developers)
  `

  slapp.command('/cfq', /^\s*help\s*$/, (msg) => {
    msg.respond(help)
  })

  slapp.message('help', ['direct_mention', 'direct_message'], (msg, text) => {
    msg.say(help)
  })

  slapp.message('who am i', ['mention', 'direct_message'], (msg) => {    
    slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
        if (err) return msg.respond(`Sorry, something went wrong. Try again? (${err.message || err})`)
            msg.say(data.user.name);
        })
  })

  return {}
}
