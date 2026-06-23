/**
 * Merge into your live Google Apps Script Web App project.
 * Existing full-sync / import doPost handlers must remain unchanged.
 *
 * Script property R360_SYNC_SECRET must match backend GOOGLE_SHEET_SYNC_SECRET.
 */

var WEEKLY_PLANNER_SHEET = 'Weekly Planner';
var PROJECT_ALLOCATION_SHEET = 'Project_Allocation';

var WEEKLY_PLANNER_BASE_HEADERS = [
  'PID',
  'EID',
  'Project',
  'Resource',
  'Resource Role',
  'Project Type',
  'Project Status',
  'Active',
];

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

  if (body.action === 'UPSERT_WEEKLY_PLANNER_ROWS') {
    return handleUpsertWeeklyPlannerRows(body);
  }

  return handleExistingDoPost(e, body);
}

function resolvePatchTargetSheets(payload) {
  var requested = payload.targetSheets || [];
  var defaults = [PROJECT_ALLOCATION_SHEET];
  var names = requested.length > 0 ? requested : defaults;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resolved = [];
  names.forEach(function (name) {
    if (ss.getSheetByName(name)) resolved.push(name);
  });
  if (resolved.length === 0 && ss.getSheetByName(PROJECT_ALLOCATION_SHEET)) {
    resolved.push(PROJECT_ALLOCATION_SHEET);
  }
  return resolved;
}

function handleUpdateProjectAllocation(payload) {
  var cells = payload.cells || payload.updates || [];
  if (cells.length === 0) {
    return jsonResponse({ status: 'SUCCESS', applied: 0, failed: [] });
  }

  var applied = 0;
  var failed = [];
  var targetSheets = resolvePatchTargetSheets(payload);

  targetSheets.forEach(function (sheetName) {
    var ctx;
    try {
      ctx = loadAllocationPatchContext(sheetName);
    } catch (err) {
      failed.push({ sheet: sheetName, reason: err.message || String(err) });
      return;
    }

    cells.forEach(function (cell) {
      try {
        applyAllocationCellPatch(ctx, cell, true);
        applied++;
      } catch (err) {
        failed.push({
          sheet: sheetName,
          pid: cell.pid,
          eid: cell.eid,
          reason: err.message || String(err),
        });
      }
    });
  });

  return jsonResponse({
    status: failed.length === 0 ? 'SUCCESS' : applied > 0 ? 'PARTIAL' : 'FAILED',
    applied: applied,
    failed: failed,
    sheets: targetSheets,
  });
}

function handleUpsertWeeklyPlannerRows(payload) {
  var rows = payload.rows || [];
  var sheetName = payload.sheetName || WEEKLY_PLANNER_SHEET;
  if (rows.length === 0) {
    return jsonResponse({ status: 'SUCCESS', applied: 0, failed: [] });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return jsonResponse({ status: 'FAILED', error: 'Sheet not found: ' + sheetName });
  }

  var weekTriples = collectWeekTriplesFromPlannerRows(rows);
  ensureWeeklyPlannerHeaders(ss, sheet, weekTriples);

  var applied = 0;
  var failed = [];

  rows.forEach(function (row) {
    try {
      var ctx = loadWeeklyPlannerPatchContext(sheetName);
      upsertWeeklyPlannerRow(ctx, row);
      applied++;
    } catch (err) {
      failed.push({ pid: row.pid, eid: row.eid, reason: err.message || String(err) });
    }
  });

  return jsonResponse({
    status: failed.length === 0 ? 'SUCCESS' : applied > 0 ? 'PARTIAL' : 'FAILED',
    applied: applied,
    failed: failed,
  });
}

function collectWeekTriplesFromPlannerRows(rows) {
  var map = {};
  rows.forEach(function (row) {
    var weeks = row.weeklyWeeks || row.weeklyHours || [];
    weeks.forEach(function (week) {
      var key = week.weekStart || week.weekHeader;
      if (!key) return;
      map[key] = {
        weekHeader: week.weekHeader || week.weekStart,
        weekStart: week.weekStart || null,
      };
    });
  });
  return Object.keys(map).map(function (k) {
    return map[k];
  });
}

function ensureWeeklyPlannerHeaders(ss, weeklySheet, weekTriples) {
  weekTriples = weekTriples || [];
  var lastCol = Math.max(weeklySheet.getLastColumn(), 1);
  var weeklyHeaders = weeklySheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var hasPid = weeklyHeaders.some(function (h) {
    var col = String(h).trim().toLowerCase();
    return col === 'pid' || col === 'p-id' || col === 'p_id';
  });

  if (!hasPid) {
    weeklySheet.getRange(1, 1, 1, WEEKLY_PLANNER_BASE_HEADERS.length).setValues([WEEKLY_PLANNER_BASE_HEADERS]);
    weeklyHeaders = WEEKLY_PLANNER_BASE_HEADERS.slice();
  }

  ensureWeeklyPlannerWeekColumns(weeklySheet, weeklyHeaders, weekTriples, ss.getSpreadsheetTimeZone());
}

