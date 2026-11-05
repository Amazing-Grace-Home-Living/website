import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest, Request } from "firebase-functions/v2/https";
import { onDocumentCreated, FirestoreEvent } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { Response } from "express";

initializeApp();
const db = getFirestore();

export const apiHealth = onRequest(
  { cors: true, region: "us-central1" },
  async (req: Request, res: Response): Promise<void> => {
    logger.info("API Health check executed");
    res.status(200).json({
      status: "online",
      environment: process.env.FUNCTIONS_EMULATOR === "true" ? "emulator" : "production",
      timestamp: new Date().toISOString()
    });
  }
);

export const onUserCreated = onDocumentCreated(
  { document: "users/{userId}", region: "us-central1" },
  async (event: FirestoreEvent<any>): Promise<void> => {
    const snapshot = event.data;
    if (!snapshot) return;

    logger.info(`New user document created: ${event.params.userId}`);

    await db.collection("profiles").doc(event.params.userId).set(
      { createdAt: new Date() },
      { merge: true }
    );
  }
);
