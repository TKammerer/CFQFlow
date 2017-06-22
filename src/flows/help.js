'use strict'

module.exports = (app) => {
  let slapp = app.slapp

  let help = `
  view role definition (owner|reviewer|developer)
  view role assignment (owners|qa reviewers|dev reviewers|developers)
  assign myself to (owners|qa reviewers|dev reviewers|developers)
  remove myself from (owners|qa reviewers|dev reviewers|developers)
  submit work item *[owners only]*
  view work items (all|rejected|canceled|workable|in progress|in review|complete) (detail|debug) <- Optional
  view work item (work item title) (detail|debug)?
  cancel work item (work item title) *[owners only]*
  (qa|dev) review (work item title) (yes|no) *[dev/qa reviewers only]*
  begin work (work item title) *[developers only]*
  request review (work item title) (https://git.aarons.com/PullRequestURL) *[developers only]*
  review work (work item title) (yes|no) *[dev reviewers only]*
  `

  slapp.command('/cfq', /^\s*help\s*$/, (msg) => {
    msg.respond(help)
  })

  slapp.message('help', ['direct_mention', 'direct_message', 'ambient'], (msg, text) => {
    msg.say(help)
  })

  slapp.message('who am i', ['mention', 'direct_message'], (msg) => {    
    slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
        if (err) return msg.respond(`Sorry, something went wrong. Try again? (${err.message || err})`)
            msg.say(data.user.name);
        })
  })

}