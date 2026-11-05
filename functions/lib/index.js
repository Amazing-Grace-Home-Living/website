"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreated = exports.apiHealth = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
exports.apiHealth = (0, https_1.onRequest)({ cors: true, region: "us-central1" }, async (req, res) => {
    logger.info("API Health check executed");
    res.status(200).json({
        status: "online",
        environment: process.env.FUNCTIONS_EMULATOR === "true" ? "emulator" : "production",
        timestamp: new Date().toISOString()
    });
});
exports.onUserCreated = (0, firestore_2.onDocumentCreated)({ document: "users/{userId}", region: "us-central1" }, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    logger.info(`New user document created: ${event.params.userId}`);
    await db.collection("profiles").doc(event.params.userId).set({ createdAt: new Date() }, { merge: true });
});
