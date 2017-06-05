'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

    slapp.message('new item', ['direct_mention', 'direct_message'], (msg, text, role) => {
        slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => { 
            kv.get("owners", (err, roleList) => {
                if (err) return handleError(err, msg)

                if(roleList.indexOf(data.user.name) !== -1)
                    msg.say(`Title?`).route('new-item-title', { greeting: text })
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

    kv.get("qa reviewers", (err, roleList) => {
        if (err) return handleError(err, msg)

        msg.say('Thanks!').say(`Here's what you've told me so far: \`\`\`${JSON.stringify(state)}\`\`\``)

        msg.say()

        roleList.forEach(function(element){
            msg.say('@'+element + ' ' + state.title + ' changes do not require QA or have automated test coverage?')
            msg.say('@'+element + ' Please reply "qa review ' + state.title + ' yes/no"')
        })
        
        kv.get("dev reviewers", (err, roleList) => {
            if (err) return handleError(err, msg)

            roleList.forEach(function(element){
                msg.say('@'+element + ' ' + state.title + ' changes constainted to one system?')
                msg.say('@'+element + ' Please reply "dev review ' + state.title + ' yes/no"')
            })
        })
    })
  })

    slapp.message('(qa|dev) review (.*) (yes|no)', 'mention', (msg, text, role, item, answer) => {
        // let answer = false;

        // var answerPos = text.lastIndexOf("yes")

        // if(answerPos === -1) {
        //     answerPos = text.lastIndexOf("no")
        //     if(answerPos === -1){
        //         msg.say("I cannot find your answer in" + text)
        //         return
        //     }
        // }
        // else{
        //     answer = true;
        // }   

        // var reviewPos = text.indexOf("review")

        // let question = text.slice(reviewPos + 6, answerPos).trim()

        //msg.say("Question: " + question).say("Answer: " + answer.toString()).say("Role: " + role)

        msg.say("text: " + text).say("role: " + role).say("item: " + item).say("answer: " + answer)
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