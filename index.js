const mineflayer = require('mineflayer')
const config = require('./config.json')

console.log("=================================")
console.log(" Starting Mineflayer Register Bot ")
console.log("=================================")

const bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: config.username,
  version: config.version
})

/*
========================
BASIC EVENTS
========================
*/

bot.on('login', () => {
  console.log(`[LOGIN] Logged in as ${bot.username}`)
})

bot.on('spawn', () => {
  console.log("[SPAWN] Bot joined the server.")

  setTimeout(() => {

    // REGISTER COMMAND
    if (config.registerCommand && config.registerCommand.trim() !== "") {
      console.log(`[ACTION] Sending register command: ${config.registerCommand}`)
      bot.chat(config.registerCommand)
    } else {
      console.log("[SKIP] registerCommand is empty.")
    }

    // CODE CONFIRMATION COMMAND
    if (config.codeCommand && config.codeCommand.trim() !== "") {
      console.log(`[ACTION] Sending code confirmation: ${config.codeCommand}`)
      bot.chat(config.codeCommand)
    } else {
      console.log("[SKIP] codeCommand is empty. Not sending confirmation.")
    }

  }, config.delayBeforeRegister)
})

/*
========================
CHAT LOGGER
========================
*/

// Normal player chat
bot.on('chat', (username, message) => {
  console.log(`[CHAT] ${username}: ${message}`)
})

// ALL messages (server, plugins, system, json messages)
bot.on('message', (message) => {
  console.log(`[RAW MESSAGE] ${message.toString()}`)
})

// Whisper messages
bot.on('whisper', (username, message) => {
  console.log(`[WHISPER] ${username}: ${message}`)
})

/*
========================
ERROR HANDLING
========================
*/

bot.on('kicked', (reason) => {
  console.log("[KICKED] Bot was kicked.")
  console.log(reason)
})

bot.on('error', (err) => {
  console.log("[ERROR]")
  console.log(err)
})

bot.on('end', () => {
  console.log("[END] Bot disconnected.")
})
