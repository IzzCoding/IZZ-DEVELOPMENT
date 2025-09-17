const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { TOKEN, OWNER_ID, BANNER_FILE_ID, OWNER_CONTACT_URL, OWNER_CHANNEL } = require('./setting');
const { MIN_GROUP_FOR_PREMIUM, PREMIUM_DAYS_ON_JOIN } = require('./setting');
const lastBroadcast = {};
const ownersFile = 'owners.json'; // file JSON untuk simpan data owner tambahan
const axios = require('axios');
const config = require('./setting');
const moment = require('moment');
moment.locale('id');
const bot = new TelegramBot(TOKEN, { polling: true });

let forwardChatId = null;
let forwardMessageId = null;
let autoForwardInterval = null;
let autoForwardDelay = 5 * 60 * 1000;

// Simpan daftar grup yang pernah berinteraksi dengan bot
let groups = [];

// Status auto broadcast
let autoBroadcast = false;
let autoInterval = null;

// Pesan otomatis default
let autoMessage = '📢 Pesan otomatis dari bot!';
// Jeda default 60 detik
let autoDelay = 60; // dalam detik

// Chat admin untuk log (bisa diisi saat mengaktifkan /auto)
let adminChatId = null;

// Simpan setiap chat yang mengirim pesan ke bot
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // Simpan jika chat adalah grup dan belum ada di array
  if (msg.chat.type.includes('group') && !groups.includes(chatId)) {
    groups.push(chatId);
  }
});

// ====================== OWNER TAMBAHAN ======================
// Baca JSON
function readJSON(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Tulis JSON
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Ambil daftar owner tambahan
function getOwners() {
  return readJSON(ownersFile, { owners: [] }).owners;
}

// Simpan daftar owner tambahan
function saveOwners(list) {
  writeJSON(ownersFile, { owners: list });
}

// Cek owner (asli atau tambahan)
function isOwner(userId) {
  return userId === OWNER_ID || getOwners().includes(userId);
}

// Helper JSON
function readJSON(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// === CEK MEMBER CHANNEL ===
async function checkJoinChannel(userId) {
  try {
    const member = await bot.getChatMember(config.OWNER_CHANNEL, userId);
    if (
      member.status === "member" ||
      member.status === "administrator" ||
      member.status === "creator"
    ) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.log("Error check member:", err.message);
    return false;
  }
}

// === HANDLE CALLBACK UNTUK CEK ULANG JOIN ===
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (query.data === "cek_join") {
    const isJoined = await checkJoinChannel(userId);

    if (isJoined) {
      bot.sendMessage(chatId, "✅ Terima kasih sudah join channel! Sekarang kamu bisa pakai bot.\n\nKetik /start lagi untuk membuka menu.");
    } else {
      bot.sendMessage(chatId, `❌ Kamu belum join channel ${config.OWNER_CHANNEL}`);
    }
  }
});

// =====================================
// Data & Manager
// =====================================
const groupsFile = 'groups.json';
const premiumFile = 'premium.json';
const pendingFile = 'pending.json';

function getPending() { return readJSON(pendingFile, {}); }
function savePending(data) { writeJSON(pendingFile, data); }
function getGroups() { return readJSON(groupsFile, []); }
function saveGroup(id) {
  const groups = getGroups();
  if (!groups.includes(id)) {
    groups.push(id);
    writeJSON(groupsFile, groups);
    return true;
  }
  return false;
}
function removeGroup(id) {
  const groups = getGroups().filter(g => g !== id);
  writeJSON(groupsFile, groups);
}
function getPremium() { return readJSON(premiumFile, {}); }
function savePremium(data) { writeJSON(premiumFile, data); }
function addPremium(userId, days, via = 'manual') {
  const db = getPremium();
  const now = Date.now();
  const ms = days * 24 * 60 * 60 * 1000;
  db[userId] = { until: now + ms, via };
  savePremium(db);
}
function removePremium(userId) {
  const db = getPremium();
  delete db[userId];
  savePremium(db);
}
function isPremium(userId) {
  const db = getPremium();
  return db[userId] && db[userId].until > Date.now();
};

