import { db, auth } from "../../../firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc } from "firebase/firestore";

export interface PricingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  features: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Public Observer",
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    features: [
      "Live global radar map (24h data)",
      "Standard telemetry layers (USGS, NOAA)",
      "Public case records viewer",
      "Community sighting submissions",
    ],
  },
  {
    id: "operative",
    name: "Field Operative",
    priceMonthly: 9,
    priceYearly: 89,
    stripePriceIdMonthly: "price_operative_monthly",
    stripePriceIdYearly: "price_operative_yearly",
    features: [
      "Everything in Public Observer",
      "Real-time Geofenced SMS, Telegram & Discord alerts",
      "30-day historical signal archive",
      "Daily tactical voice briefing podcast feed",
      "Ad-free high-refresh HUD interface",
    ],
  },
  {
    id: "creator_analyst",
    name: "OSINT Analyst / Creator",
    priceMonthly: 29,
    priceYearly: 290,
    stripePriceIdMonthly: "price_creator_monthly",
    stripePriceIdYearly: "price_creator_yearly",
    features: [
      "Everything in Field Operative",
      "One-click Media Studio export (PDF/PNG Case Dossiers)",
      "Full multi-year historical archive + CSV/GeoJSON export",
      "API Access (10,000 requests/mo)",
      "Priority Gemini Deep-Dive Research Engine",
    ],
  },
];

export interface CheckoutOptions {
  priceId: string;
  tier: 'OPERATIVE' | 'ANALYST';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  userEmail?: string;
  userId?: string;
}

/**
 * Initiates Stripe Checkout via Firebase Extension ('customers/{uid}/checkout_sessions')
 * with a fallback to the backend proxy API route.
 */
export async function createCheckoutSession(priceId: string, userEmail?: string, tier: 'OPERATIVE' | 'ANALYST' = 'OPERATIVE', billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY'): Promise<string> {
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;

  // 1. Try Firebase Extension Pattern first if user is authenticated
  if (uid) {
    try {
      console.log(`[Stripe Checkout] Creating Firebase Extension session for user ${uid} (Price: ${priceId})`);
      const checkoutSessionsRef = collection(db, "customers", uid, "checkout_sessions");
      
      const docRef = await addDoc(checkoutSessionsRef, {
        price: priceId,
        success_url: `${window.location.origin}/?checkout_status=success&tier=${tier}`,
        cancel_url: `${window.location.origin}/?checkout_status=cancelled`,
        allow_promotion_codes: true,
        mode: "subscription",
        metadata: {
          tier,
          billingCycle,
          uid
        }
      });

      // Wait for Firebase Extension to populate session URL on document
      const checkoutUrl = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error("Firebase Extension checkout session creation timed out. Switching to fallback endpoint."));
        }, 7000);

        const unsubscribe = onSnapshot(docRef, (snap) => {
          const data = snap.data();
          if (data?.url) {
            clearTimeout(timeout);
            unsubscribe();
            resolve(data.url);
          } else if (data?.error) {
            clearTimeout(timeout);
            unsubscribe();
            reject(new Error(data.error.message || "Firebase Extension checkout error"));
          }
        });
      });

      if (checkoutUrl) {
        return checkoutUrl;
      }
    } catch (extensionErr) {
      console.warn("[Stripe Checkout] Firebase Extension lookup fallback triggered:", extensionErr);
    }
  }

  // 2. Fallback to Express backend checkout endpoint
  const res = await fetch("/api/stripe/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      priceId, 
      userEmail: userEmail || currentUser?.email, 
      tier, 
      billingCycle,
      userId: uid 
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to create checkout session");
  }
  return data.checkoutUrl;
}

/**
 * Listens for active subscriptions written by the Firebase Stripe Extension under 'customers/{uid}/subscriptions'
 */
export function listenToUserSubscriptions(uid: string, onUpdate: (tier: 'OBSERVER' | 'OPERATIVE' | 'ANALYST') => void) {
  if (!uid) return () => {};

  const subscriptionsRef = collection(db, "customers", uid, "subscriptions");
  return onSnapshot(subscriptionsRef, (snapshot) => {
    let highestTier: 'OBSERVER' | 'OPERATIVE' | 'ANALYST' = 'OBSERVER';

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status;
      if (status === 'active' || status === 'trialing') {
        const role = (data.role || '').toUpperCase();
        const priceId = (data.price?.id || '').toLowerCase();
        
        if (role.includes('ANALYST') || priceId.includes('creator') || priceId.includes('analyst')) {
          highestTier = 'ANALYST';
        } else if (highestTier !== 'ANALYST' && (role.includes('OPERATIVE') || priceId.includes('operative'))) {
          highestTier = 'OPERATIVE';
        }
      }
    });

    if (highestTier !== 'OBSERVER') {
      localStorage.setItem('anomaly_clearance_tier', highestTier);
      window.dispatchEvent(new CustomEvent('anomaly-clearance-updated', { detail: { tier: highestTier } }));
      
      // Sync Firestore profile
      updateDoc(doc(db, "users", uid), {
        clearance: highestTier,
        updatedTimestamp: Date.now()
      }).catch(err => console.warn("Could not update user clearance profile:", err));
    }

    onUpdate(highestTier);
  }, (err) => {
    console.warn("User subscription subscription error:", err);
  });
}

