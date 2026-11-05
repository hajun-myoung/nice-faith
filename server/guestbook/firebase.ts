import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function guestbookDatabase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    if (process.env.VERCEL || !projectId?.startsWith("demo-"))
      throw new Error("Emulator requires a local demo project");
    const app =
      getApps().find((app) => app.name === "guestbook-emulator") ??
      initializeApp({ projectId }, "guestbook-emulator");
    return getFirestore(app);
  }
  // Fail closed in preview/development; production credentials must never be reused there.
  if (
    process.env.VERCEL_ENV !== "production" ||
    process.env.GUESTBOOK_ENABLED !== "true" ||
    !projectId ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  )
    throw new Error("Guestbook is not configured");
  const app =
    getApps().find((app) => app.name === "guestbook") ??
    initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      },
      "guestbook",
    );
  return getFirestore(app);
}
