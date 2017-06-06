'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

    slapp.message('remove work item (.*)', ['direct_mention', 'direct_message'], (msg, text, workItemTitle) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 

            kv.get("workItems", (err, dbworkItemList) => {
            
                let workItemList = [];

                if(dbworkItemList != null)
                    workItemList = dbworkItemList;

                var workItem = workItemList.find(x => x.title === workItemTitle)

                if(workItem == null){
                    msg.say("Cannot find *" + workItemTitle + "*!")
                    return
                }

                let index = workItemList.indexOf(workItem)
                if(index !== -1)
                    workItemList.splice(index, 1);

                kv.set("workItems", workItemList, (err) => {
                    if (err) return handleError(err, msg)
                    
                    kv.get("workItems", (err, updatedWorkItemList) => {
                        if (err) return handleError(err, msg)
                        
                    if(updatedWorkItemList == null)
                        msg.say("Nothing Found!")
                    else
                        msg.say("Removed " + workItemTitle + " from current work item list.").say("Current list: ").say(`\`\`\`${JSON.stringify(workItemList)}\`\`\``)
                    })
                })
            })
        })
    })

    slapp.message('view work items', ['direct_mention', 'direct_message'], (msg) => {
        kv.get("workItems", (err, workItemList) => {
            if (err) return handleError(err, msg)

            if(workItemList == null)
                msg.say("Nothing Found!")
            else
                msg.say(`Current Work Items: \`\`\`${JSON.stringify(workItemList)}\`\`\``)
        })
    })

    slapp.message('new work item', ['direct_mention', 'direct_message'], (msg, text, role) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
            kv.get("owners", (err, roleList) => {
                if (err) return handleError(err, msg)

                if(roleList.indexOf(data.user.name) !== -1)
                    msg.say(`Title?`).route('new-item-title', { id: new Date().getTime() })
                else
                    msg.say("Must be owner!")
            })
        })
    })
    .route('new-item-title', (msg, state) => {

        var text = (msg.body.event && msg.body.event.text) || ''

        if (!text) {
        return msg
            .say("Whoops, I'm still waiting to hear our new item.")
            .say('Title?')
            .route('new-item-title', state)
        }
        
        state.title = text

        msg.say(`Sounds good! Little description?`).route('new-item-desc', state)
    })
    .route('new-item-desc', (msg, state) => {
    var text = (msg.body.event && msg.body.event.text) || ''

    if (!text) {
      return msg
        .say("I'm eagerly awaiting to hear the description.")
        .route('new-item-desc', state)
    }

    state.desc = text
    state.devApproved = false;
    state.qaApproved = false;

    kv.get("workItems", (err, workItemList) => {
        if (err) return handleError(err, msg)

        let list = [];

        if(workItemList != null){
            list = workItemList
        }

        list.push(state)

        kv.set("workItems", list, (err) => {
            if (err) return handleError(err, msg)
        })
    })

    kv.get("qa reviewers", (err, roleList) => {
        if (err) return handleError(err, msg)

        msg.say('Thanks!').say(`Here's what you've told me so far: \`\`\`${JSON.stringify(state)}\`\`\``)

        roleList.forEach(function(element){
            msg.say('@'+element + ' *' + state.title + '* changes do not require QA or have automated test coverage?')
            msg.say('@'+element + ' Please reply "qa review ' + state.title + ' yes/no"')
        })
        
        kv.get("dev reviewers", (err, roleList) => {
            if (err) return handleError(err, msg)

            roleList.forEach(function(element){
                msg.say('@'+element + ' *' + state.title + '* changes constainted to one system?')
                msg.say('@'+element + ' Please reply "dev review ' + state.title + ' yes/no"')
            })
        })
    })
  })

    slapp.message('(qa|dev) review (.*) (yes|no)', 'mention', (msg, text, role, item, answer) => {
        msg.say("text: " + text).say("role: " + role).say("item: " + item).say("answer: " + answer) //REMOVE
        if(answer === 'no'){
            msg.say("Can you please give a quick explanation for the channel?")
            return
        }

        if(role === 'dev') {
            kv.set(role, roleList, (err) => {
                if (err) return handleError(err, msg)
                
                kv.get(role, (err, updatedRoleList) => {
                    if (err) return handleError(err, msg)

                    msg.say("Added " + data.user.name + " to role " + role).say("Current " + role + " list: " + updatedRoleList)
                })
            })
        }
        else {

        }
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