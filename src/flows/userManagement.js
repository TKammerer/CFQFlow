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
        let userObj = GetUserName(msg);

        if(userObj.error)
            return msg.respond(`Sorry, something went wrong. Try again? (${err.message || err})`)

        var roleList = [];

        roleList.push(userObj.text);

        kv.set(role, roleList, (err, role) => {
            if (err) return handleError(err, msg)
        })

        var roleList = kv.get(role, (err, role) => {
            if (err) return handleError(err, msg)
        })

        msg.say("Added " + userObj.text + " to role " + role).say("Current " + role + " list: " + roleList)
    })
  
    function GetUserName(msg) {
        let userObj = null;

        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
            if (err){
                userObj.error = true;
                userObj.text = `Sorry, something went wrong. Try again? (${err.message || err})`;
            }
            userObj.error = false;
            userObj.text = data.user.name; 
        })

        return userObj;
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