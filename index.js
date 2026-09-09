/**
 * [OFFSITE_VAULT_SINK]: Cloud Run / Cloud Function Entry Point
 * This logic represents the server-side component of the offsite sync.
 * It receives the data envelope from the client and writes it to a 
 * separate Firestore project or collection using a human-readable ID.
 */

const express = require('express');
const admin = require('firebase-admin');

// Initialize Admin SDK (Assuming environment credentials)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

app.use(express.json());

app.post('/api/offsite', async (req, res) => {
  try {
    const envelope = req.body;
    const { collection, payload } = envelope;
    
    // [SLUG_GENERATION]: Extract meaningful slug based on collection type
    let rawSlug = "";
    switch (collection) {
      case 'UFOSightings':
        rawSlug = payload.title || payload.location || payload.reportId;
        break;
      case 'SignalLog':
        rawSlug = payload.signalType || payload.sector || payload.frequency;
        break;
      case 'ScrapedData':
        rawSlug = payload.headline || payload.source || payload.topic;
        break;
      case 'CelestialEvents':
        rawSlug = payload.eventName || payload.body || payload.type;
        break;
      case 'OpsLog':
        rawSlug = payload.operation || payload.target || payload.action;
        break;
      case 'CaseOps':
        rawSlug = payload.caseName || payload.caseId || payload.subject;
        break;
      case 'TacticalComms':
        rawSlug = payload.channel || payload.callsign || payload.subject;
        break;
      case 'Alerts':
        rawSlug = payload.alertType || payload.trigger || payload.zone;
        break;
      default:
        rawSlug = payload.name || payload.title || payload.id;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    let docId = envelope.docId; // Prefer the ID provided by the client

    if (!docId) {
      if (rawSlug) {
        // Sanitize slug: lowercase, replace spaces with hyphens, strip special characters, max 40 chars
        const sanitizedSlug = String(rawSlug)
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 40)
          .replace(/-+$/, ''); // Remove trailing hyphens
        
        docId = `${collection}_${sanitizedSlug}_${dateStr}`;
      } else {
        // Fallback to timestamp
        docId = `${collection}_${dateStr}_${Date.now()}`;
      }
    }

    console.log(`[OFFSITE_SYNC]: Ingesting ${collection} event: ${envelope.eventType} as ${docId}`);

    // [OFFSITE_WRITE]: Using the human-readable ID as requested
    await db.collection('SignalArchive').doc(docId).set({
      ...envelope,
      ingestedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).send({ 
      status: 'SUCCESS', 
      docId: docId 
    });
  } catch (error) {
    console.error('[OFFSITE_ERROR]:', error);
    res.status(500).send({ 
      status: 'ERROR', 
      message: error.message 
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Offsite Sink listening on port ${PORT}`);
});