// =====================================
// /start utama (dengan cek join channel)
// =====================================
bot.onText(/\/start(?:\s+(\w+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // 🔐 Wajib cek join channel
  const isJoined = await checkJoinChannel(userId);
  if (!isJoined) {
    bot.sendMessage(
      chatId,
      `🚫 Kamu harus join channel owner dulu untuk menggunakan bot ini.\n\n👉 Silakan join: ${config.OWNER_CHANNEL}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Join Channel", url: `https://t.me/${config.OWNER_CHANNEL.replace("@", "")}` }],
            [{ text: "🔄 Coba Lagi", callback_data: "cek_join" }]
          ],
        },
      }
    );
    return; // stop di sini kalau belum join
  }
  
    // ==== LOADING ANIMASI ====
  let message = await bot.sendMessage(chatId, "⏳ Loading menu...");
  await showLoading(chatId, message.message_id, [
    "⏳ Loading menu...",
    "🔄 Menyiapkan data...",
    "✨ Hampir selesai...",
  ]);

  // ==== MENU UTAMA ====
  const menuMessage =
    `✨ *Welcome to ZyxxennnBot* ✨\n\n` +
    `──────────────────────\n` +
    `👤 *Author*  : ${BOT_AUTHOR}\n` +
    `🛠 *Version* : ${BOT_VERSION}\n` +
    `👑 *Owner*   : ${OWNER_IDS.join(", ")}\n` +
    `──────────────────────\n\n` +
    `📌 Pilih menu di bawah untuk mulai menggunakan bot 👇\n\n` +
    'MENU JASHARE\n' +
    '/sharemsg\n' +
    '/broadcast\n' +
    '/auto on/off\n' +
    '/settxt\n' +
    '/setjeda\n\n' +
    `──────────────────────\n\n` +
    'MENU OWNER\n' +
    '/addown\n' +
    '/addprem\n' +
    '/delown\n' +
    '/delprem\n' +
    '/listown\n' +
    '/listprem\n' +
    '──────────────────────'
    ;
    
      // 🔐 Hanya premium dan owner yang bisa kirim pesan manual (misal /share)
  if (!isPremiumUser && !isOwner) {
    bot.sendMessage(chatId, `❌ Kamu belum mempunyai akses premium.\n\nUntuk mendapatkan akses premium GRATIS:\n➕ Tambahkan bot ke grup minimal ${MIN_GROUP_FOR_PREMIUM} grup\n✅ Maka kamu otomatis jadi user premium.\n\nJika sudah, kirim pesan ulang.`);
    return;
  }
});

// Fitur /sharemsg
bot.onText(/\/sharemsg (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const messageToSend = match[1];

  if (!messageToSend) {
    bot.sendMessage(chatId, 'Mohon tulis pesan yang ingin dikirim.');
    return;
  }

  if (groups.length === 0) {
    bot.sendMessage(chatId, 'Belum ada grup untuk dikirim pesan.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  bot.sendMessage(chatId, `Mulai mengirim pesan ke ${groups.length} grup...`);

  for (let i = 0; i < groups.length; i++) {
    try {
      await bot.sendMessage(groups[i], messageToSend);
      successCount++;
    } catch (err) {
      failCount++;
    }
  }

  // Kirim hasil akhir
  const resultMessage = `
✅ Share berhasil

📊 Hasil:
📝 Jumlah grup : ${groups.length}
✅ Berhasil : ${successCount}
❌ Gagal : ${failCount}
`;

  bot.sendMessage(chatId, resultMessage);
});

// Fitur /broadcast
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const messageToSend = match[1];

  if (!messageToSend) {
    bot.sendMessage(chatId, 'Mohon tulis pesan yang ingin dibroadcast.');
    return;
  }

  if (users.length === 0) {
    bot.sendMessage(chatId, 'Belum ada pengguna untuk dikirim pesan.');
    return;
  }

  bot.sendMessage(chatId, `🚀 Memulai broadcast ke ${users.length} pengguna...`);

  let successCount = 0;
  let failCount = 0;

  // Proses pengiriman ke semua pengguna
  for (let i = 0; i < users.length; i++) {
    try {
      await bot.sendMessage(users[i], messageToSend);
      successCount++;
    } catch (err) {
      failCount++;
    }
  }

  // Pesan akhir setelah selesai
  bot.sendMessage(chatId, `
✅ Broadcast selesai!

📊 Hasil:
📝 Jumlah pengguna: ${users.length}
✅ Sukses: ${successCount}
❌ Gagal: ${failCount}
`);
});

// Fitur /settxt untuk mengatur pesan otomatis
bot.onText(/\/settxt (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const newMessage = match[1];

  if (!newMessage) {
    bot.sendMessage(chatId, '⚠️ Mohon tulis pesan yang ingin diatur.');
    return;
  }

  autoMessage = newMessage;
  bot.sendMessage(chatId, `✅ Pesan otomatis berhasil diubah menjadi:\n\n${autoMessage}`);
});

// Fitur /setjeda untuk mengatur jeda pengiriman (dalam detik)
bot.onText(/\/setjeda (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const newDelay = parseInt(match[1]);

  if (isNaN(newDelay) || newDelay < 1) {
    bot.sendMessage(chatId, '⚠️ Mohon masukkan angka jeda yang valid (minimal 1 detik).');
    return;
  }

  autoDelay = newDelay;
  bot.sendMessage(chatId, `✅ Jeda pengiriman otomatis berhasil diubah menjadi ${autoDelay} detik.`);
});

