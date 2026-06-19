/**
 * Paste into your live Apps Script doPost switch + replace updateProjectAllocationCells.
 * Keep existing import / full-sync cases unchanged.
 */

// In doPost switch(action):
//   case "PATCH_ALLOCATION_CELLS":
//   case "UPDATE_PROJECT_ALLOCATION": // optional alias
//     updateProjectAllocationCells(body.cells || body.updates);
//     result.message = "Project Allocation sheet updated";
//     break;

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
