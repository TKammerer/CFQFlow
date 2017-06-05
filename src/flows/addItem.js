'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

    slapp.message('new item', ['direct_mention', 'direct_message'], (msg, text, role) => {

        //Do a check for owner group!

        msg.say(`Title?`).route('new-item-title', { greeting: text })
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

    msg
      .say('Thanks!')
      .say(`Here's what you've told me so far: \`\`\`${JSON.stringify(state)}\`\`\``)
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