/**
 * Merge into your existing Google Apps Script Web App project.
 * Existing full-sync / import doPost handlers must remain unchanged.
 *
 * Validates x-r360-sync-key against Script Property R360_SYNC_SECRET
 * (same value as backend GOOGLE_SHEET_SYNC_SECRET).
 */

function doPost(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('R360_SYNC_SECRET');
  var key = e && e.parameter ? e.parameter['x-r360-sync-key'] : null;
  if (!key && e && e.postData && e.postData.contents) {
    // Header may not be in parameter for JSON POST — check postData headers if available
  }
  // Prefer parsing body first for action routing
  var body = {};
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return jsonResponse({ status: 'FAILED', error: 'Invalid JSON body' });
  }

  if (secret) {
    var incomingKey = (e && e.parameter && e.parameter['x-r360-sync-key']) || null;
    // Apps Script Web App: custom headers are not reliably exposed; use body.syncKey fallback
    var bodyKey = body.syncKey || null;
    var headerKey = incomingKey || bodyKey;
    if (headerKey !== secret) {
      return jsonResponse({ status: 'FAILED', error: 'Unauthorized' });
    }
  }

  if (body.action === 'UPDATE_PROJECT_ALLOCATION') {
    return handleUpdateProjectAllocation(body);
  }

  // Existing full-sync kickoff: { batchId, syncBatchId } — leave your current handler below
  return handleExistingDoPost(e, body);
}

/**
 * @param {Object} payload
 * @param {Array<{pid:string,eid:string,weekStart:string,plannedHours:number}>} payload.updates
 */
function handleUpdateProjectAllocation(payload) {
  Logger.log('UPDATE_PROJECT_ALLOCATION received, updates=' + (payload.updates || []).length);

  var updates = payload.updates || [];
  if (updates.length === 0) {
    return jsonResponse({ status: 'SUCCESS', applied: 0, failed: [] });
  }

  var applied = 0;
  var failed = [];

  for (var i = 0; i < updates.length; i++) {
    var cell = updates[i];
    try {
      updateProjectAllocationCell(cell);
      applied++;
    } catch (err) {
      failed.push({
        pid: cell.pid,
        eid: cell.eid,
        weekStart: cell.weekStart,
        reason: err.message || String(err),
      });
    }
  }

  return jsonResponse({
    status: failed.length === 0 ? 'SUCCESS' : applied > 0 ? 'PARTIAL' : 'FAILED',
    applied: applied,
    failed: failed,
  });
}

/**
 * Update a single Project_Allocation cell by PID + EID row and weekStart column header.
 *
 * @param {{pid:string,eid:string,weekStart:string,plannedHours:number}} payload
 */
function updateProjectAllocationCell(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Project_Allocation');
  if (!sheet) {
    throw new Error('Sheet Project_Allocation not found');
  }

  var pid = String(payload.pid || '').trim().toUpperCase();
  var eid = String(payload.eid || '').trim().toUpperCase();
  var weekHeader = String(payload.weekStart || '').trim();
  var hours = Number(payload.plannedHours);
  if (!pid || !eid || !weekHeader) {
    throw new Error('Missing pid, eid, or weekStart');
  }
  if (!Number.isFinite(hours)) {
    throw new Error('Invalid plannedHours');
  }

  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2 || lastCol < 1) {
    throw new Error('Sheet has no data rows');
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var pidCol = findColumnIndex(headers, ['PID', 'pid', 'P-id', 'P-Id', 'P_id']);
  var eidCol = findColumnIndex(headers, ['EID', 'eid', 'E-id', 'E-Id', 'EmployeeCode']);
  if (pidCol < 0 || eidCol < 0) {
    throw new Error('PID or EID column not found');
  }

  var weekCol = findWeekColumnIndex(headers, weekHeader);
  if (weekCol < 0) {
    throw new Error('Week column not found: ' + weekHeader);
  }

  var data = sheet.getRange(2, 1, lastRow, lastCol).getValues();
  var targetRow = -1;
  for (var r = 0; r < data.length; r++) {
    var rowPid = String(data[r][pidCol] || '').trim().toUpperCase();
    var rowEid = String(data[r][eidCol] || '').trim().toUpperCase();
    if (rowPid === pid && rowEid === eid) {
      targetRow = r + 2;
      break;
    }
  }

  if (targetRow < 0) {
    throw new Error('Row not found for PID=' + pid + ' EID=' + eid);
  }

  sheet.getRange(targetRow, weekCol + 1).setValue(hours);
  Logger.log(
    'Updated Project_Allocation PID=' + pid + ' EID=' + eid + ' week=' + weekHeader + ' hours=' + hours
  );
}

function findColumnIndex(headers, aliases) {
  var normalized = aliases.map(function (a) {
    return String(a).trim().toLowerCase();
  });
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || '').trim().toLowerCase();
    if (normalized.indexOf(h) >= 0) return c;
  }
  return -1;
}

function findWeekColumnIndex(headers, weekHeader) {
  var target = String(weekHeader).trim().toLowerCase();
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || '').trim();
    if (h.toLowerCase() === target) return c;
    // tolerate "9 Jun" vs "9-Jun"
    if (h.replace(/\s+/g, '-').toLowerCase() === target.replace(/\s+/g, '-')) return c;
  }
  return -1;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** Placeholder — replace with your existing doPost logic for full sync / import kickoff. */
function handleExistingDoPost(e, body) {
  // ... existing implementation ...
  return jsonResponse({ status: 'IGNORED', message: 'No handler matched' });
}