// Fitur /auto on/off
bot.onText(/\/auto (on|off)/, (msg, match) => {
  const chatId = msg.chat.id;
  const action = match[1];

  if (action === 'on') {
    if (autoBroadcast) {
      bot.sendMessage(chatId, '⚠️ Auto share sudah aktif.');
      return;
    }

    if (groups.length === 0) {
      bot.sendMessage(chatId, 'Belum ada grup untuk mengirim pesan otomatis.');
      return;
    }

    autoBroadcast = true;
    adminChatId = chatId; // simpan admin untuk log

    bot.sendMessage(chatId, `✅ Auto share diaktifkan.\nPesan akan dikirim ke ${groups.length} grup setiap ${autoDelay} detik.`);

    // Kirim pesan otomatis setiap autoDelay detik
    autoInterval = setInterval(async () => {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < groups.length; i++) {
        try {
          await bot.sendMessage(groups[i], autoMessage);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      // Kirim log hasil ke admin
      if (adminChatId) {
        bot.sendMessage(adminChatId, `
📊 Log Auto Share:

📝 Jumlah grup: ${groups.length}
✅ Sukses: ${successCount}
❌ Gagal: ${failCount}
`);
      }

    }, autoDelay * 1000); // konversi ke milidetik

  } else if (action === 'off') {
    if (!autoBroadcast) {
      bot.sendMessage(chatId, '⚠️ Auto share sudah nonaktif.');
      return;
    }

    autoBroadcast = false;
    clearInterval(autoInterval);
    autoInterval = null;
    adminChatId = null;

    bot.sendMessage(chatId, '✅ Auto share dimatikan.');
  }
});

// Fitur /addown
bot.onText(/\/addown (\d+)/, (msg, match) => {
  if (msg.from.id !== OWNER_ID) return; 
  const id = parseInt(match[1]);
  if (isNaN(id)) return bot.sendMessage(msg.chat.id, '❌ ID tidak valid');
  const owners = getOwners();
  if (owners.includes(id)) return bot.sendMessage(msg.chat.id, `⚠️ User ${id} sudah jadi owner`);
  owners.push(id);
  saveOwners(owners);
  bot.sendMessage(msg.chat.id, `✅ User ${id} ditambahkan sebagai owner tambahan`);
});

// Hapus owner (hanya owner asli)
bot.onText(/\/delown (\d+)/, (msg, match) => {
  if (msg.from.id !== OWNER_ID) return; 
  const id = parseInt(match[1]);
  let owners = getOwners();
  if (!owners.includes(id)) return bot.sendMessage(msg.chat.id, `⚠️ User ${id} bukan owner tambahan`);
  owners = owners.filter(x => x !== id);
  saveOwners(owners);
  bot.sendMessage(msg.chat.id, `✅ User ${id} dihapus dari owner tambahan`);
});

// List owner (hanya owner asli)
bot.onText(/\/listown/, (msg) => {
  if (msg.from.id !== OWNER_ID) return; 
  const owners = getOwners();
  if (!owners.length) return bot.sendMessage(msg.chat.id, "📭 Belum ada owner tambahan");
  const list = owners.map((id, i) => `${i + 1}. ${id}`).join("\n");
  bot.sendMessage(msg.chat.id, `👑 Daftar Owner Tambahan:\n\n${list}`, { parse_mode: 'Markdown' });
});

// Fitur /addprem
bot.onText(/\/addprem (\d+) (\d+)/, (msg, match) => {
  const fromId = msg.from.id;
  if (fromId !== OWNER_ID) return;

  const userId = parseInt(match[1]);
  const days = parseInt(match[2]);

  if (isNaN(userId) || isNaN(days) || days <= 0) {
    return bot.sendMessage(fromId, '❌ Format salah. Contoh: /addprem 123456789 30');
  }

  addPremium(userId, days, 'manual');
  bot.sendMessage(fromId, `✅ User ${userId} telah diberi premium selama ${days} hari.`);
});

bot.onText(/\/delprem (\d+)/, (msg, match) => {
  const fromId = msg.from.id;
  if (fromId !== OWNER_ID) return;

  const userId = parseInt(match[1]);
  removePremium(userId);

  bot.sendMessage(fromId, `🗑️ Premium user ${userId} telah dihapus.`);
});

bot.onText(/\/listprem/, (msg) => {
  const fromId = msg.from.id;
  if (fromId !== OWNER_ID) return;

  const db = getPremium();
  const now = Date.now();

  if (!Object.keys(db).length) {
    return bot.sendMessage(fromId, '📭 Belum ada user premium.');
  }

  const list = Object.entries(db)
    .filter(([_, val]) => val.until > now)
    .map(([id, val]) => {
      const sisa = Math.ceil((val.until - now) / (1000 * 60 * 60 * 24));
      const asal = val.via === 'grup' ? '📌 via grup' : '✍️ manual';
      return `🆔 ${id} - ⏳ ${sisa} hari - ${asal}`;
    })
    .join('\n');

  bot.sendMessage(fromId, `📋 *List User Premium:*\n\n${list}`, { parse_mode: 'Markdown' });
});

// Inisialisasi Bot
bot.getMe().then(botInfo => {
  bot.botInfo = botInfo;
  console.log(`🤖 Bot aktif sebagai @${botInfo.username}`);
});