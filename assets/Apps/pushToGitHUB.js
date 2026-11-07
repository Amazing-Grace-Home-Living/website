/**
 * NEXUS OS COMMAND ENGINE v6.0
 * Native Webhook & Integration Endpoint for Gemini Mobile, Drive, Docs, and Sheets.
 * Deployment: Web App -> Execute as: Me -> Access: Anyone
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();

    // 1. Authorization Check (Uses Script Property or Fallback Key)
    const storedMissionKey = props.getProperty("MISSION_KEY") || "WHITE_RABBIT_LEADERBOARD_SECURE_2026";
    if (data.missionKey && data.missionKey !== storedMissionKey) {
      return response({ "error": "UNAUTHORIZED_NODE" });
    }

    // 2. Action Routing
    switch (data.action) {

      // --- GOOGLE SHEETS AUTOMATION ---
      case "updateSheet":
        return response(updateSheetData(data.spreadsheetId, data.sheetName, data.rowValues, data.appendMode));

      case "readSheet":
        return response(readSheetData(data.spreadsheetId, data.sheetName));

      // --- GOOGLE DRIVE & DOCS AUTOMATION ---
      case "createFolder":
        return response(createDriveFolder(data.folderName, data.parentId));

      case "createFile":
        return response(createDriveFile(data.fileName, data.content, data.mimeType, data.folderId));

      case "organizeDrive":
        return response(executeOrganizationProtocol(data.structure));

      // --- GITHUB DISPATCH (PROXIED SAFELY) ---
      case "githubPush":
        const githubToken = props.getProperty("GITHUB_TOKEN");
        const repoOwner = props.getProperty("GITHUB_OWNER") || "NicholaiMadias";
        const repoName = props.getProperty("GITHUB_REPO") || "AmazingGrace";
        return response(pushToGitHub(data.path, data.content, data.message, githubToken, repoOwner, repoName));

      // --- SYSTEM HEALTH ---
      case "PING":
        return response({ "status": "ONLINE", "timestamp": new Date().toISOString() });

      default:
        return response({ "error": "INVALID_ACTION", "requestedAction": data.action });
    }

  } catch (err) {
    return response({ "error": err.toString() });
  }
}

/**
 * Appends or updates rows in a targeted Google Sheet
 */
function updateSheetData(spreadsheetId, sheetName, rowValues, appendMode) {
  try {
    const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
    
    if (!sheet) return { "status": "ERROR", "message": "Sheet not found" };

    if (appendMode !== false) {
      sheet.appendRow(rowValues);
      return { "status": "SUCCESS", "action": "ROW_APPENDED", "row": sheet.getLastRow() };
    } else {
      // Overwrite first row or header
      sheet.getRange(1, 1, 1, rowValues.length).setValues([rowValues]);
      return { "status": "SUCCESS", "action": "ROW_UPDATED" };
    }
  } catch (e) {
    return { "status": "ERROR", "message": e.toString() };
  }
}

/**
 * Reads row data from a targeted Google Sheet
 */
function readSheetData(spreadsheetId, sheetName) {
  try {
    const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    return { "status": "SUCCESS", "data": data };
  } catch (e) {
    return { "status": "ERROR", "message": e.toString() };
  }
}

/**
 * Standardized JSON Response Formatter
 */
function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}