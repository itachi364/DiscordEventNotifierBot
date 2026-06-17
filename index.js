import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder
} from 'discord.js';

const {
  DISCORD_TOKEN,
  EVENTS_CHANNEL_ID,
  MENTION_MODE = 'everyone',
  NOTIFY_ROLE_ID
} = process.env;

if (!DISCORD_TOKEN) {
  console.error('ERROR: Falta DISCORD_TOKEN en el archivo .env');
  process.exit(1);
}

if (!EVENTS_CHANNEL_ID) {
  console.error('ERROR: Falta EVENTS_CHANNEL_ID en el archivo .env');
  process.exit(1);
}

if (MENTION_MODE === 'role' && !NOTIFY_ROLE_ID) {
  console.error('ERROR: Si MENTION_MODE=role debes configurar NOTIFY_ROLE_ID');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents
  ]
});

client.once(Events.ClientReady, async (c) => {
  console.log(`EventNotifierBot conectado como ${c.user.tag}`);
  console.log(`Cliente ID: ${c.user.id}`);

  console.log('Servidores donde está el bot:');
  for (const guild of c.guilds.cache.values()) {
    console.log(`- ${guild.name} (${guild.id})`);
  }

  try {
    const channel = await c.channels.fetch(EVENTS_CHANNEL_ID);

    if (!channel) {
      console.error(`No se encontró el canal con ID ${EVENTS_CHANNEL_ID}`);
      return;
    }

    console.log(`Canal encontrado: ${channel.name} (${channel.id})`);

    if (!channel.isTextBased()) {
      console.error('El canal configurado no es de texto.');
      return;
    }

    await channel.send('✅ EventNotifierBot está conectado y puede escribir en este canal.');
    console.log('Mensaje de prueba enviado correctamente.');
  } catch (error) {
    console.error('Error enviando mensaje de prueba:', error);
  }
});

function buildMention() {
  if (MENTION_MODE === 'everyone') {
    return '@everyone';
  }

  if (MENTION_MODE === 'role') {
    return `<@&${NOTIFY_ROLE_ID}>`;
  }

  return '';
}

function buildAllowedMentions() {
  if (MENTION_MODE === 'everyone') {
    return { parse: ['everyone'] };
  }

  if (MENTION_MODE === 'role') {
    return { parse: [], roles: [NOTIFY_ROLE_ID] };
  }

  return { parse: [] };
}

function formatDiscordTimestamp(timestamp, fallback = 'No definido') {
  if (!timestamp) return fallback;
  return `<t:${Math.floor(timestamp / 1000)}:F>`;
}

function resolveLocation(event) {
  if (event.channelId) {
    return `<#${event.channelId}>`;
  }

  if (event.entityMetadata?.location) {
    return event.entityMetadata.location;
  }

  return 'No definida';
}

client.on(Events.GuildScheduledEventCreate, async (event) => {
  console.log('GuildScheduledEventCreate recibido');
  console.log(`Evento: ${event.name}`);
  console.log(`Evento ID: ${event.id}`);
  console.log(`Guild ID: ${event.guildId}`);

  try {
    const channel = await event.guild.channels.fetch(EVENTS_CHANNEL_ID).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      console.warn(`No se encontro un canal de texto valido con ID ${EVENTS_CHANNEL_ID}`);
      return;
    }

    const eventUrl = `https://discord.com/events/${event.guild.id}/${event.id}`;
    const mention = buildMention();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📅 Nuevo evento creado')
      .setDescription(event.description || 'Se ha creado un nuevo evento en el servidor.')
      .addFields(
        { name: 'Evento', value: event.name, inline: false },
        { name: 'Inicio', value: formatDiscordTimestamp(event.scheduledStartTimestamp), inline: true },
        { name: 'Fin', value: formatDiscordTimestamp(event.scheduledEndTimestamp), inline: true },
        { name: 'Ubicacion', value: resolveLocation(event), inline: false },
        { name: 'Enlace', value: `[Ver evento](${eventUrl})`, inline: false }
      )
      .setTimestamp();

    const content = `${mention} 📢 **Nuevo evento creado:** ${event.name}`.trim();

    await channel.send({
      content,
      embeds: [embed],
      allowedMentions: buildAllowedMentions()
    });

    console.log(`Notificacion enviada para el evento ${event.name} (${event.id})`);
  } catch (error) {
    console.error('Error notificando evento creado:', error);
  }
});

client.on('raw', (packet) => {
  if (packet.t?.includes('GUILD_SCHEDULED_EVENT')) {
    console.log('RAW EVENT:', packet.t);
    console.log(JSON.stringify(packet.d, null, 2));
  }
});

client.login(DISCORD_TOKEN);
