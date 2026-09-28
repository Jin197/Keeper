import * as Sentry from '@sentry/nextjs';
import https from 'https';

/**
 * Capture an error on Sentry and automatically creates a high-priority card
 * in Trello if Trello credentials are configured.
 */
export async function trackCriticalError(error: Error, source: 'stripe' | 'supabase'): Promise<void> {
  console.error(`[TELEMETRY] Critical error detected on ${source}:`, error);

  // 1. Send to Sentry
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        level: 'fatal',
        tags: {
          source,
          critical: 'true',
        },
      });
    }
  } catch (sentryError) {
    console.error('[TELEMETRY] Failed to capture error in Sentry:', sentryError);
  }

  // 2. Post a high-priority card on Trello
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const listId = process.env.TRELLO_LIST_ID;

  if (apiKey && token && listId) {
    const cardTitle = `🚨 [CRITICAL ERROR] [${source.toUpperCase()}] - ${error.name}: ${error.message}`;
    const cardDesc = `Une erreur critique a été détectée sur **${source.toUpperCase()}** à ${new Date().toISOString()}.\n\n### Détails de l'erreur :\n- **Type** : ${error.name}\n- **Message** : ${error.message}\n- **Stack Trace** :\n\`\`\`\n${error.stack || 'Non disponible'}\n\`\`\`\n\n_Alerte générée automatiquement par la télémétrie de supervision Keeper._`;

    const postData = JSON.stringify({
      name: cardTitle,
      desc: cardDesc,
      idList: listId,
      key: apiKey,
      token: token,
    });

    const options = {
      hostname: 'api.trello.com',
      port: 443,
      path: '/1/cards',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    await new Promise<void>((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`[TELEMETRY] Trello alert card created successfully for ${source} error.`);
          } else {
            console.error(`[TELEMETRY] Failed to create Trello card. Status: ${res.statusCode}. Response: ${data}`);
          }
          resolve();
        });
      });

      req.on('error', (e) => {
        console.error('[TELEMETRY] Trello request failed:', e);
        resolve();
      });

      req.write(postData);
      req.end();
    });
  } else {
    console.warn('[TELEMETRY] Trello keys not fully configured in env. Trello alert skipped.');
  }
}
