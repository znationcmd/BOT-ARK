# BOT ARK

Discord bot and installable dashboard for ARK communities. French, English, German, Spanish, Italian and Russian. Original dinosaur/crystal artwork, mobile layout and PWA shell.

## Features

- Seasonal battle pass, daily/weekly/season quests, XP, rankings and free/premium reward tracks. Premium applies to one season. Historical progress is preserved.
- Player proof submissions with staff approval; authenticated structured events for automatic progress after staff verifies the game identity. Duplicate events cannot grant XP twice.
- Private support tickets in the dashboard and Discord, optional Discord message transcripts, audit journal and optional staff log channel.
- Nitrado raw log retrieval and manual imports. Raw log lines do not award XP: game events require a trusted structured event producer or staff proof approval. Game item rewards are a staff delivery queue; Discord role rewards can be delivered by the bot.
- Browser AI assistant using Qwen2.5 0.5B via Transformers.js. Users explicitly enable a model download. Performance depends on their device and model availability; the built-in help remains available.
- Owner login, Discord one-use five-minute login links, community isolation, encrypted integration tokens, server sessions in PostgreSQL.

## Railway

Connect `znationcmd/BOT-ARK`, branch `main`. Required variables: `DATABASE_URL`, `SESSION_SECRET` (random, minimum 24 characters), `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, `PUBLIC_BASE_URL`. Set `NODE_ENV=production` and `PORT=8080`. Use `${{Postgres.DATABASE_URL}}` to share an existing PostgreSQL service; all application tables use the `ark_` prefix. Do not change SESSION_SECRET without planning token re-entry.

Set your own `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`, or open Settings in the owner dashboard and enter them. Enable bot invitation with the link displayed after connection. Configure staff role, ticket category and audit channel per Discord community. The bot needs permission to manage ticket channels; role rewards require Manage Roles and a bot role above the delivered role. Optional Discord ticket message ingestion requires `DISCORD_MESSAGE_CONTENT=true` and the Message Content intent enabled in the developer portal.

Use `/dashboard` in Discord for a private dashboard login. Owner accounts can create seasons, quests and rewards, verify game identities and manage premium for the current season. Browser menu → install app, or the dashboard install button. Safari iOS uses Share → Add to Home Screen. Offline mode provides the application shell; authenticated data and mutations require network access.

## Structured event import

Rotate a webhook secret in the dashboard, then POST JSON to `/api/webhook/GUILD_ID` with `Authorization: Bearer SECRET`. Format:

```json
{"events":[{"eventId":"unique-server-event-001","playerId":"verified-player-id","type":"kill","target":"rex","amount":1,"occurredAt":"2026-10-05T19:00:00Z"}]}
```

Supported event kinds are defined in `src/validation.js`. Targets must match quest configuration. Events only credit a verified identity, active season and current quest period; future dates are rejected. Daily and weekly resets use UTC, weeks start Monday.

## Development

Node.js 22+. `npm ci`, copy `.env.example` to `.env`, configure PostgreSQL, then `npm start`. `npm test` runs PostgreSQL-compatible domain/API tests with PGlite, covering isolation, authorization, token encryption, season rollover, deduplication, quest approval and ticket privacy.
