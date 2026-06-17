# Discord Event Notifier Bot

Bot de Discord que publica una notificacion en un canal cuando se crea un evento programado en el servidor.

## Requisitos

- Node.js 20
- Bot creado en Discord Developer Portal
- Permisos del bot en el servidor:
  - View Channels
  - Send Messages
  - Mention Everyone, si usas `MENTION_MODE=everyone`
  - Mention Roles, si usas `MENTION_MODE=role`

## Instalacion

```bash
npm install
cp .env.example .env
```

Edita `.env`:

```env
DISCORD_TOKEN=TU_TOKEN_DEL_BOT
EVENTS_CHANNEL_ID=ID_CANAL_EVENTOS
MENTION_MODE=everyone
NOTIFY_ROLE_ID=ID_ROL_NOTIFICACIONES
```

## Modos de mencion

### Mencionar a todos

```env
MENTION_MODE=everyone
```

### Mencionar un rol

```env
MENTION_MODE=role
NOTIFY_ROLE_ID=123456789012345678
```

### No mencionar a nadie

```env
MENTION_MODE=none
```

## Ejecucion local

```bash
npm start
```

## Produccion con PM2

```bash
npm install -g pm2
pm2 start npm --name EventNotifierBot -- start
pm2 save
pm2 startup
```

## Invitacion del bot

En Discord Developer Portal, habilita permisos de bot y agrega el bot al servidor con permisos para leer canales, enviar mensajes y mencionar a everyone/roles si aplica.
