'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

    slapp.message('remove work item (.*)', ['direct_mention', 'direct_message'], (msg, text, workItemTitle) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
            kv.get("owners", (err, roleList) => {
                if (err) return handleError(err, msg)

                if(roleList.indexOf(data.user.name) !== -1){
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
                }
                else
                    msg.say("Must be owner!")
            })
        })
    })

    slapp.message('view (all|workable) work items', ['direct_mention', 'direct_message'], (msg, type) => {
        kv.get("workItems", (err, dbworkItemList) => {
            if (err) return handleError(err, msg)

            let workItemList = [];

            msg.say("type: " + type)

            if(type === "workable") {
                msg.say("Here")
                workItemList = dbworkItemList.filter(function(item){
                    if(item.accepted)
                        return item
                })
            }
            else{
                workItemList = dbworkItemList
            }


            if(workItemList == null)
                msg.say("Nothing Found!")
            else {
                msg.say("Current Work Items:")
                workItemList.forEach(function(element){
                    msg.say(`\`\`\`${JSON.stringify(element)}\`\`\`\n`)
                })
            }
        })
    })

    slapp.message('new work item', ['direct_mention', 'direct_message'], (msg, text, role) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
            kv.get("owners", (err, roleList) => {
                if (err) return handleError(err, msg)

                if(roleList.indexOf(data.user.name) !== -1)
                    msg.say(`Title?`).route('new-item-title', { id: new Date().getTime(), requestorName: data.user.name })
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
            slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
                kv.get("dev reviewers", (err, roleList) => {
                    if (err) return handleError(err, msg)

                    if(roleList.indexOf(data.user.name) !== -1){
                        kv.get("workItems", (err, dbworkItemList) => {
                            var workItem = dbworkItemList.find(x => x.title === item)

                            if(workItem.devApproved != null) {
                                msg.say("*" + item + "* has already been reviewed. Result: " + (workItem.devApproved ? "Approved" : "Rejected"))
                            }
                            else if(answer === 'no'){
                                let handleNoDTO = { title: item, uName:data.user.name }
                                msg.say("Can you please give a quick explanation for the channel?").route('handleDevNo', handleNoDTO)
                            }
                            else{
                                workItem.devApproved = true;
                                workItem.devApprover = data.user.name;
                                let answerText = "Thanks!";

                                if(workItem.qaApproved) {
                                    workItem.accepted = true;
                                    answerText = "Thanks! *" + item + "* is fully approved!"
                                }
                                else if (workItem.rejected) {
                                    answerText = "Unfortunately, *" + item + "* is already rejected by QA."
                                }
                                else { 
                                    answerText = "Thanks! *" + item + "* is waiting on QA Review."
                                }

                                kv.set("workItems", dbworkItemList, (err) => {
                                    if (err) return handleError(err, msg)
                                    msg.say(answerText)
                                })
                            }
                        })
                    }    
                    else
                        msg.say("Must be Dev Reviewer!")
                })
            })
        }
        else {
            slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
                kv.get("qa reviewers", (err, roleList) => {
                    if (err) return handleError(err, msg)

                    if(roleList.indexOf(data.user.name) !== -1){
                        kv.get("workItems", (err, dbworkItemList) => {
                            var workItem = dbworkItemList.find(x => x.title === item)

                            if(workItem.qaApproved != null) {
                                msg.say("*" + item + "* has already been reviewed. Result: " + (workItem.qaApproved ? "Approved" : "Rejected"))
                            }
                            else if(answer === 'no'){
                                let handleNoDTO = { title: item, uName:data.user.name }
                                msg.say("Can you please give a quick explanation for the channel?").route('handleQANo', handleNoDTO)
                            }
                            else{
                                workItem.qaApproved = true;
                                workItem.qaApprover = data.user.name;
                                let answerText = "Thanks!";

                                if(workItem.devApproved) {
                                    workItem.accepted = true;
                                    answerText = "Thanks! *" + item + "* is fully approved!"
                                }
                                else if (workItem.rejected) {
                                    answerText = "Unfortunately, *" + item + "* is already rejected by Dev."
                                }
                                else {
                                    answerText = "Thanks! *" + item + "* is waiting on Dev Review."
                                }

                                kv.set("workItems", dbworkItemList, (err) => {
                                    if (err) return handleError(err, msg)
                                    msg.say(answerText)
                                })
                            }
                        })
                    }
                    else
                        msg.say("Must be QA Reviewer!")
                })
            })
        }
    })

    slapp.route('handleDevNo', (msg, handleNoDTO) => {
        var text = msg.body.event.text

        kv.get("workItems", (err, dbworkItemList) => {
            var workItem = dbworkItemList.find(x => x.title === handleNoDTO.title)

            workItem.devApproved = false;
            workItem.rejected = true;
            workItem.devReason = text;
            workItem.devRejector = handleNoDTO.uName

            kv.set("workItems", dbworkItemList, (err) => {
                if (err) return handleError(err, msg)
                msg.say("Thanks!")
            })
        })
    })

    slapp.route('handleQANo', (msg, handleNoDTO) => {
        var text = (msg.body.event && msg.body.event.text) || ''

        kv.get("workItems", (err, dbworkItemList) => {
            var workItem = dbworkItemList.find(x => x.title === handleNoDTO.title)

            workItem.qaApproved = false;
            workItem.rejected = true;
            workItem.qaReason = text;
            workItem.qaRejector = handleNoDTO.uName

            kv.set("workItems", dbworkItemList, (err) => {
                if (err) return handleError(err, msg)
                msg.say("Thanks!")
            })
        })
    })

    slapp.message('work item (.*)', ['direct_mention', 'direct_message'], (msg, text, workItemTitle) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
            kv.get("owners", (err, roleList) => {
                if (err) return handleError(err, msg)

                if(roleList.indexOf(data.user.name) !== -1){
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
                }
                else
                    msg.say("Must be owner!")
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