const fs = require("fs")
const pino = require("pino")
const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys")

const OWNER = "6282227040946"

let db = {}

if (fs.existsSync("./database.json")) {
  db = JSON.parse(fs.readFileSync("./database.json"))
}

function saveDB() {
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2))
}

function isOwner(sender) {
  const num = sender.replace(/[^0-9]/g, "")
  return num === OWNER
}

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session")

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "close") startBot()
    if (connection === "open") console.log("Bot Online")
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message) return

    const sender = m.key.participant || m.key.remoteJid
    const jid = m.key.remoteJid

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      ""

    if (!isOwner(sender)) return

    if (text === ".ping") {
      return sock.sendMessage(jid, { text: "🏓 Pong!" })
    }

    if (text === ".menu") {
      return sock.sendMessage(jid, {
        text: `.menu
.ping
.stok
.add kategori akun
.get kategori
.qris`
      })
    }

    if (text === ".stok") {
      let hasil = "📦 STOK\n\n"
      for (let k in db) {
        hasil += `${k}: ${db[k].length}\n`
      }
      return sock.sendMessage(jid, { text: hasil })
    }

    if (text.startsWith(".add ")) {
      const args = text.slice(5).split(" ")
      const kategori = args[0].toLowerCase()
      const akun = args.slice(1).join(" ")

      if (!db[kategori]) db[kategori] = []
      db[kategori].push(akun)
      saveDB()

      return sock.sendMessage(jid, {
        text: "✅ Data ditambahkan."
      })
    }

    if (text.startsWith(".get ")) {
      const kategori = text.split(" ")[1].toLowerCase()

      if (!db[kategori] || db[kategori].length === 0) {
        return sock.sendMessage(jid, {
          text: "❌ Stok habis."
        })
      }

      const akun = db[kategori].shift()
      saveDB()

      return sock.sendMessage(jid, {
        text: `📤 ${kategori}\n\n${akun}\n\nSisa: ${db[kategori].length}`
      })
    }

    if (text === ".qris") {
      if (!fs.existsSync("./media/qris.jpg")) {
        return sock.sendMessage(jid, {
          text: "QRIS belum ditambahkan."
        })
      }

      return sock.sendMessage(jid, {
        image: fs.readFileSync("./media/qris.jpg"),
        caption: "QRIS Pembayaran"
      })
    }
  })
}

startBot()
