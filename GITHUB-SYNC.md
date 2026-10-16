# GitHub saved-location sync

The weather dashboard can keep its user-saved quick locations in:

`data/saved-locations.json`

Every browser can download that file because this repository is public. Adding or removing a saved location requires a fine-grained GitHub personal access token on the device making the change.

## Connect a device that will edit locations

1. Open the weather dashboard and select **GitHub sync**.
2. Follow the token-creation link in the dialog.
3. Set the resource owner to `Minecraftman04`.
4. Limit repository access to **Only select repositories**, then select `Weather-App`.
5. Under repository permissions, grant **Contents: Read and write** only.
6. Generate the token, paste it into the dashboard, and select **Save token & sync**.
7. Select **Remember the token on this device** only on a device and browser profile you trust.

The token is sent only to the GitHub REST API and is never written to the repository. Without the remember option, it is kept only for the current browser session.

## How syncing behaves

- Page loads download the current GitHub copy.
- Saving or removing a location updates the local browser immediately, then commits the shared JSON file when a valid token is available.
- Existing browser-only locations are preserved and offered for upload the first time sync is connected.
- Devices without a token can still read the shared list, but cannot publish changes.
- If a device has an unsynced local change, the dashboard keeps it instead of silently overwriting it.
- Simultaneous edits use last-write-wins behaviour.

## Privacy warning

This repository is public. Synced place names and coordinates are visible in the JSON file and remain in Git commit history even after a location is removed. Do not sync home, work, launch, or other coordinates that should remain private.

For private saved locations, move `data/saved-locations.json` to a private data repository and change the constants at the top of `github-sync.js`. Every device would then need an authorised token to read as well as write the file.
