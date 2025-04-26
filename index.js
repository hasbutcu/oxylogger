const {
  Client,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
  AuditLogEvent,
} = require("discord.js");
const db = require("croxydb");

class Logger {
  constructor(client) {
    if (!client)
      throw new Error(
        "Hata: Client parametresi eksik! Discord.js client’ını girmen lazım."
      );
    this.client = client;

    this._options = {
      prefix: "!",
      setLog: "log-ekle",
      removeLog: "log-sil",
    };

    this.client.on("messageCreate", (message) => this.handleCommand(message));

    this.setupEvents();

    console.log(
      `📋 Logger hazır! Varsayılan komutlar: "${this._options.prefix}${this._options.setLog}" ve "${this._options.prefix}${this._options.removeLog}"`
    );
  }

  set options({ prefix, logac, logkapa }) {
    this._options = {
      prefix: this.validatePrefix(prefix),
      setLog: this.validateCommand(logac, "log-ekle"),
      removeLog: this.validateCommand(logkapa, "log-sil"),
    };
    console.log(
      `🔄 Ayarlar güncellendi! Yeni komutlar: "${this._options.prefix}${this._options.setLog}" ve "${this._options.prefix}${this._options.removeLog}"`
    );
  }

  get options() {
    return this._options;
  }

  validatePrefix(prefix) {
    if (!prefix || typeof prefix !== "string" || prefix.trim() === "") {
      console.warn('⚠️ Prefix boş veya garip, varsayılan kullanıyorum: "!"');
      return "!";
    }
    const cleanPrefix = prefix.trim().slice(0, 5);
    if (cleanPrefix.match(/[^a-zA-Z0-9?!\/]/)) {
      console.warn(
        `⚠️ Prefix’te tuhaf şeyler var ("${cleanPrefix}"), varsayılan kullanıyorum: "!"`
      );
      return "!";
    }
    return cleanPrefix;
  }

