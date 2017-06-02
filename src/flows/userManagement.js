'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

    slapp.message('view (owners|reviewers|developers)', ['direct_mention', 'direct_message'], (msg, text, role) => {
        kv.get(role, (err, roleList) => {
            if (err) return handleError(err, msg)

            if(roleList == null)
                msg.say("Nothing Found!")
            else
                msg.say(roleList)
        })
    })

    slapp.message('add myself (owners|reviewers|developers)', ['direct_mention', 'direct_message'], (msg, text, role) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 

            kv.get(role, (err, dbRoleList) => {
            
                let roleList = [];

                if(dbRoleList != null)
                    roleList = dbRoleList;

                roleList.push(data.user.name);

                kv.set(role, roleList, (err) => {
                    if (err) return handleError(err, msg)
                    
                    kv.get(role, (err, updatedRoleList) => {
                        if (err) return handleError(err, msg)

                        msg.say("Added " + data.user.name + " to role " + role).say("Current " + role + " list: " + updatedRoleList)
                    })
                })
            })
        })
    })

    slapp.message('remove myself (owners|reviewers|developers)', ['direct_mention', 'direct_message'], (msg, text, role) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 

            kv.get(role, (err, dbRoleList) => {
            
                let roleList = [];

                if(dbRoleList != null)
                    roleList = dbRoleList;

                let index = roleList.indexOf(data.user.name)
                    if(index !== -1)
                        roleList.splice(index, 1);

                kv.set(role, roleList, (err) => {
                    if (err) return handleError(err, msg)
                    
                    kv.get(role, (err, updatedRoleList) => {
                        if (err) return handleError(err, msg)

                        msg.say("Removed " + data.user.name + " from role " + role).say("Current " + role + " list: " + updatedRoleList)
                    })
                })
            })
        })
    })

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

}