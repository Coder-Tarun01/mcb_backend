# Telegram Webhook Setup Guide

## Problem: "Site Can't Be Reached" Error

The error occurs because:
1. **SSL Certificate Mismatch**: Using IP address (`103.154.233.210`) with HTTPS, but SSL certificates are issued for domain names, not IP addresses
2. **Telegram Requirements**: Telegram requires HTTPS with a valid SSL certificate that matches the webhook URL
3. **Certificate Validation**: Telegram's servers can't validate SSL certificates for IP addresses

## Solutions

### Option 1: Use Domain Name (Recommended for Production)

1. **Point a domain/subdomain to your server IP:**
   ```
   A Record: api.mycareerbuild.com → 103.154.233.210
   ```

2. **Set up SSL Certificate:**
   - Use Let's Encrypt (free): `certbot --nginx` or `certbot --apache`
   - Or use your hosting provider's SSL certificate
   - Ensure certificate is valid and not expired

3. **Update Webhook URL:**
   ```bash
   npm run telegram:set https://api.mycareerbuild.com/api/notifications/telegram/webhook
   ```

### Option 2: Use ngrok (For Testing/Development)

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   # Or use: npm install -g ngrok
   ```

2. **Start your backend server:**
   ```bash
   npm run dev
   ```

3. **Create ngrok tunnel:**
   ```bash
   ngrok http 4000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Set webhook with ngrok URL:**
   ```bash
   npm run telegram:set https://abc123.ngrok.io/api/notifications/telegram/webhook
   ```

   **Note:** ngrok URLs change on free tier. For production, use a paid ngrok account with a static domain.

### Option 3: Configure Server for IP-based SSL (Advanced)

If you must use an IP address:

1. **Get SSL certificate for IP address:**
   - Some CAs issue certificates for IP addresses (rare and expensive)
   - Or use self-signed certificate (Telegram will reject it)

2. **Configure server to accept IP in certificate:**
   - Modify SSL configuration to allow IP-based certificates
   - This is complex and not recommended

## Quick Setup Commands

### Reset Webhook
```bash
npm run telegram:reset
```

### Set Webhook (with domain)
```bash
npm run telegram:set https://your-domain.com/api/notifications/telegram/webhook
```

### Test Webhook Endpoint
```bash
node scripts/test-telegram-webhook.js
```

### Check Webhook Status
After setting webhook, check for errors:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
MARKETING_TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=Tanasvi@123
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/notifications/telegram/webhook
```

## Troubleshooting

### Error: "SSL routines::tlsv1 unrecognized name"
- **Cause**: SSL certificate doesn't match the IP address
- **Solution**: Use a domain name with proper SSL certificate

### Error: "Site can't be reached"
- **Cause**: Server not accessible from internet or firewall blocking
- **Solution**: 
  - Check if server is running
  - Verify firewall allows port 443 (HTTPS)
  - Test with: `curl https://your-domain.com/health`

### Error: "Webhook was set, but Telegram can't reach it"
- **Cause**: Server behind firewall or not publicly accessible
- **Solution**: 
  - Use ngrok for testing
  - Configure firewall to allow Telegram IP ranges
  - Check server logs for incoming requests

### Pending Updates Not Being Processed
- **Cause**: Webhook URL not accessible or returning errors
- **Solution**: 
  - Check webhook info: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
  - Verify endpoint is returning `{ ok: true }`
  - Check server logs for errors

## Best Practices

1. **Always use HTTPS** - Telegram requires it
2. **Use domain names** - Not IP addresses
3. **Valid SSL certificates** - Let's Encrypt is free and works well
4. **Test locally first** - Use ngrok before deploying to production
5. **Monitor webhook errors** - Check `getWebhookInfo` regularly
6. **Use webhook secret** - For security (already implemented)

## Next Steps

1. Choose a solution (domain name recommended)
2. Set up SSL certificate
3. Update webhook URL
4. Test with `/start` command in Telegram
5. Monitor for errors

