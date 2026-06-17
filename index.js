import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder
} from 'discord.js';

const {
  DISCORD_TOKEN,
  GUILD_ID,
  EVENTS_CHANNEL_ID,
  MENTION_MODE = 'everyone',
  NOTIFY_ROLE_ID,
  POLL_INTERVAL_SECONDS = '30'
} = process.env;

if (!DISCORD_TOKEN) {
  console.error('ERROR: Falta DISCORD_TOKEN en el archivo .env');
  process.exit(1);
}

if (!GUILD_ID) {
  console.error('ERROR: Falta GUILD_ID en el archivo .env');
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

const pollIntervalMs = Number(POLL_INTERVAL_SECONDS) * 1000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents
  ]
});

const notifiedEvents = new Set();

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

async function notifyEvent(event, source = 'unknown') {
  if (notifiedEvents.has(event.id)) {
    return;
  }

  const channel = await client.channels.fetch(EVENTS_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    console.error(`No se encontro un canal de texto valido con ID ${EVENTS_CHANNEL_ID}`);
    return;
  }

  const eventUrl = `https://discord.com/events/${event.guildId}/${event.id}`;
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

  notifiedEvents.add(event.id);

  console.log(`Notificacion enviada para el evento ${event.name} (${event.id}) via ${source}`);
}

async function loadExistingEvents() {
  const guild = await client.guilds.fetch(GUILD_ID);
  const events = await guild.scheduledEvents.fetch();

  for (const event of events.values()) {
    notifiedEvents.add(event.id);
  }
}

async function pollScheduledEvents() {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const events = await guild.scheduledEvents.fetch();

    for (const event of events.values()) {
      if (!notifiedEvents.has(event.id)) {
        await notifyEvent(event, 'polling');
      }
    }
  } catch (error) {
    console.error('Error consultando eventos programados:', error);
  }
}

client.once(Events.ClientReady, async (c) => {
  try {
    const channel = await c.channels.fetch(EVENTS_CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      console.error(`Canal de notificaciones invalido: ${EVENTS_CHANNEL_ID}`);
      return;
    }

    await loadExistingEvents();

    setInterval(pollScheduledEvents, pollIntervalMs);

    console.log(`EventNotifierBot conectado como ${c.user.tag}. Polling cada ${POLL_INTERVAL_SECONDS} segundos.`);
  } catch (error) {
    console.error('Error inicializando bot:', error);
  }
});

client.on(Events.GuildScheduledEventCreate, async (event) => {
  try {
    await notifyEvent(event, 'gateway');
  } catch (error) {
    console.error('Error notificando evento creado por gateway:', error);
  }
});

client.login(DISCORD_TOKEN);