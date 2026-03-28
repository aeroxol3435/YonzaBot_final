const mineflayer = require('mineflayer')
const express = require('express')
const config = require('./config.json')

/*
========================
EXPRESS SERVER (UPTIME)
========================
*/

const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send("Bot is alive.")
})

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`)
})

/*
========================
BOT SYSTEM
========================
*/

function createBot() {

  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version
  })

  const cooldowns = new Map()

  function isOnCooldown(player) {
    if (!cooldowns.has(player)) return false
    const expiration = cooldowns.get(player)
    return Date.now() < expiration
  }

  function setCooldown(player) {
    cooldowns.set(player, Date.now() + 10000) // 10 seconds
  }

  bot.on('spawn', () => {
    console.log("[SPAWN] Joined server.")

    // Join message after 3 sec
    setTimeout(() => {
      bot.chat("Im back bro finally")
    }, 3000)

    // Every 5 minutes message
    setInterval(() => {
      bot.chat("you guys are alive or not bruh?")
    }, 300000)
  })

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return

    // Cooldown check
    if (isOnCooldown(username)) {
      bot.chat(`/minecraft:msg ${username} you are in 10 seconds cooldown.`)
      return
    }

    /*
    ========================
    PUBLIC COMMAND
    ========================
    */

    if (message === "~ping") {
      setCooldown(username)
      bot.chat("pong")
      return
    }

    /*
    ========================
    OWNER ONLY COMMAND
    ========================
    */

    if (message.startsWith("~kit")) {

      if (username !== config.owner) {
        setCooldown(username)
        bot.chat(`/minecraft:msg ${username} you are not my owner lil bro.`)
        return
      }

      if (isOnCooldown(username)) {
        bot.chat(`/minecraft:msg ${username} you are in 10 seconds cooldown.`)
        return
      }

      setCooldown(username)

      const args = message.split(" ")
      const target = args[1] ? args[1] : username

      const items = [
        `diamond_block 64`,
        `netherite_block 64`,
        `enchanted_golden_apple 64`
      ]

      for (let item of items) {
        bot.chat(`/give ${target} ${item}`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      return
    }
  })

  bot.on('message', (msg) => {
    console.log("[RAW]", msg.toString())
  })

  bot.on('kicked', (reason) => {
    console.log("[KICKED]", reason)
  })

  bot.on('end', () => {
    console.log("[END] Reconnecting in 10 seconds...")
    setTimeout(createBot, 10000)
  })

  bot.on('error', (err) => {
    console.log("[ERROR]", err)
  })
}

createBot()
