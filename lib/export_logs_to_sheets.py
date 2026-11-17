# lib/export_logs_to_sheets.py
"""Export Firestore logs to a Google Sheet using Secret Manager.
This script is intended to be run as a Cloud Function (HTTP trigger) or
by the GitHub Actions workflow.
It retrieves the service‑account JSON from Secret Manager in‑memory,
initialises the Google Sheets client via gspread, and writes rows.
"""

import os
import json
from google.cloud import secretmanager
import gspread
from google.oauth2.service_account import Credentials
from google.cloud import firestore

# ------------------------------------------------------------
# Helper: fetch secret as dict (no temporary files)
# ------------------------------------------------------------
def get_service_account_info(secret_name: str, project_id: str) -> dict:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    response = client.access_secret_version(name=name)
    payload = response.payload.data.decode("UTF-8")
    return json.loads(payload)

# ------------------------------------------------------------
# Main entry point for Cloud Functions (HTTP trigger)
# ------------------------------------------------------------
def main(request):
    # Expect environment variables set by deployment
    project_id = os.getenv("GCP_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
    secret_name = os.getenv("SECRET_NAME")
    sheet_id = os.getenv("SHEET_ID")  # Google Sheet ID must be provided

    if not (project_id and secret_name and sheet_id):
        return ("Missing required env vars: GCP_PROJECT_ID, SECRET_NAME, SHEET_ID", 400)

    # Load service account credentials from Secret Manager
    sa_info = get_service_account_info(secret_name, project_id)
    creds = Credentials.from_service_account_info(sa_info, scopes=[
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ])

    # Initialise Firestore client (uses default credentials – the service account)
    db = firestore.Client(project=project_id)

    # Example: read a collection called "logs"
    logs_ref = db.collection("logs")
    docs = logs_ref.stream()

    # Prepare rows: header + data
    rows = []
    header = ["timestamp", "user", "action", "details"]
    rows.append(header)
    for doc in docs:
        data = doc.to_dict()
        rows.append([
            data.get("timestamp", ""),
            data.get("user", ""),
            data.get("action", ""),
            data.get("details", ""),
        ])

    # Open Google Sheet and write rows
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(sheet_id)
    ws = sh.sheet1  # first worksheet
    # Clear existing content then update
    ws.clear()
    ws.update("A1", rows)

    return ("Export completed", 200)

# ------------------------------------------------------------
# If run locally (for testing), allow a simple CLI entry point
# ------------------------------------------------------------
if __name__ == "__main__":
    # Simple local test: prints how many log docs would be exported
    project_id = os.getenv("GCP_PROJECT_ID")
    secret_name = os.getenv("SECRET_NAME")
    if not (project_id and secret_name):
        raise RuntimeError("Set GCP_PROJECT_ID and SECRET_NAME env vars for local test")
    sa_info = get_service_account_info(secret_name, project_id)
    print(f"Loaded service account for {sa_info.get('client_email')}")
    db = firestore.Client(project=project_id)
    count = sum(1 for _ in db.collection("logs").stream())
    print(f"Found {count} log documents")
