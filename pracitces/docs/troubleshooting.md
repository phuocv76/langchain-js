# Troubleshooting

## The app shows a 500 error on upload

This usually means the file exceeded the per-request size limit (100 MB) or the
storage quota is full. Check Settings > Usage. For files over 100 MB, use the
resumable upload API.

## Sync is stuck or slow

Force a resync from Settings > Sync > Resync. If it persists, it is often a
network/proxy issue or an expired auth token. Re-authenticate from Settings >
Security. Report persistent sync failures as a bug with your project id.

## Webhooks are not firing

Verify the endpoint returns 2xx within 10 seconds, the secret matches, and the
event type is subscribed. Failed deliveries are retried 5 times with backoff.

## API returns 401 Unauthorized

Your API key is missing, revoked, or expired. Generate a new key in
Settings > API Keys and update your client. Keys are shown only once.

## Known incidents

Check status.acme.example for ongoing incidents before filing a bug report.
