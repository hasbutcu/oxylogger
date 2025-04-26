Oxylogger
Oxylogger, Discord.js tabanlı botlar için dinamik bir loglama aracıdır. Sunucudaki olayları (mesaj silme, üye giriş/çıkış, kanal oluşturma/silme vb.) izler ve belirlenen bir log kanalına ayrıntılı embed mesajları gönderir. Özelleştirilebilir komutlar ve prefix ile kullanımı kolaydır.
Özellikler

Çok Yönlü Loglama: Mesaj silme, düzenleme, üye giriş/çıkış, rol/kana/emoji değişiklikleri gibi 20+ farklı olayı destekler.
Özelleştirilebilir Komutlar: Log kanalını ayarlamak ve kaldırmak için prefix ve komut adlarını değiştirebilirsiniz.
Embed Tabanlı Loglar: Renkli ve düzenli embed mesajlarla olayları görselleştirir.
Hata Yönetimi: Güvenilir hata yakalama ve konsol çıktıları ile sorun giderme kolaylığı.

Kurulum

Paketi Yükleyin:
npm install oxylogger


Gerekli Bağımlılıklar:

discord.js (v14 veya üstü)
croxydb

npm install discord.js croxydb



Kullanım
Temel Örnek
Aşağıdaki kod, Oxylogger’ı botunuza entegre etmenin basit bir yolunu gösterir:
const { Client, GatewayIntentBits } = require('discord.js');
const Logger = require('oxylogger');

// Discord client’ını oluştur
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Logger’ı başlat
const logger = new Logger(client);

// Botu başlat
client.login('BOT_TOKENINIZ');

Komutlar

Log Kanalı Ayarlama:

Varsayılan komut: !log-ekle #log-kanali
Örnek: Bir log kanalı ayarlamak için sunucuda yönetici yetkisine sahip bir kullanıcı olarak:!log-ekle #bot-log




Log Kanalı Kaldırma:

Varsayılan komut: !log-sil
Örnek:!log-sil





Ayarları Özelleştirme
Komut prefix’ini ve komut adlarını değiştirebilirsiniz:
logger.options = {
  prefix: '?',           // Yeni prefix
  logac: 'logayarla',    // Log kanalı ayarlama komutu
  logkapa: 'logkapat'    // Log kanalı kaldırma komutu
};

Bu ayarlarla komutlar:

?logayarla #log-kanali
?logkapat

Özelleştirilmiş Ayarlarla Örnek
Aşağıdaki kod, özelleştirilmiş ayarlarla logger’ın nasıl kullanılacağını gösterir:
const { Client, GatewayIntentBits } = require('discord.js');
const Logger = require('oxylogger');

// Discord client’ını oluştur
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Logger’ı başlat
const logger = new Logger(client);

// Komutları özelleştir
logger.options = {
  prefix: '?',
  logac: 'logayarla',
  logkapa: 'logkapat'
};

// Botu başlat
client.login('BOT_TOKENINIZ');

// Bot hazır olduğunda konsola mesaj yaz
client.on('ready', () => {
  console.log(`Bot ${client.user.tag} olarak aktif! Log komutları: ?logayarla ve ?logkapat`);
});

Desteklenen Olaylar
Oxylogger, aşağıdaki olayları otomatik olarak izler ve loglar:

Mesaj silme, düzenleme, sabitleme/kaldırma
Üye giriş/çıkış, ban ekleme/kaldırma, rol güncellemeleri
Kanal, rol, emoji, davet, webhook ve entegrasyon oluşturma/silme/güncelleme
Ses kanalı hareketleri (katılma, ayrılma, kanal değiştirme)
Sunucu güncellemeleri (isim, ikon, bölge)

Gereksinimler

Node.js v16 veya üstü
Discord.js v14 veya üstü
croxydb
Botunuzun gerekli Discord izinleri (yönetici yetkisi önerilir)

Katkıda Bulunma
Hataları bildirmek veya yeni özellikler önermek için GitHub deposuna pull request veya issue gönderebilirsiniz.
Lisans
Bu proje MIT Lisansı altında lisanslanmıştır.
İletişim
Sorularınız için GitHub Issues üzerinden veya npm paket sayfasından iletişime geçebilirsiniz.
