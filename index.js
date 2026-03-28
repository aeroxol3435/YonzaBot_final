const mineflayer = require('mineflayer')
const express = require('express')
const os = require('os')
const bodyParser = require('body-parser')
const config = require('./config.json')

let bot
let isOnline = false
let afkMode = false

let cooldowns = new Map()
let stareCooldown = new Map()
let chatLogs = []

function logChat(text) {
  chatLogs.push(text)
  if (chatLogs.length > 100) chatLogs.shift()
}

function createBot() {
  bot = mineflayer.createBot({
    host: config.host,
    port: config.port || 25565,
    username: config.username,
    version: config.version || false
  })

  bot.once('spawn', () => {
    isOnline = true
  })

  bot.on('end', () => {
    isOnline = false
  })

  // PUBLIC CHAT
  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    logChat(`[CHAT] ${username}: ${message}`)

    // PUBLIC COMMANDS
    if (message === "~ping") return publicCmd(username, () => bot.chat("pong"))
    if (message === "~whoami") return publicCmd(username, () => bot.chat(`you are ${username}`))
    if (message === "~test") return publicCmd(username, () => bot.chat("Huh?"))
    if (message === "~cmds") return publicCmd(username, () =>
      bot.chat("Public: ~ping ~whoami ~info ~test ~uptime")
    )
    if (message === "~uptime") return publicCmd(username, () =>
      bot.chat(`Uptime: ${process.uptime().toFixed(0)}s`)
    )
    if (message === "~info") {
      return publicCmd(username, () => {
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
        const cpu = os.loadavg()[0].toFixed(2)
        bot.chat(`Bot: ${bot.username} | RAM: ${ram}MB | CPU: ${cpu}`)
      })
    }

    // OWNER COMMANDS (WORK IN PUBLIC)
    if (username === config.owner) {
      handleOwner(username, message)
    }
  })

  // PRIVATE MESSAGE
  bot.on('whisper', (username, message) => {
    if (username === bot.username) return
    logChat(`[MSG] ${username}: ${message}`)

    if (username !== config.owner) {
      bot.chat(`/minecraft:msg ${username} you are not my owner lil bro.`)
      return
    }

    handleOwner(username, message)
  })

  // 5 BLOCK STARE SYSTEM (ANTI-SPAM)
  bot.on('physicTick', () => {
    const nearest = bot.nearestEntity(e => e.type === 'player' && e.username !== bot.username)
    if (!nearest) return

    const dist = bot.entity.position.distanceTo(nearest.position)

    if (dist <= 5) {
      bot.setControlState('sneak', true)
      bot.lookAt(nearest.position.offset(0, 1.6, 0), true)

      if (!stareCooldown.has(nearest.username) ||
          Date.now() - stareCooldown.get(nearest.username) > 600000) {

        bot.chat(`/minecraft:msg ${nearest.username} ${nearest.username}, what are you doing here huh?`)
        stareCooldown.set(nearest.username, Date.now())
      }
    } else {
      bot.setControlState('sneak', false)
    }
  })
}

function handleOwner(username, message) {
  // OWNER BYPASSES COOLDOWN
  if (message === "~owner_cmds") {
    bot.chat("Owner: ~kit ~say ~tpme ~tpto ~prank ~afk_mode")
    return
  }

  if (message === "~kit") return giveKit(username)
  if (message.startsWith("~kit ")) return giveKit(message.split(" ")[1])

  if (message.startsWith("~say ")) {
    bot.chat(message.replace("~say ", ""))
  }

  if (message === "~tpme") {
    bot.chat(`/tp ${bot.username} ${username}`)
  }

  if (message.startsWith("~tpto ")) {
    bot.chat(`/tp ${bot.username} ${message.split(" ")[1]}`)
  }

  if (message.startsWith("~afk_mode ")) {
    const state = message.split(" ")[1]
    afkMode = state === "on"
    bot.chat(`AFK mode ${afkMode ? "enabled" : "disabled"}`)
  }

  if (message.startsWith("~prank")) {
    const args = message.split(" ")
    const target = args[1] || username
    prankPlayer(target)
  }
}

function giveKit(player) {
  const cmds = [
    `/give ${player} diamond_block 64`,
    `/give ${player} netherite_block 64`,
    `/give ${player} enchanted_golden_apple 64`
  ]

  cmds.forEach((c, i) => {
    setTimeout(() => bot.chat(c), i * 1000)
  })
}

function prankPlayer(player) {
  bot.chat(`/effect give ${player} health_boost infinite 255`)
  setTimeout(() => bot.chat(`/effect give ${player} regeneration infinite 255`), 1000)
  setTimeout(() => bot.chat(`/effect give ${player} fire_resistance infinite 255`), 1000)
  setTimeout(() => bot.chat(`/execute at ${player} run summon lightning_bolt`), 500)
  setTimeout(() => bot.chat(`/effect clear ${player} health_boost`), 2000)
  setTimeout(() => bot.chat(`/effect clear ${player} fire_resistance`), 2500)
  setTimeout(() => bot.chat(`/minecraft:msg ${player} How's the prank lol.`), 4500)
}

function publicCmd(user, callback) {
  if (user === config.owner) return callback()

  if (cooldowns.has(user) && Date.now() - cooldowns.get(user) < 10000) {
    bot.chat(`/minecraft:msg ${user} you are in 10 seconds cooldown.`)
    return
  }

  cooldowns.set(user, Date.now())
  callback()
}

createBot()

// ================= WEBSITE =================

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

app.get("/", (req, res) => {
  const uptime = process.uptime().toFixed(0)
  const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)

  res.send(`
    <h2>Bot Dashboard</h2>
    <p>Status: ${isOnline ? "Online" : "Offline"}</p>
    <p>Username: ${config.username}</p>
    <p>IP: ${config.host}</p>
    <p>Port: ${config.port || 25565}</p>
    <p>Version: ${config.version || "Auto"}</p>
    <p>Uptime: ${uptime}s</p>
    <p>RAM: ${ram}MB</p>

    <h3>Chat Logs</h3>
    <div style="height:200px;overflow:auto;border:1px solid black;">
      ${chatLogs.join("<br>")}
    </div>

    <h3>Send Chat</h3>
    <form method="POST" action="/send">
      <input name="cmd" style="width:300px;" placeholder="/chat hello">
      <button type="submit">Send</button>
    </form>
  `)
})

app.post("/send", (req, res) => {
  const cmd = req.body.cmd

  if (cmd && cmd.startsWith("/chat ")) {
    const text = cmd.replace("/chat ", "")
    if (bot && isOnline) bot.chat(text)
  }

  res.redirect("/")
})

app.listen(3000)
