'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

    slapp.message('view role definition (owner|reviewer|developer)', ['direct_mention', 'direct_message'], (msg, text, role) => {
        if(role === "owner") {
            msg.say("```A small, predefined list of people who decide what work items are submitted to the CFQ, and what items are worked on. By limiting this list to a small number of people, it will serve to streamline and clarify the process of how things get into the CFQ, and who is responsible for deciding what gets worked on in the CFQ```")
        }
        if(role === "developer") {
            msg.say("```A developer who is assigned to work on CFQ work items. This can be anyone, but to be assigned to this role, this person *MUST NOT* be included in the pool of people working on TCQ delivery.```")
        }
        if(role === "reviewer") {
            msg.say("```A pairing of a developer and a QA team member, with two primary responsibilities:\n\n\t1. Ensure that the work items submitted for the CFQ comply with the requirements for safely delivering work via the CFQ\n\n\t2. Evaluate submitted change requests to ensure that the proposed changes are high quality and can be safely merged and deployed to prod\n\nThis team will be staffed with a developer and QA member from the primary ecommerce delivery team, and will be rotated out every two weeks.```")
        }
    })

    slapp.message('view role assignment (owners|qa reviewers|dev reviewers|developers)', ['direct_mention', 'direct_message'], (msg, text, role) => {      
        let lowerRole = role.toLowerCase();

        kv.get(lowerRole, (err, roleList) => {
            if (err) return handleError(err, msg)

            if(roleList == null)
                msg.say("Nothing Found!")
            else
                msg.say("Current " + lowerRole + " list: " + roleList)
        })
    })

    slapp.message('assign myself to (owners|qa reviewers|dev reviewers|developers)', ['direct_mention', 'direct_message'], (msg, text, role) => {
        
        let owners = ["tkammer", "jim.krall", "greg", "mjvarghese"]

        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 

            let allowed = true

            let lowerRole = role.toLowerCase();

            if(lowerRole == "owners") {
                allowed = owners.some(function(item){
                    return item == data.user.name;
                })
            }

            if(allowed) {
                kv.get(lowerRole, (err, dbRoleList) => {            
                    let roleList = [];

                    if(dbRoleList != null)
                        roleList = dbRoleList;

                    roleList.push(data.user.name);

                    kv.set(lowerRole, roleList, (err) => {
                        if (err) return handleError(err, msg)
                        
                        kv.get(lowerRole, (err, updatedRoleList) => {
                            if (err) return handleError(err, msg)

                            msg.say("Added " + data.user.name + " to role " + lowerRole).say("Current " + lowerRole + " list: " + updatedRoleList)
                        })
                    })
                })    
            }
            else {
                msg.say("Not in allowed owner group.")
            }
        })
    })

    slapp.message('remove myself from (owners|qa reviewers|dev reviewers|developers)', ['direct_mention', 'direct_message'], (msg, text, role) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 

            let lowerRole = role.toLowerCase();

            kv.get(lowerRole, (err, dbRoleList) => {
            
                let roleList = [];

                if(dbRoleList != null)
                    roleList = dbRoleList;

                let index = roleList.indexOf(data.user.name)
                    if(index !== -1)
                        roleList.splice(index, 1);

                // Hack to remove users from roles if they aren't around
                // let index1 = roleList.indexOf("jkinser")
                // roleList.splice(index1, 1);

                kv.set(lowerRole, roleList, (err) => {
                    if (err) return handleError(err, msg)
                    
                    kv.get(lowerRole, (err, updatedRoleList) => {
                        if (err) return handleError(err, msg)

                        msg.say("Removed " + data.user.name + " from role " + lowerRole).say("Current " + lowerRole + " list: " + updatedRoleList)
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