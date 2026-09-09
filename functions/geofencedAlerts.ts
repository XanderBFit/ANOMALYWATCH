import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates.
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract GPS latitude and longitude from flexible incident record shapes.
 */
function extractCoordinates(data: any): { lat: number; lng: number } | null {
  if (!data) return null;
  
  if (typeof data.coordinates?.lat === "number" && typeof data.coordinates?.lng === "number") {
    return { lat: data.coordinates.lat, lng: data.coordinates.lng };
  }
  if (typeof data.latitude === "number" && typeof data.longitude === "number") {
    return { lat: data.latitude, lng: data.longitude };
  }
  if (typeof data.lat === "number" && typeof data.lng === "number") {
    return { lat: data.lat, lng: data.lng };
  }
  if (typeof data.centerLat === "number" && typeof data.centerLng === "number") {
    return { lat: data.centerLat, lng: data.centerLng };
  }
  return null;
}

/**
 * Core notification dispatch worker for a detected Grade X incident.
 */
async function processIncidentGeofenceAlerts(incidentId: string, data: any) {
  const isGradeX = 
    data.severity === "CRITICAL" || 
    data.severity === "HIGH" || 
    (data.title && data.title.includes("Grade X")) ||
    (data.description && data.description.includes("Grade X"));

  if (!isGradeX) {
    console.log(`Incident ${incidentId} is not Grade X / Critical. Skipping geofence alert dispatch.`);
    return;
  }

  const coords = extractCoordinates(data);
  if (!coords) {
    console.warn(`Incident ${incidentId} missing valid GPS coordinates. Skipping dispatch.`);
    return;
  }

  const title = data.title || "Uncorrelated Grade X Aerospace Anomaly";
  const summary = data.description || data.summary || "High-severity sensor return requiring field investigation.";
  const severity = data.severity || "CRITICAL";
  const caseUrl = `https://anomalywatch.ai.studio/?case=${incidentId}`;

  // Fetch active geofence subscriptions from Firestore
  const subscriptionsSnap = await db.collection("Subscriptions").get();
  if (subscriptionsSnap.empty) {
    console.log("No active alert subscriptions found in database.");
    return;
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const globalDiscordWebhook = process.env.DISCORD_WEBHOOK_URL;

  for (const doc of subscriptionsSnap.docs) {
    const sub = doc.data();
    
    // Extract anchor coordinates from user subscription
    const anchorLat = sub.centerLat ?? sub.homeLat;
    const anchorLng = sub.centerLng ?? sub.homeLng;
    const radiusKm = sub.radiusKm || sub.alertRadiusKm || 100;

    if (typeof anchorLat !== "number" || typeof anchorLng !== "number") {
      continue;
    }

    const distanceKm = calculateDistanceKm(coords.lat, coords.lng, anchorLat, anchorLng);
    const distanceMiles = distanceKm * 0.621371;

    // Check if incident falls within user's defined geofence radius
    if (distanceKm <= radiusKm) {
      console.log(`🎯 Geofence Match for rule '${sub.locationName || doc.id}': ${distanceKm.toFixed(1)}km away from incident ${incidentId}`);

      // 1. Dispatch Telegram Notification
      if (sub.telegramChatId && telegramBotToken) {
        try {
          const telegramMessage = 
`🚨 *ANOMALY WATCH - GRADE X GEOFENCE ALERT*

*Incident*: ${title}
*Case ID*: \`${incidentId}\`
*Proximity*: *${distanceKm.toFixed(1)} km* (${distanceMiles.toFixed(1)} miles) from ${sub.locationName || "Anchor GPS"}
*Severity*: ⚠️ ${severity} (Grade X)
*Coordinates*: \`${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°\`

*Brief*: ${summary}

[🔍 View Tactical Case Dossier](${caseUrl})`;

          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: sub.telegramChatId,
              text: telegramMessage,
              parse_mode: "Markdown",
              disable_web_page_preview: false,
            }),
          });
          console.log(`Successfully dispatched Telegram alert to chat ${sub.telegramChatId}`);
        } catch (err) {
          console.error(`Error sending Telegram alert to ${sub.telegramChatId}:`, err);
        }
      }

      // 2. Dispatch Discord Webhook Notification
      const discordUrl = sub.discordWebhookUrl || globalDiscordWebhook;
      if (discordUrl) {
        try {
          const discordPayload = {
            username: "Anomaly Watch Tactical Bot",
            avatar_url: "https://anomalywatch.ai.studio/icon.png",
            content: `🚨 **GRADE X GEOFENCE ALERT DETECTED WITHIN ${radiusKm}KM RADIUS**`,
            embeds: [
              {
                title: `⚠️ ${title}`,
                description: summary,
                url: caseUrl,
                color: 0xff0033, // High threat red
                fields: [
                  {
                    name: "Case ID",
                    value: `\`${incidentId}\``,
                    inline: true,
                  },
                  {
                    name: "Severity",
                    value: `**${severity} (GRADE X)**`,
                    inline: true,
                  },
                  {
                    name: "Proximity",
                    value: `**${distanceKm.toFixed(1)} km** (${distanceMiles.toFixed(1)} mi) from *${sub.locationName || "Anchor GPS"}*`,
                    inline: false,
                  },
                  {
                    name: "Coordinates",
                    value: `\`${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°\``,
                    inline: true,
                  },
                  {
                    name: "Action Required",
                    value: `[Inspect Case Dossier & Radar Correlation](${caseUrl})`,
                    inline: false,
                  },
                ],
                footer: {
                  text: "Anomaly Watch Real-Time OSINT & Geofence Intelligence",
                },
                timestamp: new Date().toISOString(),
              },
            ],
          };

          await fetch(discordUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(discordPayload),
          });
          console.log(`Successfully dispatched Discord webhook alert to ${discordUrl.slice(0, 35)}...`);
        } catch (err) {
          console.error(`Error sending Discord alert:`, err);
        }
      }
    }
  }
}

/**
 * Firebase Cloud Function triggered when a new Case Record is written to Firestore.
 */
export const onNewCaseRecordDetected = functions.firestore
  .document("CaseRecords/{caseId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const caseId = context.params.caseId || snap.id;
    await processIncidentGeofenceAlerts(caseId, data);
  });

/**
 * Firebase Cloud Function triggered when a new Sighting is created in Firestore.
 */
export const onNewSightingDetected = functions.firestore
  .document("Sightings/{sightingId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const sightingId = context.params.sightingId || snap.id;
    await processIncidentGeofenceAlerts(sightingId, data);
  });
