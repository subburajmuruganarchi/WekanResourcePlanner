/**
 * Merge into your live Google Apps Script Web App project.
 * Existing full-sync / import doPost handlers must remain unchanged.
 *
 * Script property R360_SYNC_SECRET must match backend GOOGLE_SHEET_SYNC_SECRET.
 */

function doPost(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('R360_SYNC_SECRET');
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonResponse({ status: 'FAILED', error: 'Invalid JSON body' });
  }

  if (secret) {
    var headerKey =
      (e && e.parameter && e.parameter['x-r360-sync-key']) ||
      body.syncKey ||
      null;
    if (headerKey !== secret) {
      return jsonResponse({ status: 'FAILED', error: 'Unauthorized' });
    }
  }

  if (body.action === 'PATCH_ALLOCATION_CELLS' || body.action === 'UPDATE_PROJECT_ALLOCATION') {
    return handleUpdateProjectAllocation(body);
  }

  // Delegate to your existing full-sync / import kickoff handler.
  return handleExistingDoPost(e, body);
}

function handleUpdateProjectAllocation(payload) {
  var cells = payload.cells || payload.updates || [];
  Logger.log('PATCH_ALLOCATION_CELLS received, cells=' + cells.length);

  if (cells.length === 0) {
    return jsonResponse({ status: 'SUCCESS', applied: 0, failed: [] });
  }

  var applied = 0;
  var failed = [];

  try {
    updateProjectAllocationCells(cells);
    applied = cells.length;
  } catch (err) {
    failed.push({ reason: err.message || String(err) });
  }

  return jsonResponse({
    status: failed.length === 0 ? 'SUCCESS' : applied > 0 ? 'PARTIAL' : 'FAILED',
    applied: applied,
    failed: failed,
  });
}

function normalizeWeekHeaderLabel(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase();
}

function formatHeaderAsWeekLabel(header, timezone) {
  if (header instanceof Date && !isNaN(header.getTime())) {
    return Utilities.formatDate(header, timezone, 'd MMM');
  }
  return String(header || '').trim();
}

function headerMatchesWeekColumn(header, weekHeader, timezone) {
  var target = normalizeWeekHeaderLabel(weekHeader);
  var candidate = normalizeWeekHeaderLabel(formatHeaderAsWeekLabel(header, timezone));
  return candidate === target;
}

function updateProjectAllocationCells(cells) {
  if (!cells || !cells.length) {
    throw new Error('No cells provided');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Project_Allocation');
  if (!sheet) {
    throw new Error('Project_Allocation sheet not found');
  }

  var timezone = ss.getSpreadsheetTimeZone();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var pidCol = -1;
  var eidCol = -1;

  headers.forEach(function (h, i) {
    var col = String(h).trim().toLowerCase();
    if (col === 'pid' || col === 'p-id' || col === 'p_id') pidCol = i;
    if (col === 'eid' || col === 'e-id' || col === 'e_id') eidCol = i;
  });

  if (pidCol === -1 || eidCol === -1) {
    throw new Error('PID/EID columns missing on Project_Allocation');
  }

  cells.forEach(function (cell) {
    var weekHeader = cell.weekHeader || cell.weekStart;
    var pid = String(cell.pid || '').trim().toUpperCase();
    var eid = String(cell.eid || '').trim().toUpperCase();
    var hours = Number(cell.plannedHours);

    Logger.log(
      'PATCH_ALLOCATION_CELLS pid=' + pid + ' eid=' + eid + ' week=' + weekHeader + ' hours=' + hours
    );

    if (!pid || !eid || !weekHeader) {
      throw new Error('Missing pid, eid, or weekHeader');
    }
    if (!Number.isFinite(hours)) {
      throw new Error('Invalid plannedHours for ' + pid + '/' + eid);
    }

    var weekCol = -1;
    for (var i = 0; i < headers.length; i++) {
      if (headerMatchesWeekColumn(headers[i], weekHeader, timezone)) {
        weekCol = i;
        break;
      }
    }

    if (weekCol === -1) {
      throw new Error('Week column missing: ' + weekHeader);
    }

    var targetRow = -1;
    for (var r = 1; r < data.length; r++) {
      var rowPid = String(data[r][pidCol] || '').trim().toUpperCase();
      var rowEid = String(data[r][eidCol] || '').trim().toUpperCase();
      if (rowPid === pid && rowEid === eid) {
        targetRow = r + 1;
        break;
      }
    }

    if (targetRow === -1) {
      throw new Error('Row not found for PID=' + pid + ' EID=' + eid);
    }

    sheet.getRange(targetRow, weekCol + 1).setValue(hours);
    Logger.log('Updated row ' + targetRow + ' col ' + (weekCol + 1));
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** Replace with your existing full-sync / import kickoff handler. */
function handleExistingDoPost(e, body) {
  return jsonResponse({ status: 'IGNORED', message: 'No handler matched' });
}