function ensureWeeklyPlannerWeekColumns(sheet, headers, weekTriples, timezone) {
  headers = headers ? headers.slice() : [];
  var changed = false;

  weekTriples.forEach(function (week) {
    ['Plan', 'Act', 'Delta'].forEach(function (metric) {
      var metricKey = metric.toLowerCase();
      if (
        findWeeklyPlannerMetricColumn(
          headers,
          week.weekHeader,
          week.weekStart,
          metricKey,
          timezone
        ) === -1
      ) {
        headers.push((week.weekHeader || week.weekStart) + ' ' + metric);
        changed = true;
      }
    });
  });

  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return headers;
}

function loadAllocationPatchContext(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(sheetName + ' sheet not found');

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
    throw new Error('PID/EID columns missing on ' + sheetName);
  }
  return { sheet: sheet, timezone: timezone, data: data, headers: headers, pidCol: pidCol, eidCol: eidCol };
}

function loadWeeklyPlannerPatchContext(sheetName) {
  return loadAllocationPatchContext(sheetName);
}

function applyAllocationCellPatch(ctx, cell, appendIfMissing) {
  var weekHeader = cell.weekHeader || cell.weekStart;
  var weekStartIso = cell.weekStart || null;
  var pid = String(cell.pid || '').trim().toUpperCase();
  var eid = String(cell.eid || '').trim().toUpperCase();
  var hours = Number(cell.plannedHours);
  if (!pid || !eid || !weekHeader) throw new Error('Missing pid, eid, or weekHeader');
  if (!Number.isFinite(hours)) throw new Error('Invalid plannedHours');

  var weekCol = findWeekColumn(ctx.headers, weekHeader, weekStartIso, ctx.timezone);
  if (weekCol === -1) throw new Error('Week column missing: ' + weekHeader);

  var targetRow = findAllocationRowIndex(ctx, pid, eid);
  if (targetRow === -1) {
    if (!appendIfMissing) throw new Error('Row not found for PID=' + pid + ' EID=' + eid);
    targetRow = appendAllocationRow(ctx, cell);
    ctx.data = ctx.sheet.getDataRange().getValues();
  }

  ctx.sheet.getRange(targetRow, weekCol + 1).setValue(hours);
}

function findAllocationRowIndex(ctx, pid, eid) {
  for (var r = 1; r < ctx.data.length; r++) {
    var rowPid = String(ctx.data[r][ctx.pidCol] || '').trim().toUpperCase();
    var rowEid = String(ctx.data[r][ctx.eidCol] || '').trim().toUpperCase();
    if (rowPid === pid && rowEid === eid) return r + 1;
  }
  return -1;
}

function appendAllocationRow(ctx, cell) {
  var newRow = new Array(ctx.headers.length).fill('');
  newRow[ctx.pidCol] = String(cell.pid || '').trim().toUpperCase();
  newRow[ctx.eidCol] = String(cell.eid || '').trim().toUpperCase();

  var projectCol = findHeaderColumn(ctx.headers, ['project', 'project name']);
  var typeCol = findHeaderColumn(ctx.headers, ['project type', 'type']);
  var statusCol = findHeaderColumn(ctx.headers, ['project status', 'status']);
  var resourceCol = findHeaderColumn(ctx.headers, ['resource', 'resource name', 'name']);
  var roleCol = findHeaderColumn(ctx.headers, ['resource role', 'job role', 'role']);
  var activeCol = findHeaderColumn(ctx.headers, ['active', 'availability']);

  if (projectCol > -1) newRow[projectCol] = cell.projectName || '';
  if (typeCol > -1) newRow[typeCol] = cell.projectType || '';
  if (statusCol > -1) newRow[statusCol] = cell.projectStatus || 'Active';
  if (resourceCol > -1) newRow[resourceCol] = cell.resourceName || '';
  if (roleCol > -1) newRow[roleCol] = cell.jobRole || 'Consultant';
  if (activeCol > -1) newRow[activeCol] = cell.activeFlag || 'Active';

  var nextRow = ctx.sheet.getLastRow() + 1;
  ctx.sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
  return nextRow;
}