  validateCommand(command, defaultCommand) {
    if (!command || typeof command !== "string" || command.trim() === "") {
      console.warn(
        `⚠️ Komut adı boş veya garip, varsayılan kullanıyorum: "${defaultCommand}"`
      );
      return defaultCommand;
    }
    const cleanCommand = command
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 20);
    if (!cleanCommand) {
      console.warn(
        `⚠️ Komut adı geçersiz ("${command}"), varsayılan kullanıyorum: "${defaultCommand}"`
      );
      return defaultCommand;
    }
    return cleanCommand;
  }

  async setLogChannel(guildId, channelId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId);

      if (!channel || channel.type !== ChannelType.GuildText) {
        throw new Error("Geçerli bir metin kanalı belirtmelisiniz.");
      }

      db.set(`logChannel_${guildId}`, channelId);
      console.log(`✅ Log kanalı ayarlandı: ${guildId} -> ${channelId}`);
      return {
        success: true,
        message: `Log kanalı <#${channelId}> olarak ayarlandı.`,
      };
    } catch (error) {
      console.error(`❌ Log kanalı ayarlama hatası:`, error.message);
      return { success: false, message: `Hata: ${error.message}` };
    }
  }

  async removeLogChannel(guildId) {
    db.delete(`logChannel_${guildId}`);
    return { success: true, message: "Log kanalı kaldırıldı." };
  }

  async sendLog(guildId, embed) {
    const channelId = db.get(`logChannel_${guildId}`);
    if (!channelId) return;

    try {
      const guild = await this.client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId);
      if (channel && channel.type === ChannelType.GuildText) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error(`❌ Log gönderilemedi (${guildId}):`, error.message);
    }
  }

  setupEvents() {
    this.client.on("messageDelete", async (message) => {
      if (!message.guild || message.author.bot) return;
      const auditLogs = await message.guild
        .fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor =
        log && log.target.id === message.author.id
          ? log.executor.tag
          : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Mesaj Silindi")
        .addFields(
          {
            name: "Kullanıcı",
            value: `${message.author.tag} (${message.author.id})`,
            inline: true,
          },
          { name: "Kanal", value: `<#${message.channel.id}>`, inline: true },
          { name: "Mesaj İçeriği", value: message.content || "Yok" },
          { name: "Silen", value: executor, inline: true },
          {
            name: "Silinme Zamanı",
            value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: true,
          }
        )
        .setTimestamp();
      await this.sendLog(message.guild.id, embed);
    });

    this.client.on("messageUpdate", async (oldMessage, newMessage) => {
      if (
        !newMessage.guild ||
        newMessage.author.bot ||
        oldMessage.content === newMessage.content
      )
        return;
      const embed = new EmbedBuilder()
        .setColor("#FFFF00")
        .setTitle("Mesaj Düzenlendi")
        .addFields(
          {
            name: "Kullanıcı",
            value: `${newMessage.author.tag} (${newMessage.author.id})`,
            inline: true,
          },
          { name: "Kanal", value: `<#${newMessage.channel.id}>`, inline: true },
          { name: "Eski İçerik", value: oldMessage.content || "Yok" },
          { name: "Yeni İçerik", value: newMessage.content || "Yok" },
          { name: "Düzenleyen", value: newMessage.author.tag, inline: true }
        )
        .setTimestamp();
      await this.sendLog(newMessage.guild.id, embed);
    });

    this.client.on("messagePin", async (message) => {
      if (!message.guild) return;
      const auditLogs = await message.guild
        .fetchAuditLogs({ type: AuditLogEvent.MessagePin, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#00FFFF")
        .setTitle("Mesaj Sabitlendi")
        .addFields(
          {
            name: "Kullanıcı",
            value: `${message.author.tag} (${message.author.id})`,
            inline: true,
          },
          { name: "Kanal", value: `<#${message.channel.id}>`, inline: true },
          { name: "Mesaj İçeriği", value: message.content || "Yok" },
          { name: "Sabitleyen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(message.guild.id, embed);
    });

    this.client.on("messageUnpin", async (message) => {
      if (!message.guild) return;
      const auditLogs = await message.guild
        .fetchAuditLogs({ type: AuditLogEvent.MessageUnpin, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF5555")
        .setTitle("Mesaj Sabit Kaldırıldı")
        .addFields(
          {
            name: "Kullanıcı",
            value: `${message.author.tag} (${message.author.id})`,
            inline: true,
          },
          { name: "Kanal", value: `<#${message.channel.id}>`, inline: true },
          { name: "Mesaj İçeriği", value: message.content || "Yok" },
          { name: "Kaldıran", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(message.guild.id, embed);
    });

    this.client.on("guildMemberAdd", async (member) => {
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Yeni Üye Katıldı")
        .addFields(
          {
            name: "Kullanıcı",
            value: `${member.user.tag} (${member.user.id})`,
            inline: true,
          },
          {
            name: "Katılma Tarihi",
            value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
      await this.sendLog(member.guild.id, embed);
    });

    this.client.on("guildMemberRemove", async (member) => {
      const auditLogs = await member.guild
        .fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor =
        log && log.target.id === member.user.id
          ? log.executor.tag
          : "Bilinmiyor";
      const action =
        log && log.target.id === member.user.id ? "Atıldı" : "Ayrıldı";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle(`Üye ${action}`)
        .addFields(
          {
            name: "Kullanıcı",
            value: `${member.user.tag} (${member.user.id})`,
            inline: true,
          },
          { name: "Eylem", value: action, inline: true },
          { name: "Yapan", value: executor, inline: true },
          { name: "Zaman", value: `<t:${Math.floor(Date.now() / 1000)}:R>` }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
      await this.sendLog(member.guild.id, embed);
    });

    this.client.on("guildMemberUpdate", async (oldMember, newMember) => {
      if (oldMember.nickname !== newMember.nickname) {
        const auditLogs = await newMember.guild
          .fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 })
          .catch(() => null);
        const log = auditLogs?.entries.first();
        const executor =
          log && log.changes.some((c) => c.key === "nick")
            ? log.executor.tag
            : "Bilinmiyor";
        const embed = new EmbedBuilder()
          .setColor("#FFA500")
          .setTitle("Üye Takma Adı Değişti")
          .addFields(
            {
              name: "Kullanıcı",
              value: `${newMember.user.tag} (${newMember.user.id})`,
              inline: true,
            },
            {
              name: "Eski Takma Ad",
              value: oldMember.nickname || "Yok",
              inline: true,
            },
            {
              name: "Yeni Takma Ad",
              value: newMember.nickname || "Yok",
              inline: true,
            },
            { name: "Değiştiren", value: executor, inline: true }
          )
          .setTimestamp();
        await this.sendLog(newMember.guild.id, embed);
      }

      const addedRoles = newMember.roles.cache.filter(
        (r) => !oldMember.roles.cache.has(r.id)
      );
      const removedRoles = oldMember.roles.cache.filter(
        (r) => !newMember.roles.cache.has(r.id)
      );
      if (addedRoles.size > 0) {
        const auditLogs = await newMember.guild
          .fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 })
          .catch(() => null);
        const log = auditLogs?.entries.first();
        const executor = log ? log.executor.tag : "Bilinmiyor";
        const embed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("Üyeye Rol Eklendi")
          .addFields(
            {
              name: "Kullanıcı",
              value: `${newMember.user.tag} (${newMember.user.id})`,
              inline: true,
            },
            {
              name: "Eklenen Roller",
              value: addedRoles.map((r) => `<@&${r.id}>`).join(", "),
            },
            { name: "Ekleyen", value: executor, inline: true }
          )
          .setTimestamp();
        await this.sendLog(newMember.guild.id, embed);
      }
      if (removedRoles.size > 0) {
        const auditLogs = await newMember.guild
          .fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 })
          .catch(() => null);
        const log = auditLogs?.entries.first();
        const executor = log ? log.executor.tag : "Bilinmiyor";
        const embed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("Üyeden Rol Kaldırıldı")
          .addFields(
            {
              name: "Kullanıcı",
              value: `${newMember.user.tag} (${newMember.user.id})`,
              inline: true,
            },
            {
              name: "Kaldırılan Roller",
              value: removedRoles.map((r) => `<@&${r.id}>`).join(", "),
            },
            { name: "Kaldıran", value: executor, inline: true }
          )
          .setTimestamp();
        await this.sendLog(newMember.guild.id, embed);
      }
    });

    this.client.on("channelCreate", async (channel) => {
      if (!channel.guild) return;
      const auditLogs = await channel.guild
        .fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Kanal Oluşturuldu")
        .addFields(
          {
            name: "Kanal",
            value: `<#${channel.id}> (${channel.name})`,
            inline: true,
          },
          {
            name: "Tür",
            value:
              channel.type === ChannelType.GuildText
                ? "Metin"
                : channel.type === ChannelType.GuildVoice
                ? "Ses"
                : "Diğer",
            inline: true,
          },
          { name: "Oluşturan", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(channel.guild.id, embed);
    });

    this.client.on("channelDelete", async (channel) => {
      if (!channel.guild) return;
      const auditLogs = await channel.guild
        .fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Kanal Silindi")
        .addFields(
          { name: "Kanal Adı", value: channel.name, inline: true },
          {
            name: "Tür",
            value:
              channel.type === ChannelType.GuildText
                ? "Metin"
                : channel.type === ChannelType.GuildVoice
                ? "Ses"
                : "Diğer",
            inline: true,
          },
          { name: "Silen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(channel.guild.id, embed);
    });

    this.client.on("channelUpdate", async (oldChannel, newChannel) => {
      if (!newChannel.guild) return;
      const auditLogs = await newChannel.guild
        .fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      let changes = [];
      if (oldChannel.name !== newChannel.name) {
        changes.push(`**İsim**: "${oldChannel.name}" → "${newChannel.name}"`);
      }
      if (oldChannel.topic !== newChannel.topic) {
        changes.push(
          `**Konu**: "${oldChannel.topic || "Yok"}" → "${
            newChannel.topic || "Yok"
          }"`
        );
      }
      if (changes.length === 0) return;
      const embed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("Kanal Güncellendi")
        .addFields(
          { name: "Kanal", value: `<#${newChannel.id}>`, inline: true },
          { name: "Değişiklikler", value: changes.join("\n") },
          { name: "Güncelleyen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(newChannel.guild.id, embed);
    });

    this.client.on("roleCreate", async (role) => {
      const auditLogs = await role.guild
        .fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Rol Oluşturuldu")
        .addFields(
          { name: "Rol", value: `<@&${role.id}> (${role.name})`, inline: true },
          { name: "Renk", value: role.hexColor, inline: true },
          { name: "Oluşturan", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(role.guild.id, embed);
    });

    this.client.on("roleDelete", async (role) => {
      const auditLogs = await role.guild
        .fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Rol Silindi")
        .addFields(
          { name: "Rol Adı", value: role.name, inline: true },
          { name: "Renk", value: role.hexColor, inline: true },
          { name: "Silen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(role.guild.id, embed);
    });

    this.client.on("roleUpdate", async (oldRole, newRole) => {
      const auditLogs = await newRole.guild
        .fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      let changes = [];
      if (oldRole.name !== newRole.name) {
        changes.push(`**İsim**: "${oldRole.name}" → "${newRole.name}"`);
      }
      if (oldRole.color !== newRole.color) {
        changes.push(`**Renk**: "${oldRole.hexColor}" → "${newRole.hexColor}"`);
      }
      if (changes.length === 0) return;
      const embed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("Rol Güncellendi")
        .addFields(
          { name: "Rol", value: `<@&${newRole.id}>`, inline: true },
          { name: "Değişiklikler", value: changes.join("\n") },
          { name: "Güncelleyen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(newRole.guild.id, embed);
    });

    this.client.on("guildBanAdd", async (ban) => {
      const auditLogs = await ban.guild
        .fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Üye Banlandı")
        .addFields(
          {
            name: "Kullanıcı",
            value: `${ban.user.tag} (${ban.user.id})`,
            inline: true,
          },
          { name: "Sebep", value: ban.reason || "Belirtilmemiş", inline: true },
          { name: "Banlayan", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(ban.guild.id, embed);
    });

    this.client.on("guildBanRemove", async (ban) => {
      const auditLogs = await ban.guild
        .fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Üye Ban Kaldırıldı")
        .addFields(
          {
            name: "Kullanıcı",
            value: `${ban.user.tag} (${ban.user.id})`,
            inline: true,
          },
          { name: "Kaldıran", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(ban.guild.id, embed);
    });

    this.client.on("emojiCreate", async (emoji) => {
      const auditLogs = await emoji.guild
        .fetchAuditLogs({ type: AuditLogEvent.EmojiCreate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Emoji Oluşturuldu")
        .addFields(
          { name: "Emoji", value: `${emoji.name} (${emoji.id})`, inline: true },
          { name: "Oluşturan", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(emoji.guild.id, embed);
    });

    this.client.on("emojiDelete", async (emoji) => {
      const auditLogs = await emoji.guild
        .fetchAuditLogs({ type: AuditLogEvent.EmojiDelete, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Emoji Silindi")
        .addFields(
          { name: "Emoji Adı", value: emoji.name, inline: true },
          { name: "Silen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(emoji.guild.id, embed);
    });

    this.client.on("inviteCreate", async (invite) => {
      const auditLogs = await invite.guild
        .fetchAuditLogs({ type: AuditLogEvent.InviteCreate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log
        ? log.executor.tag
        : invite.inviter
        ? invite.inviter.tag
        : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Davet Oluşturuldu")
        .addFields(
          { name: "Davet Kodu", value: invite.code, inline: true },
          { name: "Oluşturan", value: executor, inline: true },
          { name: "Kanal", value: `<#${invite.channel.id}>`, inline: true }
        )
        .setTimestamp();
      await this.sendLog(invite.guild.id, embed);
    });

    this.client.on("inviteDelete", async (invite) => {
      const auditLogs = await invite.guild
        .fetchAuditLogs({ type: AuditLogEvent.InviteDelete, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Davet Silindi")
        .addFields(
          { name: "Davet Kodu", value: invite.code, inline: true },
          { name: "Silen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(invite.guild.id, embed);
    });

    this.client.on("guildUpdate", async (oldGuild, newGuild) => {
      const auditLogs = await newGuild
        .fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      let changes = [];
      if (oldGuild.name !== newGuild.name) {
        changes.push(`**İsim**: "${oldGuild.name}" → "${newGuild.name}"`);
      }
      if (oldGuild.icon !== newGuild.icon) {
        changes.push(`**İkon**: Değiştirildi`);
      }
      if (oldGuild.region !== newGuild.region) {
        changes.push(
          `**Bölge**: "${oldGuild.region || "Yok"}" → "${
            newGuild.region || "Yok"
          }"`
        );
      }
      if (changes.length === 0) return;
      const embed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("Sunucu Güncellendi")
        .addFields(
          { name: "Sunucu", value: newGuild.name, inline: true },
          { name: "Değişiklikler", value: changes.join("\n") },
          { name: "Güncelleyen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(newGuild.id, embed);
    });

    this.client.on("webhookCreate", async (webhook) => {
      const auditLogs = await webhook.guild
        .fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Webhook Oluşturuldu")
        .addFields(
          { name: "Webhook Adı", value: webhook.name, inline: true },
          { name: "Kanal", value: `<#${webhook.channelId}>`, inline: true },
          { name: "Oluşturan", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(webhook.guild.id, embed);
    });

    this.client.on("webhookDelete", async (webhook) => {
      const auditLogs = await webhook.guild
        .fetchAuditLogs({ type: AuditLogEvent.WebhookDelete, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Webhook Silindi")
        .addFields(
          { name: "Webhook Adı", value: webhook.name, inline: true },
          { name: "Kanal", value: `<#${webhook.channelId}>`, inline: true },
          { name: "Silen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(webhook.guild.id, embed);
    });

    this.client.on("integrationCreate", async (integration) => {
      const auditLogs = await integration.guild
        .fetchAuditLogs({ type: AuditLogEvent.IntegrationCreate, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Entegrasyon Eklendi")
        .addFields(
          { name: "Entegrasyon", value: integration.name, inline: true },
          { name: "Ekleyen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(integration.guild.id, embed);
    });

    this.client.on("integrationDelete", async (integration) => {
      const auditLogs = await integration.guild
        .fetchAuditLogs({ type: AuditLogEvent.IntegrationDelete, limit: 1 })
        .catch(() => null);
      const log = auditLogs?.entries.first();
      const executor = log ? log.executor.tag : "Bilinmiyor";
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Entegrasyon Silindi")
        .addFields(
          { name: "Entegrasyon", value: integration.name, inline: true },
          { name: "Silen", value: executor, inline: true }
        )
        .setTimestamp();
      await this.sendLog(integration.guild.id, embed);
    });

    this.client.on("voiceStateUpdate", async (oldState, newState) => {
      const member = newState.member;
      if (!member.guild) return;

      if (!oldState.channel && newState.channel) {
        const embed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("Ses Kanalına Katıldı")
          .addFields(
            {
              name: "Kullanıcı",
              value: `${member.user.tag} (${member.user.id})`,
              inline: true,
            },
            {
              name: "Kanal",
              value: `<#${newState.channel.id}> (${newState.channel.name})`,
              inline: true,
            }
          )
          .setTimestamp();
        await this.sendLog(member.guild.id, embed);
      } else if (oldState.channel && !newState.channel) {
        const embed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("Ses Kanalından Ayrıldı")
          .addFields(
            {
              name: "Kullanıcı",
              value: `${member.user.tag} (${member.user.id})`,
              inline: true,
            },
            {
              name: "Kanal",
              value: `<#${oldState.channel.id}> (${oldState.channel.name})`,
              inline: true,
            }
          )
          .setTimestamp();
        await this.sendLog(member.guild.id, embed);
      } else if (
        oldState.channel &&
        newState.channel &&
        oldState.channel.id !== newState.channel.id
      ) {
        const embed = new EmbedBuilder()
          .setColor("#FFA500")
          .setTitle("Ses Kanalı Değiştirildi")
          .addFields(
            {
              name: "Kullanıcı",
              value: `${member.user.tag} (${member.user.id})`,
              inline: true,
            },
            {
              name: "Eski Kanal",
              value: `<#${oldState.channel.id}> (${oldState.channel.name})`,
              inline: true,
            },
            {
              name: "Yeni Kanal",
              value: `<#${newState.channel.id}> (${newState.channel.name})`,
              inline: true,
            }
          )
          .setTimestamp();
        await this.sendLog(member.guild.id, embed);
      }
    });
  }

  async handleCommand(message) {
    if (message.author.bot || !message.content.startsWith(this._options.prefix))
      return;

    const args = message.content
      .slice(this._options.prefix.length)
      .trim()
      .split(/ +/);
    const command = args.shift().toLowerCase();

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız."
      );
    }

    if (command === this._options.setLog) {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.reply(
          `Lütfen bir metin kanalı etiketleyin (örneğin, ${this._options.prefix}${this._options.setLog} #log-kanali).`
        );
      }

      const result = await this.setLogChannel(message.guild.id, channel.id);
      const embed = new EmbedBuilder()
        .setTitle(result.success ? "✅ Log Kanalı Ayarlandı" : "❌ Hata")
        .setDescription(result.message)
        .setColor(result.success ? "#00FF00" : "#FF0000");
      await message.reply({ embeds: [embed] });
    } else if (command === this._options.removeLog) {
      const result = await this.removeLogChannel(message.guild.id);
      const embed = new EmbedBuilder()
        .setTitle("✅ Log Kanalı Kaldırıldı")
        .setDescription(result.message)
        .setColor("#00FF00");
      await message.reply({ embeds: [embed] });
    }
  }
}

module.exports = Logger;
