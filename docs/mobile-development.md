# Mobile development

Install the development build once with `bun run ios` (simulator) or
`bun run ios -- --device` (connected iPhone). Rebuild when native dependencies
or native configuration change.

For everyday simulator work, use `bun run ios:run`. It opens the installed
development build through localhost on port 8081, so the simulator connection
does not depend on the Mac's Wi-Fi address. The command resolves localhost to IPv4 first so Metro listens on the same `127.0.0.1` address that the development client opens. Fast Refresh stays enabled.

For a physical iPhone, use `bun run start` and scan the QR with the development
build installed. Keep the phone and Mac on the same network. Stop the existing
Metro process before switching between simulator and phone commands.

If Expo gets stuck displaying **Refreshing...**, run `bun run ios:refresh` in
another terminal. It checks that port 8081 serves Memento and relaunches the
installed simulator app through localhost, preserving login and app data.
This command requires a booted simulator and a running Metro server.

Normal starts retain Metro's transform cache. Use `bun run start:clear` only
when troubleshooting stale transforms; clearing it on every start forces a
full rebuild of the JavaScript bundle.