function findHeaderColumn(headers, candidates) {
  for (var i = 0; i < headers.length; i++) {
    var col = String(headers[i]).trim().toLowerCase();
    for (var c = 0; c < candidates.length; c++) {
      if (col === candidates[c]) return i;
    }
  }
  return -1;
}

function parseWeeklyPlannerColumnHeader(header) {
  var s = String(header || '').trim();
  var m = s.match(/^(.+?)\s+(Plan|Act|Actual|Delta)$/i);
  if (!m) return null;
  var metric = m[2].toLowerCase();
  if (metric === 'actual') metric = 'act';
  return { weekLabel: m[1].trim(), metric: metric };
}

function findWeeklyPlannerMetricColumn(headers, weekHeader, weekStartIso, metric, timezone) {
  var targetWeek = normalizeWeekHeaderLabel(weekHeader);
  var targetMetric = String(metric || '').toLowerCase();

  for (var i = 0; i < headers.length; i++) {
    var parsed = parseWeeklyPlannerColumnHeader(headers[i]);
    if (!parsed || parsed.metric !== targetMetric) continue;

    var weekMatch = normalizeWeekHeaderLabel(parsed.weekLabel) === targetWeek;
    if (!weekMatch && weekStartIso) {
      weekMatch =
        headerMatchesWeekStartIso(parsed.weekLabel, weekStartIso, timezone) ||
        headerMatchesWeekColumn(parsed.weekLabel, weekHeader, timezone);
    }
    if (weekMatch) return i;
  }

  return -1;
}

function upsertWeeklyPlannerRow(ctx, row) {
  var pid = String(row.pid || '').trim().toUpperCase();
  var eid = String(row.eid || '').trim().toUpperCase();
  if (!pid || !eid) throw new Error('Missing pid or eid on upsert row');

  var weeklyWeeks = row.weeklyWeeks || row.weeklyHours || [];
  ctx.headers = ensureWeeklyPlannerWeekColumns(
    ctx.sheet,
    ctx.headers,
    weeklyWeeks,
    ctx.timezone
  );
  ctx.data = ctx.sheet.getDataRange().getValues();

  var targetRow = findAllocationRowIndex(ctx, pid, eid);
  if (targetRow === -1) {
    targetRow = appendAllocationRow(ctx, row);
    ctx.data = ctx.sheet.getDataRange().getValues();
  }

  weeklyWeeks.forEach(function (week) {
    var weekHeader = week.weekHeader || week.weekStart;
    var weekStart = week.weekStart || null;
    var planned = Number(week.plannedHours != null ? week.plannedHours : week.hours) || 0;
    var actual = Number(week.actualHours) || 0;
    var delta = Number(week.deltaHours);
    if (!Number.isFinite(delta)) {
      delta = actual - planned;
    }

    var planCol = findWeeklyPlannerMetricColumn(ctx.headers, weekHeader, weekStart, 'plan', ctx.timezone);
    var actCol = findWeeklyPlannerMetricColumn(ctx.headers, weekHeader, weekStart, 'act', ctx.timezone);
    var deltaCol = findWeeklyPlannerMetricColumn(ctx.headers, weekHeader, weekStart, 'delta', ctx.timezone);

    if (planCol > -1) ctx.sheet.getRange(targetRow, planCol + 1).setValue(planned);
    if (actCol > -1) ctx.sheet.getRange(targetRow, actCol + 1).setValue(actual);
    if (deltaCol > -1) ctx.sheet.getRange(targetRow, deltaCol + 1).setValue(delta);
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

function utcMondayFromIsoDate(isoDate) {
  if (!isoDate) return null;
  var parts = String(isoDate).trim().split('-');
  if (parts.length !== 3) return null;
  var year = Number(parts[0]);
  var month = Number(parts[1]) - 1;
  var day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

function headerMatchesWeekStartIso(header, weekStartIso, timezone) {
  var monday = utcMondayFromIsoDate(weekStartIso);
  if (!monday) return false;
  if (header instanceof Date && !isNaN(header.getTime())) {
    var headerUtc = Date.UTC(header.getFullYear(), header.getMonth(), header.getDate());
    return headerUtc === monday.getTime();
  }
  return headerMatchesWeekColumn(header, formatHeaderAsWeekLabel(monday, timezone), timezone);
}

function findWeekColumn(headers, weekHeader, weekStartIso, timezone) {
  for (var i = 0; i < headers.length; i++) {
    if (headerMatchesWeekColumn(headers[i], weekHeader, timezone)) return i;
  }
  if (weekStartIso) {
    for (var j = 0; j < headers.length; j++) {
      if (headerMatchesWeekStartIso(headers[j], weekStartIso, timezone)) return j;
    }
  }
  return -1;
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
