/**
 * Writes data directly to Firebase Realtime Database
 */
function updateFirebaseNode(nodePath, payload) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("FIREBASE_TOKEN");
  const dbUrl = "https://YOUR_FIREBASE_PROJECT_ID.firebaseio.com/" + nodePath + ".json?auth=" + token;

  const options = {
    method: "put",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(dbUrl, options);
    return { status: "SUCCESS", response: JSON.parse(res.getContentText()) };
  } catch (err) {
    return { status: "ERROR", message: err.toString() };
  }
}