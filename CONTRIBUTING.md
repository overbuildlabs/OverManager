# Feedback & Testing

OverManager is closed-source, so this isn't a contribution guide in the usual
sense — but we rely heavily on community testing, especially for miner
hardware we don't own ourselves. This doc covers how to report bugs, request
features, and help test new miner support.

## Reporting bugs

Email [support@overbuildlabs.com](mailto:support@overbuildlabs.com) (or open
a GitHub issue if you have access) with:

- **What happened** — describe the bug clearly
- **What you expected** — what should have happened instead
- **Steps to reproduce** — how to trigger the bug
- **Environment** — OS, OverManager version (Settings → About), miner model if relevant
- **Logs** — if applicable, attach the log file from Settings → Troubleshooting → Open Log Directory

## Requesting features

Email or open an issue describing:

- **What** you'd like to see
- **Why** it would be useful
- **Who** benefits (all users, specific hardware owners, mobile miners, etc.)

## Helping test new miner support

This is the most useful thing the community can do for us. If you have a
miner model OverManager doesn't support yet, or one we've added but haven't
verified on real hardware (check [docs/SUPPORTED_MINERS.md](docs/SUPPORTED_MINERS.md)
and the [CHANGELOG](CHANGELOG.md) for caveats), you can help by:

1. **Confirming it works** — add the device in OverManager and let us know
   whether hashrate, temps, and control actions look correct.
2. **Sharing API details** for unsupported hardware — endpoints, response
   formats, or a packet capture of the miner's existing web UI/API traffic.
   We can usually implement the integration from documentation alone.

## Code style (for reference)

- **Rust:** standard `rustfmt` formatting.
- **TypeScript/React:** functional components, hooks, no class components. Tailwind CSS for styling — match the existing dark theme palette (`bg-dark-800`, `border-slate-700/50`, `text-primary-400`, etc.).
- **No emojis in code or UI** unless explicitly in user-facing branding.
- **Log levels:** `error` for failures that need attention, `warn` for recoverable issues, `info` for significant events (server start, device registration), `debug` for per-poll / high-frequency events.

## Questions?

Email: [support@overbuildlabs.com](mailto:support@overbuildlabs.com)
