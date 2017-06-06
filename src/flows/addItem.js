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
        if(role === 'dev') {
            if(answer === 'no'){
                msg.say("Can you please give a quick explanation for the channel?").route('handleDevNo', item)
            }
            else{
                kv.get("workItems", (err, dbworkItemList) => {
                    var workItem = dbworkItemList.find(x => x.title === item)

                    workItem.devApproved = true;

                    let answerText = "Thanks!";

                    if(workItem.qaApproved) {
                        workItem.accepted = true;
                        answerText = "Thanks!" + item + " is fully approved!"
                    }
                    else{
                        answerText = "Thanks!" + item + " is waiting on QA Review."
                    }

                    kv.set("workItems", dbworkItemList, (err) => {
                        if (err) return handleError(err, msg)
                        msg.say(answerText)
                    })
                })
            }
        }
        else {
            if(answer === 'no'){
                msg.say("Can you please give a quick explanation for the channel?").route('handleQANo', item)
            }
            else{
                kv.get("workItems", (err, dbworkItemList) => {
                    var workItem = dbworkItemList.find(x => x.title === item)

                    workItem.qaApproved = true;

                    let answerText = "Thanks!";

                    if(workItem.qaApproved) {
                        workItem.accepted = true;
                        answerText = "Thanks!" + item + " is fully approved!"
                    }
                    else{
                        answerText = "Thanks!" + item + " is waiting on Dev Review."
                    }

                    kv.set("workItems", dbworkItemList, (err) => {
                        if (err) return handleError(err, msg)
                        msg.say(answerText)
                    })
                })
            }
        }
    })

    slapp.route('handleDevNo', (msg, item) => {
            var text = msg.body.event.text

            kv.get("workItems", (err, dbworkItemList) => {
                var workItem = dbworkItemList.find(x => x.title === item)

                workItem.devApproved = false;
                workItem.rejected = true;
                workItem.devReason = text;

                kv.set("workItems", dbworkItemList, (err) => {
                    if (err) return handleError(err, msg)
                    msg.say("Thanks!")
                })
            })
    })

        slapp.route('handleQANo', (msg, item) => {
            var text = (msg.body.event && msg.body.event.text) || ''

            if (!text) {
                return msg.say("Whoops, I'm still waiting to hear from you.").route('handleQANo', item)
            }

            kv.get("workItems", (err, dbworkItemList) => {
                var workItem = dbworkItemList.find(x => x.title === item)

                workItem.qaApproved = false;
                workItem.rejected = true;
                workItem.qaReason = text;

                kv.set("workItems", dbworkItemList, (err) => {
                    if (err) return handleError(err, msg)
                    msg.say("Thanks!")
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