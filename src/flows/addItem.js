'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

    slapp.message('cancel work item (.*)', ['direct_mention', 'direct_message'], (msg, text, workItemTitle) => {
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

                        workItem.canceled = true;
                        workItem.inProgress = false;
                        workItem.inReview = false;

                        kv.set("workItems", workItemList, (err) => {
                            if (err) return handleError(err, msg)
                            
                            kv.get("workItems", (err, updatedWorkItemList) => {
                                if (err) return handleError(err, msg)
                                
                            if(updatedWorkItemList == null)
                                msg.say("Nothing Found!")
                            else
                                msg.say("Canceled *" + workItemTitle + "*.")
                            })
                        })
                    })
                }
                else
                    msg.say("Must be owner!")
            })
        })
    })

    slapp.message('view work items (all|rejected|workable|in progress|in review|complete)', ['message'], (msg, text, type) => {
        kv.get("workItems", (err, dbworkItemList) => {
            if (err) return handleError(err, msg)

            let workItemList = [];

            if(type === "workable") {
                workItemList = dbworkItemList.filter(function(item){
                    if(item.accepted && !item.rejected && !item.inProgress && !item.inReview && !item.completed && !item.canceled)
                        return item
                })
            }
            else if(type === "in progress") {
                workItemList = dbworkItemList.filter(function(item){
                    if(item.inProgress && !item.inReview)
                        return item
                })
            }
            else if(type === "in review") {
                workItemList = dbworkItemList.filter(function(item){
                    if(item.inReview && !item.inProgress)
                        return item
                })
            }
            else if(type === "complete") {
                workItemList = dbworkItemList.filter(function(item){
                    if(item.completed)
                        return item
                })
            }
            else if(type === "rejected") {
                workItemList = dbworkItemList.filter(function(item){
                    if(item.rejected)
                        return item
                })
            }
            else if(type === "canceled") {
                workItemList = dbworkItemList.filter(function(item){
                    if(item.canceled)
                        return item
                })
            }
            else{
                workItemList = dbworkItemList
            }

            if(workItemList.length == 0)
                msg.say("Nothing Found!")
            else {
                msg.say("*" + type + "* work items:")
                workItemList.forEach(function(element){
                    msg.say(`\`\`\`${JSON.stringify(element)}\`\`\`\n`)
                })
            }
        })
    })

    slapp.message('submit work item', ['direct_mention', 'direct_message'], (msg, text, role) => {
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

        msg.say(`Thanks! Description?`).route('new-item-desc', state)
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

            msg.say('Accepted!')

            roleList.forEach(function(element){
                msg.say('@'+element + ' *' + state.title + '* changes do not require QA or have automated test coverage?')
                msg.say('@'+element + ' Please reply "qa review *' + state.title + '* yes/no"')
            })
            
            kv.get("dev reviewers", (err, roleList) => {
                if (err) return handleError(err, msg)

                roleList.forEach(function(element){
                    msg.say('@'+element + ' *' + state.title + '* changes constainted to one system?')
                    msg.say('@'+element + ' Please reply "dev review *' + state.title + '* yes/no"')
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

    slapp.message('begin work (.*)', ['direct_mention', 'direct_message'], (msg, text, workItemTitle) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
            kv.get("developers", (err, roleList) => {
                if (err) return handleError(err, msg)

                if(roleList.indexOf(data.user.name) !== -1){
                    kv.get("workItems", (err, dbworkItemList) => {  
                        let workItemList = [];

                        if(dbworkItemList != null) {
                            workItemList = dbworkItemList

                            var inProgress = workItemList.some(function(item){
                                return item.inProgress
                            })

                            if(inProgress){
                                msg.say("WIP Limit Exceeded!")
                                return
                            }

                            var workItem = workItemList.find(x => x.title === workItemTitle & x.accepted)

                            if(workItem == null){
                                msg.say("Cannot find workable item *" + workItemTitle + "*!")
                                return
                            }

                            workItem.inProgress = true
                            workItem.developer = data.user.name

                            kv.set("workItems", workItemList, (err) => {
                                if (err) return handleError(err, msg)
                                
                                kv.get("workItems", (err, updatedWorkItemList) => {
                                    if (err) return handleError(err, msg)
                                    
                                if(updatedWorkItemList == null)
                                    msg.say("Nothing Found!")
                                else
                                    msg.say("*" + workItemTitle + "* is now in progress")
                                })
                            })
                        }
                        else
                            msg.say("No Work Items Found!")
                    })
                }
                else
                    msg.say("Must be Developer!")
            })
        })
    })

    slapp.message('request review (.*)', ['direct_mention', 'direct_message'], (msg, text, workItemTitle) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
            kv.get("developers", (err, roleList) => {
                if (err) return handleError(err, msg)

                if(roleList.indexOf(data.user.name) !== -1){
                    kv.get("workItems", (err, dbworkItemList) => {  
                        let workItemList = [];

                        if(dbworkItemList != null) {
                            workItemList = dbworkItemList

                            var workItem = workItemList.find(x => x.title === workItemTitle & x.inProgress)

                            if(workItem == null){
                                msg.say("Cannot find in progress item *" + workItemTitle + "*!")
                                return
                            }

                            workItem.inReview = true

                            kv.set("workItems", workItemList, (err) => {
                                if (err) return handleError(err, msg)
                                
                                kv.get("workItems", (err, updatedWorkItemList) => {
                                    if (err) return handleError(err, msg)
                                    
                                    if(updatedWorkItemList == null)
                                        msg.say("Nothing Found!")
                                    else {                                            
                                        kv.get("dev reviewers", (err, roleList) => {
                                            if (err) return handleError(err, msg)
                                            
                                            msg.say("*" + workItemTitle + "* is now in review")
                                            roleList.forEach(function(element){
                                                msg.say('@'+element + ' *' + workItemTitle + '* changes safe to promote?')
                                                msg.say('@'+element + ' Please reply "code review ' + workItemTitle + ' yes/no"')
                                            })
                                        })
                                    }
                                })
                            })
                        }
                        else
                            msg.say("No Work Items Found!")
                    })
                }
                else
                    msg.say("Must be Developer!")
            })
        })
    })

    slapp.message('review work (.*) (yes|no)', ['direct_mention', 'direct_message'], (msg, text, workItemTitle, answer) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
            kv.get("dev reviewers", (err, roleList) => {
                if (err) return handleError(err, msg)

                if(roleList.indexOf(data.user.name) !== -1){
                    kv.get("workItems", (err, dbworkItemList) => {  
                        let workItemList = [];

                        if(dbworkItemList != null) {
                            workItemList = dbworkItemList

                            var workItem = workItemList.find(x => x.title === workItemTitle & x.inReview)

                            if(workItem == null){
                                msg.say("Cannot find in review item *" + workItemTitle + "*!")
                                return
                            }

                            workItem.codeReviewer = data.user.name

                            if(answer === "yes"){
                                workItem.completed = true
                                workItem.inProgress = false
                                workItem.inReview = false
                                kv.set("workItems", workItemList, (err) => {
                                    if (err) return handleError(err, msg)
                                    
                                    kv.get("workItems", (err, updatedWorkItemList) => {
                                        if (err) return handleError(err, msg)
                                        
                                        if(updatedWorkItemList == null)
                                            msg.say("Nothing Found!")
                                        else {                                            
                                            kv.get("developers", (err, roleList) => {
                                                if (err) return handleError(err, msg)
                                                
                                                msg.say("*" + workItemTitle + "* is now in completed!")
                                                roleList.forEach(function(element){
                                                    msg.say('@'+element + ' Please Merge *' + workItemTitle + '*.')
                                                })
                                            })
                                        }
                                    })
                                })
                            }
                            else{
                                workItem.inProgress = true
                                workItem.inReview = false
                                kv.set("workItems", workItemList, (err) => {
                                    if (err) return handleError(err, msg)
                                    
                                    kv.get("workItems", (err, updatedWorkItemList) => {
                                        if (err) return handleError(err, msg)
                                        
                                        if(updatedWorkItemList == null)
                                            msg.say("Nothing Found!")
                                        else {                                            
                                            kv.get("developers", (err, roleList) => {
                                                if (err) return handleError(err, msg)
                                                msg.say("*" + workItemTitle + "* is now in progress!")
                                                let handleCodeReviewNoDTO = { title: workItemTitle, uName:data.user.name }
                                                msg.say("Can you please give a quick explanation for @" + roleList[0]).route('handleCodeReviewNo', handleCodeReviewNoDTO)
                                            })
                                        }
                                    })
                                })
                            }
                        }
                        else
                            msg.say("No Work Items Found!")
                    })
                }
                else
                    msg.say("Must be Dev Reviewer!")
            })
        })
    })

    slapp.route('handleCodeReviewNo', (msg, handleCodeReviewNoDTO) => {
        var text = (msg.body.event && msg.body.event.text) || ''

        kv.get("workItems", (err, dbworkItemList) => {
            var workItem = dbworkItemList.find(x => x.title === handleCodeReviewNoDTO.title)

            workItem.codeReviewReason = workItem.codeReviewReason + " --- " + text;

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