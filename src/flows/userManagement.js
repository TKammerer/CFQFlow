'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

    slapp.message('view (owners|reviewers|developers)', ['direct_mention', 'direct_message'], (msg, text, role) => {
        var roleList = kv.get(role, (err, role) => {
            if (err) return handleError(err, msg)
        })
        if(roleList == null)
            msg.say("Nothing Found!")
        else
            msg.say(role)
    })
  
  return {}
}

function handleError (err, msg) {
  console.error(err)

  // Only show errors when we can respond with an ephemeral message
  // So this includes any button actions or slash commands
  if (!msg.body.response_url) return

  msg.respond({
    text: `:scream: Uh Oh: ${err.message || err}`,
    response_type: 'ephemeral',
    replace_original: false
  }, (err) => {
    if (err) console.error('Error handling error:', err)
  })
}