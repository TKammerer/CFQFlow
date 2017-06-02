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

    slapp.message('add myself (owner|reviewer|developer)', ['direct_mention', 'direct_message'], (msg, text, role) => {
        var uName = GetUserName(slapp, msg);

        var roleList = [];

        roleList.push(uName);

        kv.set(role, roleList, (err, role) => {
            if (err) return handleError(err, msg)
        })

        var roleList = kv.get(role, (err, role) => {
            if (err) return handleError(err, msg)
        })

        msg.say("Added " + uName + " to role " + role).say("Current " + role + " list: " + roleList)
    })
  
    function GetUserName(msg) {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
            return data.user.name; 
        })
    }

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