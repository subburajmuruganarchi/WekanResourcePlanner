/**
 * WeKan Master Planner — reports + R360 bidirectional sync
 *
 * Script properties (File → Project properties → Script properties):
 *   R360_SYNC_URL    — R360 backend base URL (e.g. https://api.example.com)
 *   R360_SYNC_KEY    — outbound sheet→Mongo webhook secret (X-R360-SYNC-KEY header)
 *   R360_SYNC_SECRET — inbound Mongo→sheet patch secret (must match backend GOOGLE_SHEET_SYNC_SECRET)
 */

/**
 * 🚀 MASTER CONFIGURATION
 */
const CONFIG = {
  FTE_DIVISOR: 40,
  SOURCE: {
    ALLOCATION_SHEET: "Project_Allocation",
    WEEKLY_PLANNER_SHEET: "Weekly Planner",
    RESOURCE_SHEET: "Resource",
    COL_NAME: "Name",
    COL_ROLE: "Role",
    COL_STATUS: "Status",
  },
  REPORTS: {
    CONSOLIDATED: "Resource View", 
    PROJECT: "Project View", 
    SUMMARY_PERC: "Role %", // ✨ RESTORED & REPLACES HOURS
    REQUIREMENTS: "Resource Analytics", 
    HISTORIC: "Historic" 
  },
  COLORS: {
    HEADER_BG: "#efefef", 
    HEADER_TEXT: "#000000",
    MONTH_BG: "#434343", 
    MONTH_TEXT: "#ffffff",
    CURRENT_WEEK: "#fff2cc", 
    EXT: "#cfe2f3",    
    INT: "#ffe599",  
    PROJ: "#808080",       
    PROJ_TEXT: "#ffffff",  
    BENCH: "#ea9999",  
    TOTAL: "#e6e6e6", 
    SPACER: "#f3f3f3", 
    META_TEXT: "#666666", 
    SPECTRUM: ["#93c47d", "#d9ead3", "#f4cccc", "#ea9999", "#e06666"],
    REQ_BG: "#fce5cd" 
  },
  ROW_HEIGHT: 26, 
  
  // Width Configurations
  WIDTH_DATES_CONSOL: 75, 
  WIDTH_DATES_ROLE: 100,  

  // SORTING PRIORITY: Broad Categories
  CATEGORY_PRIORITY: [
    "architect",
    "full stack", "fullstack",
    "backend", "back end", "java", "node", "python",
    "frontend", "front end", "react", "angular",
    "mobile", "ios", "android",
    "data", "qa", "test", "design", "product", "manager"
  ],

  // SORTING PRIORITY: Seniority
  SENIORITY_PRIORITY: [
    ["vp", "director", "head"],
    ["principal", "staff", "lead", "manager"],
    ["senior", "sr.", "sr ", "iii"], 
    ["ii", "mid"],
    ["i ", "jun", "assoc", "intern"]
  ]
};

/**
 * 🔄 MENU
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Refresh Reports')
    .addItem('Run Reports', 'generateReports')
    .addToUi();
}

/**
 * 🏁 MAIN CONTROLLER
 */
function generateReports() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ✨ OPTIMAL FIX: Attempt to get the UI, fallback gracefully if running in the background.
  let ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    console.info("Headless execution detected. Suppressing visual UI elements.");
  }
  
  // Helper to safely execute toasts without crashing if UI is absent
  const safeToast = (msg, title, timeout) => {
    if (ui) {
      try { ss.toast(msg, title, timeout); } catch (err) {}
    }
  };
   
  safeToast("Initializing engines...", "🚀 Status", 3);

  try {
    const allocSheet = ss.getSheetByName(CONFIG.SOURCE.ALLOCATION_SHEET);
    const resSheet = ss.getSheetByName(CONFIG.SOURCE.RESOURCE_SHEET);
    
    if (!allocSheet) throw new Error(`Missing sheet: '${CONFIG.SOURCE.ALLOCATION_SHEET}'`);
    if (!resSheet) throw new Error(`Missing sheet: '${CONFIG.SOURCE.RESOURCE_SHEET}'`);

    const dateConfigCurrent = getDateConfiguration(allocSheet, ss.getSpreadsheetTimeZone(), false);
    const dateConfigHistoric = getDateConfiguration(allocSheet, ss.getSpreadsheetTimeZone(), true);

    const numWeeksCurrent = dateConfigCurrent.activeIndices.length;
    const numWeeksHistoric = dateConfigHistoric.activeIndices.length;

    safeToast("Filtering & Mapping resources...", "Step 1/7");
    const resourceMapCurrent = buildMasterResourceMap(resSheet, numWeeksCurrent);
    const resourceMapHistoric = buildMasterResourceMap(resSheet, numWeeksHistoric);
    const dummyMapCurrent = buildDummyResourceMap(resSheet, numWeeksCurrent); 
    const dummyMapHistoric = buildDummyResourceMap(resSheet, numWeeksHistoric);

    safeToast("Calculating allocations...", "Step 2/7");
    populateProjectAllocations(allocSheet, resourceMapCurrent, dateConfigCurrent, numWeeksCurrent);
    populateProjectAllocations(allocSheet, resourceMapHistoric, dateConfigHistoric, numWeeksHistoric);
    populateProjectAllocations(allocSheet, dummyMapCurrent, dateConfigCurrent, numWeeksCurrent); 
    populateProjectAllocations(allocSheet, dummyMapHistoric, dateConfigHistoric, numWeeksHistoric);

    const projectMapCurrent = buildProjectMap(resourceMapCurrent, dummyMapCurrent, numWeeksCurrent);

    safeToast("Rendering Resource View...", "Step 3/7");
    renderConsolidatedView(ss, resourceMapCurrent, dateConfigCurrent, CONFIG.REPORTS.CONSOLIDATED, 1, dummyMapCurrent);
    
    // SKIPPED INDEX 2 -> Reserved for manual placement (e.g. Allocation Source Sheet)

    safeToast("Rendering Project View...", "Step 4/7");
    renderProjectView(ss, projectMapCurrent, dateConfigCurrent, 3); 

    safeToast("Calculating Resource Analytics...", "Step 5/7");
    renderResourceRequirements(ss, dummyMapCurrent, resourceMapCurrent, dateConfigCurrent, 4); 

    safeToast("Summarizing Roles...", "Step 6/7");
    renderRoleSummary(ss, resourceMapCurrent, dateConfigCurrent, numWeeksCurrent, 5); // ✨ MODIFIED

    safeToast("Rendering Historic View...", "Step 7/7"); 
    renderConsolidatedView(ss, resourceMapHistoric, dateConfigHistoric, CONFIG.REPORTS.HISTORIC, 6, dummyMapHistoric);

    safeToast("Reports updated successfully.", "✅ Success", 5);

  } catch (e) {
    console.error(e);
    if (ui) {
      ui.alert("⛔ Error: " + e.message);
    }
  }
}

// ======================================================
// 🧠 LOGIC ENGINE
// ======================================================

function getDateConfiguration(sheet, timezone, isHistoric = false) {
  const headers = sheet.getDataRange().getValues()[0];
  let startIndex = 9; 
   
  const currentYear = new Date().getFullYear();
  const today = new Date();
  today.setHours(0,0,0,0);

  const allActiveIndices = [];
  const allFormattedHeaders = [];
  const allRawDates = [];

  for (let i = startIndex; i < headers.length; i++) {
    const headerVal = headers[i];
    let d = new Date(headerVal);
    
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() === 2001) d.setFullYear(currentYear);
      allActiveIndices.push(i);
      allRawDates.push(d); 
      allFormattedHeaders.push(Utilities.formatDate(d, timezone, "MMM d"));
    } else if (typeof headerVal === 'string' && headerVal.length > 0) {
      allActiveIndices.push(i);
      allRawDates.push(new Date("invalid")); 
      allFormattedHeaders.push(headerVal);
    }
  }

  let startFilterIndex = 0;

  if (!isHistoric) {
    for (let i = 0; i < allRawDates.length; i++) {
      const d = allRawDates[i];
      if (isNaN(d.getTime())) continue;

      const diffTime = Math.abs(today - d);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (d <= today && diffDays < 8) { 
         startFilterIndex = i;
         break;
      }
    }
  }

  const activeIndices = allActiveIndices.slice(startFilterIndex);
  const rawDates = allRawDates.slice(startFilterIndex);
  const formattedHeaders = allFormattedHeaders.slice(startFilterIndex);
  
  if (activeIndices.length === 0 && headers.length > startIndex) {
    activeIndices.push(startIndex);
    rawDates.push(new Date());
    formattedHeaders.push(headers[startIndex] || "Current");
  }

  return { formattedHeaders, activeIndices, rawDates, weekStartIndex: startIndex };
}

function buildMasterResourceMap(sheet, numWeeks) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase());
   
  const idxName = headers.findIndex(h => h.includes("name") || h.includes("resource"));
  const idxRole = headers.findIndex(h => h.includes("role"));
  const idxStatus = headers.findIndex(h => h.includes("status") || h.includes("avail"));

  if (idxName === -1) throw new Error(`Could not find 'Name' in '${CONFIG.SOURCE.RESOURCE_SHEET}'`);
  if (idxStatus === -1) throw new Error(`Could not find 'Status' in '${CONFIG.SOURCE.RESOURCE_SHEET}'`);

  const map = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = String(row[idxName] || "").trim();
    const roleRaw = idxRole > -1 ? String(row[idxRole] || "No Role") : "No Role";
    const status = String(row[idxStatus] || "").trim().toLowerCase();

    if (!name) continue;
    if (name.toLowerCase().includes("dummy")) continue;
    if (name.toLowerCase().includes("inactive")) continue;

    if (status === "") continue;
    if (status.includes("required")) continue;
    if (status.includes("not available")) continue;
    if (status.includes("inactive")) continue;
    
    const category = deriveCategory(roleRaw);

    map[name] = {
      name: name,
      role: roleRaw, 
      category: category,
      projects: [],
      totalHours: new Array(numWeeks).fill(0)
    };
  }
  return map;
}

function buildDummyResourceMap(sheet, numWeeks) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase());
   
  const idxName = headers.findIndex(h => h.includes("name") || h.includes("resource"));
  const idxRole = headers.findIndex(h => h.includes("role"));

  const map = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = String(row[idxName] || "").trim();
    const roleRaw = idxRole > -1 ? String(row[idxRole] || "No Role") : "No Role";

    if (!name) continue;
    if (!name.toLowerCase().includes("dummy") && !name.toLowerCase().includes("dymmy")) continue;

    map[name] = {
      name: name,
      role: roleRaw, 
      projects: [],
      totalHours: new Array(numWeeks).fill(0)
    };
  }
  return map;
}

function populateProjectAllocations(sheet, map, dateConfig, numWeeks) {
  const data = sheet.getDataRange().getValues();
  const idxProject = 1; 
  const idxType = 2;
  const idxResName = 5; 

  const activeIndices = dateConfig.activeIndices;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = String(row[idxResName] || "").trim();

    if (map[name]) {
      const projName = row[idxProject];
      const projType = row[idxType];
      
      const hours = activeIndices.map(idx => parseFloat(row[idx]) || 0);
      const totalAlloc = hours.reduce((a, b) => a + b, 0);

      if (totalAlloc > 0) {
        map[name].projects.push({
          name: projName,
          type: projType,
          hours: hours
        });

        for (let w = 0; w < numWeeks; w++) {
          map[name].totalHours[w] += hours[w];
        }
      }
    }
  }
}

function buildProjectMap(resourceMap, dummyMap, numWeeks) {
  const pMap = {};

  const processMap = (map, isDummy) => {
    for (const resName in map) {
      const res = map[resName];
      
      let cleanName = res.name;
      if (isDummy) {
         cleanName = cleanName.replace(/dummy|dymmy/gi, "Required").trim();
         cleanName = cleanName.replace(/^[zZ][\s\-_\.]*/g, "");
      }

      res.projects.forEach(proj => {
        if (!pMap[proj.name]) {
          pMap[proj.name] = {
            name: proj.name,
            type: proj.type,
            totalHours: new Array(numWeeks).fill(0),
            resources: []
          };
        }

        for (let w = 0; w < numWeeks; w++) {
          pMap[proj.name].totalHours[w] += proj.hours[w];
        }

        pMap[proj.name].resources.push({
          name: cleanName,
          role: res.role,
          hours: proj.hours,
          isDummy: isDummy
        });
      });
    }
  };

  processMap(resourceMap, false);
  if (dummyMap) processMap(dummyMap, true);

  const activeProjects = {};
  for (const pName in pMap) {
    const sum = pMap[pName].totalHours.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      activeProjects[pName] = pMap[pName];
    }
  }

  return activeProjects;
}

// ======================================================
// 🎨 REPORT 1 & 6: RESOURCE VIEW (AND HISTORIC)
// ======================================================

function renderConsolidatedView(ss, map, dateConfig, sheetName, sheetIndex, dummyMap = null) {
  const sheet = setupSheet(ss, sheetName, sheetIndex);
  const totalCols = dateConfig.formattedHeaders.length + 3;
  
  const dataRows = [];
  const bgColors = [];
  const fontColors = []; 
  const fontWeights = [];

  dataRows.push(["External", "Internal", "Projected", ...Array(totalCols-3).fill("")]);
  bgColors.push([CONFIG.COLORS.EXT, CONFIG.COLORS.INT, CONFIG.COLORS.PROJ, ...Array(totalCols-3).fill(CONFIG.COLORS.MONTH_BG)]);
  fontColors.push(["#000000", "#000000", CONFIG.COLORS.PROJ_TEXT, ...Array(totalCols-3).fill("#ffffff")]);
  fontWeights.push(["bold", "bold", "bold", ...Array(totalCols-3).fill("bold")]);

  dataRows.push(["Role", "Resource", "Project", ...dateConfig.formattedHeaders]);
  bgColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_BG));
  fontColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_TEXT));
  fontWeights.push(Array(totalCols).fill("bold"));
  
  const regularNames = Object.keys(map).sort(); 
  const dummyNames = dummyMap ? Object.keys(dummyMap).filter(k => dummyMap[k].projects.length > 0).sort() : [];

  const entitiesToProcess = [];
  
  regularNames.forEach(n => {
      entitiesToProcess.push({ ...map[n], displayName: map[n].name, isDummy: false });
  });
  
  dummyNames.forEach(n => {
     let cleanName = dummyMap[n].name.replace(/dummy|dymmy/gi, "Required").trim();
     cleanName = cleanName.replace(/^[zZ][\s\-_\.]*/g, "");

     entitiesToProcess.push({
        ...dummyMap[n],
        displayName: cleanName,
        isDummy: true 
     });
  });

  const mergeRanges = []; 
  const thickBorderRowIndices = []; 
  const dummyRowIndices = []; 

  entitiesToProcess.forEach(p => {
    const startRow = dataRows.length + 1;

    p.projects.sort((a, b) => {
        const typeA = String(a.type).toLowerCase();
        const typeB = String(b.type).toLowerCase();

        const getRank = (t) => {
            if (t.includes("internal")) return 1;
            if (t.includes("projected")) return 3;
            return 2; 
        };
        return getRank(typeA) - getRank(typeB);
    });

    p.projects.forEach(proj => {
      dataRows.push([p.role, p.displayName, proj.name, ...proj.hours]);
      
      const typeStr = String(proj.type).toLowerCase();
      const isInternal = typeStr.includes("internal");
      const isProjected = typeStr.includes("projected");
      
      let bgColor = CONFIG.COLORS.EXT;
      let fColor = "#000000";

      if (isInternal) {
          bgColor = CONFIG.COLORS.INT;
      } else if (isProjected) {
          bgColor = CONFIG.COLORS.PROJ;
          fColor = CONFIG.COLORS.PROJ_TEXT;
      }
      
      const rowColors = Array(totalCols).fill(bgColor);
      rowColors[0] = "#ffffff"; 
      rowColors[1] = "#ffffff"; 
      bgColors.push(rowColors);

      const rowFontColors = Array(totalCols).fill(fColor);
      rowFontColors[0] = "#000000"; 
      rowFontColors[1] = "#000000"; 
      fontColors.push(rowFontColors);
      
      const weights = Array(totalCols).fill("normal");
      weights[1] = "bold"; 
      fontWeights.push(weights);
    });

    if (!p.isDummy) {
        const bandwidth = p.totalHours.map(h => 40 - h);
        dataRows.push([p.role, p.displayName, "Bandwidth", ...bandwidth]);
        
        const bandColors = ["#ffffff", "#ffffff", CONFIG.COLORS.HEADER_BG]; 
        bandwidth.forEach(val => bandColors.push(getBandwidthColor(val)));
        bgColors.push(bandColors);
        fontColors.push(Array(totalCols).fill("#000000"));
        fontWeights.push(Array(totalCols).fill("bold"));
        
        thickBorderRowIndices.push(dataRows.length); 
    } else {
        const fteRequired = p.totalHours.map(h => h / CONFIG.FTE_DIVISOR);
        dataRows.push([p.role, p.displayName, "Required FTE", ...fteRequired]);
        
        const reqColors = ["#ffffff", "#ffffff", CONFIG.COLORS.HEADER_BG]; 
        fteRequired.forEach(val => reqColors.push(CONFIG.COLORS.REQ_BG));
        bgColors.push(reqColors);
        fontColors.push(Array(totalCols).fill("#000000"));
        fontWeights.push(Array(totalCols).fill("bold"));

        thickBorderRowIndices.push(dataRows.length);
        dummyRowIndices.push(dataRows.length); 
    }

    const rowsToMerge = dataRows.length - startRow + 1;
    if (rowsToMerge > 1) {
        mergeRanges.push({ row: startRow, col: 1, numRows: rowsToMerge }); 
        mergeRanges.push({ row: startRow, col: 2, numRows: rowsToMerge }); 
    }

    dataRows.push(Array(totalCols).fill(""));
    bgColors.push(Array(totalCols).fill(CONFIG.COLORS.SPACER));
    fontColors.push(Array(totalCols).fill("#000000"));
    fontWeights.push(Array(totalCols).fill("normal"));
  });

  if (dataRows.length > 2) {
    writeToSheet(sheet, dataRows, bgColors, fontColors, fontWeights, totalCols, 3, CONFIG.WIDTH_DATES_CONSOL); 
    
    sheet.getRange(1, 1).setHorizontalAlignment("center");
    sheet.getRange(1, 2).setHorizontalAlignment("center");
    sheet.getRange(1, 3).setHorizontalAlignment("center");
    
    applyMonthHeaders(sheet, dateConfig.rawDates, 4, 1);
    
    mergeRanges.forEach(m => {
        sheet.getRange(m.row, m.col, m.numRows, 1).merge().setVerticalAlignment("top");
    });

    applyThickBorders(sheet, thickBorderRowIndices, totalCols);

    sheet.getRange(3, 1, dataRows.length - 2, 1).setFontColor(CONFIG.COLORS.META_TEXT).setFontSize(9);
    sheet.getRange(3, 3, dataRows.length - 2, 1).setHorizontalAlignment("left");
    
    thickBorderRowIndices.forEach(idx => {
       sheet.getRange(idx, 4, 1, totalCols - 3).setNumberFormat("#,##0;(#,##0);0"); 
    });
    sheet.getRange(3, 4, dataRows.length - 2, totalCols - 3).setNumberFormat("#,##0;(#,##0);-");
    
    dummyRowIndices.forEach(idx => {
       sheet.getRange(idx, 4, 1, totalCols - 3).setNumberFormat("0.0;(0.0);-");
    });

    sheet.getRange(2, 4, 1, totalCols - 3).setNumberFormat("@");

    sheet.setColumnWidth(1, 180); 
    sheet.setColumnWidth(2, 250); 
    sheet.setColumnWidth(3, 220);

    highlightCurrentWeek(sheet, dateConfig.rawDates, 4);
  }
}

// ======================================================
// 🎨 REPORT 3: PROJECT VIEW 
// ======================================================

function renderProjectView(ss, projectMap, dateConfig, sheetIndex) {
  const sheetName = CONFIG.REPORTS.PROJECT;
  const sheet = setupSheet(ss, sheetName, sheetIndex);
  const totalCols = dateConfig.formattedHeaders.length + 3;

  const dataRows = [];
  const bgColors = [];
  const fontColors = []; 
  const fontWeights = [];

  dataRows.push(["Project Staffing Overview", "", "", ...Array(totalCols-3).fill("")]);
  bgColors.push(["#ffffff", "#ffffff", "#ffffff", ...Array(totalCols-3).fill(CONFIG.COLORS.MONTH_BG)]);
  fontColors.push(["#000000", "#000000", "#000000", ...Array(totalCols-3).fill("#ffffff")]);
  fontWeights.push(["bold", "bold", "bold", ...Array(totalCols-3).fill("bold")]);

  dataRows.push(["Project / Resource", "Type", "Role", ...dateConfig.formattedHeaders]);
  bgColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_BG));
  fontColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_TEXT));
  fontWeights.push(Array(totalCols).fill("bold"));

  const sortedProjects = Object.values(projectMap).sort((a, b) => {
      const getRank = (t) => {
          const typeStr = String(t).toLowerCase();
          if (typeStr.includes("internal")) return 2;
          if (typeStr.includes("projected")) return 3;
          return 1; 
      };
      const rankA = getRank(a.type);
      const rankB = getRank(b.type);
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
  });

  const thickBorderRowIndices = [];
  const groupRanges = [];
  const dummyRowIndices = [];

  sortedProjects.forEach(proj => {
      const startGroup = dataRows.length + 1; 
      
      dataRows.push([proj.name, proj.type, "Aggregate", ...proj.totalHours]);
      
      const typeStr = String(proj.type).toLowerCase();
      let bgColor = CONFIG.COLORS.EXT;
      let fColor = "#000000";
      
      if (typeStr.includes("internal")) {
          bgColor = CONFIG.COLORS.INT;
      } else if (typeStr.includes("projected")) {
          bgColor = CONFIG.COLORS.PROJ;
          fColor = CONFIG.COLORS.PROJ_TEXT;
      }
      
      bgColors.push([bgColor, bgColor, bgColor, ...Array(totalCols-3).fill(bgColor)]);
      fontColors.push([fColor, fColor, fColor, ...Array(totalCols-3).fill(fColor)]);
      fontWeights.push(Array(totalCols).fill("bold"));

      proj.resources.sort((a, b) => {
          if (a.isDummy !== b.isDummy) return a.isDummy ? 1 : -1;
          const roleA = getCategoryRank(a.role);
          const roleB = getCategoryRank(b.role);
          if(roleA !== roleB) return roleA - roleB;
          return a.name.localeCompare(b.name);
      });

      proj.resources.forEach(res => {
          dataRows.push(["    " + res.name, "", res.role, ...res.hours]);
          
          const rowBg = ["#ffffff", "#ffffff", "#ffffff", ...Array(totalCols-3).fill(res.isDummy ? CONFIG.COLORS.REQ_BG : "#ffffff")];
          bgColors.push(rowBg);
          fontColors.push(Array(totalCols).fill("#000000"));
          
          const fw = Array(totalCols).fill("normal");
          if(res.isDummy) fw[0] = "bold"; 
          fontWeights.push(fw);
          
          if (res.isDummy) {
              dummyRowIndices.push(dataRows.length);
          }
      });

      thickBorderRowIndices.push(dataRows.length);
      
      if (proj.resources.length > 0) {
          groupRanges.push({ start: startGroup + 1, num: proj.resources.length });
      }

      dataRows.push(Array(totalCols).fill(""));
      bgColors.push(Array(totalCols).fill(CONFIG.COLORS.SPACER));
      fontColors.push(Array(totalCols).fill("#000000"));
      fontWeights.push(Array(totalCols).fill("normal"));
  });

  if (dataRows.length > 2) {
    writeToSheet(sheet, dataRows, bgColors, fontColors, fontWeights, totalCols, 3, CONFIG.WIDTH_DATES_CONSOL);
    
    applyMonthHeaders(sheet, dateConfig.rawDates, 4, 1);
    applyThickBorders(sheet, thickBorderRowIndices, totalCols);
    
    sheet.setColumnWidth(1, 280); 
    sheet.setColumnWidth(2, 110); 
    sheet.setColumnWidth(3, 160); 

    sheet.getRange(3, 4, dataRows.length - 2, totalCols - 3).setNumberFormat("#,##0;(#,##0);-");
    
    groupRanges.forEach(g => {
        try { sheet.getRowGroup(g.start, 1).remove(); } catch(e){} 
        sheet.getRange(g.start, 1, g.num).shiftRowGroupDepth(1);
    });

    highlightCurrentWeek(sheet, dateConfig.rawDates, 4);
  }
}

// ======================================================
// 🎨 REPORT 4: RESOURCE ANALYTICS
// ======================================================

function renderResourceRequirements(ss, dummyMap, masterMap, dateConfig, sheetIndex) {
  const sheetName = CONFIG.REPORTS.REQUIREMENTS;
  const sheet = setupSheet(ss, sheetName, sheetIndex);
  const numWeeks = dateConfig.formattedHeaders.length;

  const roles = {};
  const grandTotal = Array(numWeeks).fill(0);

  for (const name in dummyMap) {
    const p = dummyMap[name];
    const roleExact = p.role; 
    
    if (!roles[roleExact]) roles[roleExact] = Array(numWeeks).fill(0);

    for (let i = 0; i < numWeeks; i++) {
      const fte = p.totalHours[i] / CONFIG.FTE_DIVISOR;
      roles[roleExact][i] += fte;
      grandTotal[i] += fte;
    }
  }

  const sortedRoles = Object.keys(roles).sort();
  const totalCols = numWeeks + 3;
  
  const dataRows = [];
  const bgColors = [];
  const fontColors = []; 
  const fontWeights = [];
  
  const thickBorderRows = [];
  const bannerRows = []; 

  const getNextSheetRow = () => dataRows.length + 1;

  const addEmptyRows = (count) => {
      for (let i = 0; i < count; i++) {
          dataRows.push(Array(totalCols).fill(""));
          bgColors.push(Array(totalCols).fill("#ffffff"));
          fontColors.push(Array(totalCols).fill("#ffffff"));
          fontWeights.push(Array(totalCols).fill("normal"));
      }
  };

  const addBanner = (title, isHeatmap) => {
    const rowData = ["", "", title, "Colour Key:"];
    const rowBg = ["#000000", "#000000", "#000000", "#000000"];
    const rowFont = ["#ffffff", "#ffffff", "#ffffff", "#ffffff"];

    if (isHeatmap) {
        rowData.push("0 Req", "High Req");
        rowBg.push("#ffffff", "#e69138");
        rowFont.push("#000000", "#000000");
    } else {
        // We keep the banner legend simple to avoid cluttering the UI, 
        // even though the Overallocated table now has a deeper blue spectrum.
        rowData.push("< -8 (Over)", "Balanced", "< 16 Bench", "< 32 Bench", "> 32 Bench");
        rowBg.push("#cfe2f3", "#93c47d", "#f4cccc", "#ea9999", "#e06666");
        rowFont.push("#000000", "#000000", "#000000", "#000000", "#000000");
    }

    while (rowData.length < totalCols) {
        rowData.push("");
        rowBg.push("#000000");
        rowFont.push("#ffffff");
    }

    bannerRows.push(getNextSheetRow()); 
    dataRows.push(rowData);
    bgColors.push(rowBg);
    fontColors.push(rowFont);
    fontWeights.push(Array(totalCols).fill("bold"));
  };

  const addDataRow = (roleName, rowData, headerBgColor, isBold, applyHeatmap) => {
    dataRows.push(["", "", roleName, ...rowData]);
    
    const rowColors = ["#ffffff", "#ffffff", "#ffffff"];
    for(let i = 0; i < totalCols - 3; i++) {
        rowColors.push(applyHeatmap ? "#ffffff" : headerBgColor);
    }
    bgColors.push(rowColors);
    fontColors.push(Array(totalCols).fill("#000000"));
    
    const weights = Array(totalCols).fill(isBold ? "bold" : "normal");
    weights[2] = "bold"; 
    fontWeights.push(weights);
  };

  dataRows.push(["Metrics & Resources", "", "", ...Array(totalCols-3).fill("")]);
  bgColors.push(["#ffffff", "#ffffff", "#ffffff", ...Array(totalCols-3).fill(CONFIG.COLORS.MONTH_BG)]);
  fontColors.push(["#000000", "#000000", "#000000", ...Array(totalCols-3).fill("#ffffff")]);
  fontWeights.push(["bold", "bold", "bold", ...Array(totalCols-3).fill("bold")]);

  dataRows.push(["Type", "Role", "Resource / Metric", ...dateConfig.formattedHeaders]);
  bgColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_BG));
  fontColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_TEXT));
  fontWeights.push(Array(totalCols).fill("bold"));

  // 1. Analytics Section
  addBanner("RESOURCE ANALYTICS", true);
  
  const reqTotalStartRow = getNextSheetRow();
  addDataRow("Total Requirements", grandTotal, CONFIG.COLORS.TOTAL, true, false);
  thickBorderRows.push(reqTotalStartRow); 
  
  const reqRolesStartRow = getNextSheetRow(); 
  let rolesAddedCount = 0;
  
  sortedRoles.forEach(r => {
      const totalReq = roles[r].reduce((a, b) => a + b, 0);
      if (totalReq > 0) {
          addDataRow(r, roles[r], CONFIG.COLORS.REQ_BG, false, true);
          rolesAddedCount++;
      }
  });
  
  if (rolesAddedCount > 0) {
      thickBorderRows.push(getNextSheetRow() - 1); 
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  let currentWeekIndex = 0; 
  for (let i = 0; i < dateConfig.rawDates.length; i++) {
    const d = dateConfig.rawDates[i];
    if (isNaN(d.getTime())) continue;
    const diffDays = Math.ceil(Math.abs(today - d) / (1000 * 60 * 60 * 24)); 
    if (d <= today && diffDays < 8) { 
        currentWeekIndex = i; break;
    }
  }

  const overallocatedNames = Object.keys(masterMap).filter(name => masterMap[name].totalHours.some(h => (40 - h) < 0));
  overallocatedNames.sort((a, b) => {
     const pA = masterMap[a];
     const pB = masterMap[b];
     for (let i = currentWeekIndex; i < pA.totalHours.length; i++) {
         const bwA = 40 - pA.totalHours[i];
         const bwB = 40 - pB.totalHours[i];
         if (bwA !== bwB) return bwA - bwB; 
     }
     return a.localeCompare(b);
  });

  const regularNames = Object.keys(masterMap).filter(name => !masterMap[name].totalHours.some(h => (40 - h) < 0));
  regularNames.sort((a, b) => {
     const pA = masterMap[a];
     const pB = masterMap[b];
     for (let i = currentWeekIndex; i < pA.totalHours.length; i++) {
         const bwA = 40 - pA.totalHours[i];
         const bwB = 40 - pB.totalHours[i];
         if (bwA !== bwB) return bwB - bwA; 
     }
     return a.localeCompare(b);
  });

  addEmptyRows(2);

  // 2. Overallocated Section
  addBanner("OVERALLOCATED", false);

  dataRows.push(["Category", "Role", "Resource Name", ...dateConfig.formattedHeaders]);
  bgColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_BG));
  fontColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_TEXT));
  fontWeights.push(Array(totalCols).fill("bold"));

  const overDataStartRow = getNextSheetRow(); 

  overallocatedNames.forEach(name => {
      const p = masterMap[name];
      const avail = p.totalHours.map(h => 40 - h);
      dataRows.push([p.category, p.role, p.name, ...avail]);
      bgColors.push(Array(totalCols).fill("#ffffff"));
      fontColors.push(Array(totalCols).fill("#000000"));
      fontWeights.push(Array(totalCols).fill("normal"));
  });
  const overNumRows = overallocatedNames.length;
  if (overNumRows > 0) thickBorderRows.push(getNextSheetRow() - 1); 

  addEmptyRows(2);

  // 3. Bandwidths Section
  addBanner("BANDWIDTHS", false);

  dataRows.push(["Category", "Role", "Resource Name", ...dateConfig.formattedHeaders]);
  bgColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_BG));
  fontColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_TEXT));
  fontWeights.push(Array(totalCols).fill("bold"));

  const bwDataStartRow = getNextSheetRow(); 

  regularNames.forEach(name => {
      const p = masterMap[name];
      const avail = p.totalHours.map(h => 40 - h);
      dataRows.push([p.category, p.role, p.name, ...avail]);
      bgColors.push(Array(totalCols).fill("#ffffff"));
      fontColors.push(Array(totalCols).fill("#000000"));
      fontWeights.push(Array(totalCols).fill("normal"));
  });
  const bwNumRows = regularNames.length;
  if (bwNumRows > 0) thickBorderRows.push(getNextSheetRow() - 1); 

  if (dataRows.length > 2) {
    writeToSheet(sheet, dataRows, bgColors, fontColors, fontWeights, totalCols, 3, CONFIG.WIDTH_DATES_ROLE);
    applyMonthHeaders(sheet, dateConfig.rawDates, 4, 1); 
    applyThickBorders(sheet, thickBorderRows, totalCols);
    
    bannerRows.forEach(rowIdx => {
        sheet.setRowHeight(rowIdx, CONFIG.ROW_HEIGHT * 2);
        sheet.getRange(rowIdx, 3).setFontSize(12).setHorizontalAlignment("left").setVerticalAlignment("middle");
        sheet.getRange(rowIdx, 4, 1, totalCols - 3).setHorizontalAlignment("center").setVerticalAlignment("middle");
    });

    sheet.setColumnWidth(1, 120); 
    sheet.setColumnWidth(2, 200); 
    sheet.setColumnWidth(3, 250);
    
    const rules = [];

    const reqFullRange = sheet.getRange(reqTotalStartRow, 4, rolesAddedCount + 1, totalCols - 3); 
    reqFullRange.setNumberFormat("0.0;(0.0);-");
        
    const totalReqRange = sheet.getRange(reqTotalStartRow, 4, 1, totalCols - 3);
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .setGradientMinpointWithValue("#ffffff", SpreadsheetApp.InterpolationType.NUMBER, "0")
        .setGradientMaxpointWithValue("#e69138", SpreadsheetApp.InterpolationType.MAX, "") 
        .setRanges([totalReqRange])
        .build());

    if (rolesAddedCount > 0) {
        const rolesReqRange = sheet.getRange(reqRolesStartRow, 4, rolesAddedCount, totalCols - 3);
        rules.push(SpreadsheetApp.newConditionalFormatRule()
            .setGradientMinpointWithValue("#ffffff", SpreadsheetApp.InterpolationType.NUMBER, "0")
            .setGradientMaxpointWithValue("#e69138", SpreadsheetApp.InterpolationType.MAX, "") 
            .setRanges([rolesReqRange])
            .build());
    }

    if (overNumRows > 0) {
        const overDataRange = sheet.getRange(overDataStartRow, 4, overNumRows, totalCols - 3);
        overDataRange.setNumberFormat("#,##0;(#,##0);0");
        
        // ✨ NEW: Spectrum of blue for Overallocated table.
        // Google Sheets evaluates rules sequentially top-to-bottom.
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(-24).setBackground("#6fa8dc").setRanges([overDataRange]).build()); // Strong Blue (>24 hrs over)
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(-12).setBackground("#9fc5e8").setRanges([overDataRange]).build()); // Medium Blue (12-24 hrs over)
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(-8).setBackground("#cfe2f3").setRanges([overDataRange]).build());  // Pale Blue (up to 12 hrs over)
        
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(-8, 8).setBackground("#93c47d").setRanges([overDataRange]).build());
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(8, 16).setBackground("#f4cccc").setRanges([overDataRange]).build());
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(16, 32).setBackground("#ea9999").setRanges([overDataRange]).build());
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(32).setBackground("#e06666").setRanges([overDataRange]).build());
    }

    if (bwNumRows > 0) {
        const bwDataRange = sheet.getRange(bwDataStartRow, 4, bwNumRows, totalCols - 3);
        bwDataRange.setNumberFormat("#,##0;(#,##0);0");
        
        // ✨ KEPT ORIGINAL: Bandwidth table retains the simple singular blue to keep focus on bench time.
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(-8).setBackground("#cfe2f3").setRanges([bwDataRange]).build());
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(-8, 8).setBackground("#93c47d").setRanges([bwDataRange]).build());
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(8, 16).setBackground("#f4cccc").setRanges([bwDataRange]).build());
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(16, 32).setBackground("#ea9999").setRanges([bwDataRange]).build());
        rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(32).setBackground("#e06666").setRanges([bwDataRange]).build());
    }

    sheet.setConditionalFormatRules(rules);
    highlightCurrentWeek(sheet, dateConfig.rawDates, 4); 
  }
}

// ======================================================
// 🎨 REPORT 5: ROLE SUMMARY (% WITH TOTAL HRS)
// ======================================================

function renderRoleSummary(ss, map, dateConfig, numWeeks, sheetIndex) {
  const sheetName = CONFIG.REPORTS.SUMMARY_PERC;
  const sheet = setupSheet(ss, sheetName, sheetIndex);
  const totalCols = dateConfig.formattedHeaders.length + 2;

  const roles = {};
  const grandTotal = { internal: Array(numWeeks).fill(0), external: Array(numWeeks).fill(0), projected: Array(numWeeks).fill(0), capacity: Array(numWeeks).fill(0) };

  for (const name in map) {
    const p = map[name];
    const roleExact = p.role; 
    
    if (!roles[roleExact]) roles[roleExact] = { internal: Array(numWeeks).fill(0), external: Array(numWeeks).fill(0), projected: Array(numWeeks).fill(0), capacity: Array(numWeeks).fill(0) };

    for (let i = 0; i < numWeeks; i++) {
      roles[roleExact].capacity[i] += 40;
      grandTotal.capacity[i] += 40;
    }

    p.projects.forEach(proj => {
      const typeStr = String(proj.type).toLowerCase();
      const isInt = typeStr.includes("internal");
      const isProj = typeStr.includes("projected");

      proj.hours.forEach((h, i) => {
        if (isInt) {
          roles[roleExact].internal[i] += h;
          grandTotal.internal[i] += h;
        } else if (isProj) {
          roles[roleExact].projected[i] += h;
          grandTotal.projected[i] += h;
        } else {
          roles[roleExact].external[i] += h;
          grandTotal.external[i] += h;
        }
      });
    });
  }

  const sortedRoles = Object.keys(roles).sort((a, b) => {
     const catA = getCategoryRank(a);
     const catB = getCategoryRank(b);
     if (catA !== catB) return catA - catB;
     const senA = getSeniorityRank(a);
     const senB = getSeniorityRank(b);
     if (senA !== senB) return senA - senB;
     return a.localeCompare(b);
  });

  const dataRows = [];
  const bgColors = [];
  const fontColors = []; 
  const fontWeights = [];

  dataRows.push(["Role Summaries (%)", "", ...Array(totalCols-2).fill("")]);
  bgColors.push(["#ffffff", "#ffffff", ...Array(totalCols-2).fill(CONFIG.COLORS.MONTH_BG)]);
  fontColors.push(["#000000", "#000000", ...Array(totalCols-2).fill("#ffffff")]);
  fontWeights.push(["bold", "bold", ...Array(totalCols-2).fill("bold")]);

  dataRows.push(["Specific Role", "Type", ...dateConfig.formattedHeaders]);
  bgColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_BG));
  fontColors.push(Array(totalCols).fill(CONFIG.COLORS.HEADER_TEXT));
  fontWeights.push(Array(totalCols).fill("bold"));
  
  const thickBorderRows = [];
  const groupRanges = []; 
  const capacityRowIndices = []; // Tracks which rows need number formatting instead of %

  const addBlock = (label, data) => {
    const startGroup = dataRows.length + 1;
    
    // ✨ % Math for the core roles
    const extData = data.external.map((v, i) => data.capacity[i] ? v/data.capacity[i] : 0);
    const intData = data.internal.map((v, i) => data.capacity[i] ? v/data.capacity[i] : 0);
    const projData = data.projected.map((v, i) => data.capacity[i] ? v/data.capacity[i] : 0);
    const benchData = data.capacity.map((cap, i) => cap ? (cap - (data.internal[i] + data.external[i] + data.projected[i])) / cap : 0);
    
    // ✨ Absolute math for Total Capacity
    const totalData = data.capacity; 

    const createRow = (typeLabel, rowData, bgColor, fColor, isBold) => {
      dataRows.push([label, typeLabel, ...rowData]);
      bgColors.push(["#ffffff", bgColor, ...Array(totalCols-2).fill(bgColor)]);
      
      const rowFontColors = Array(totalCols).fill(fColor);
      rowFontColors[0] = "#000000"; 
      rowFontColors[1] = "#000000"; 
      fontColors.push(rowFontColors);

      const weights = Array(totalCols).fill(isBold ? "bold" : "normal");
      weights[0] = "bold"; 
      fontWeights.push(weights);
    };

    createRow("External", extData, CONFIG.COLORS.EXT, "#000000", false);
    createRow("Internal", intData, CONFIG.COLORS.INT, "#000000", false);
    createRow("Projected", projData, CONFIG.COLORS.PROJ, CONFIG.COLORS.PROJ_TEXT, false);
    createRow("Bench", benchData, CONFIG.COLORS.BENCH, "#000000", true);
    
    // ✨ ADDED: Total Capacity row
    createRow("Total Capacity (Hrs)", totalData, CONFIG.COLORS.TOTAL, "#000000", true);
    capacityRowIndices.push(dataRows.length); 

    // Thick border rests comfortably under the new Total Capacity row
    thickBorderRows.push(dataRows.length);

    dataRows.push(Array(totalCols).fill(""));
    bgColors.push(Array(totalCols).fill(CONFIG.COLORS.SPACER));
    fontColors.push(Array(totalCols).fill("#000000"));
    fontWeights.push(Array(totalCols).fill("normal"));

    // Groups Int, Proj, Bench, and Total under Ext
    groupRanges.push({ start: startGroup + 1, num: 4 }); 
  };

  addBlock("All Roles (Total)", grandTotal);
  sortedRoles.forEach(r => addBlock(r, roles[r]));

  if (dataRows.length > 2) {
    writeToSheet(sheet, dataRows, bgColors, fontColors, fontWeights, totalCols, 2, CONFIG.WIDTH_DATES_ROLE);
    
    applyMonthHeaders(sheet, dateConfig.rawDates, 3, 1);
    
    applyThickBorders(sheet, thickBorderRows, totalCols);
    
    sheet.setColumnWidth(1, 200); 
    sheet.setColumnWidth(2, 140); // Slightly wider to fit "Total Capacity (Hrs)" text
    
    // Default the entire block's numbers to Percentage formatting
    sheet.getRange(3, 3, dataRows.length - 2, totalCols - 2).setNumberFormat("0%;(0%);-");

    // ✨ OVERRIDE the Total Capacity rows to strictly format as standard numbers
    capacityRowIndices.forEach(idx => {
       sheet.getRange(idx, 3, 1, totalCols - 2).setNumberFormat("#,##0;(#,##0);-");
    });

    groupRanges.forEach(g => {
        try { sheet.getRowGroup(g.start, 1).remove(); } catch(e){} 
        sheet.getRange(g.start, 1, g.num).shiftRowGroupDepth(1);
    });

    highlightCurrentWeek(sheet, dateConfig.rawDates, 3);
  }
}

// ======================================================
// 🛠️ UTILITIES
// ======================================================

function highlightCurrentWeek(sheet, rawDates, colOffset) {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  for (let i = 0; i < rawDates.length; i++) {
    const d = rawDates[i];
    if (isNaN(d.getTime())) continue;
    
    const diffTime = Math.abs(today - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (d <= today && diffDays < 8) { 
       const colIndex = colOffset + i;
       const maxRows = sheet.getMaxRows();
       sheet.getRange(1, colIndex, maxRows, 1)
            .setBorder(null, true, null, true, null, null, "#0000ff", SpreadsheetApp.BorderStyle.SOLID_MEDIUM); 
       return; 
    }
  }
}

function applyMonthHeaders(sheet, rawDates, mergeStart, rowNum = 1) {
    let currentMonth = -1;
    let mergeCount = 0;
    
    for (let i = 0; i < rawDates.length; i++) {
        const d = rawDates[i];
        if (isNaN(d.getTime())) { mergeStart++; continue; }
        const m = d.getMonth();
        if (m !== currentMonth) {
            if (mergeCount > 0) {
                 sheet.getRange(rowNum, mergeStart - mergeCount, 1, mergeCount).merge()
                      .setValue(Utilities.formatDate(rawDates[i-1], SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "MMMM yyyy").toUpperCase())
                      .setHorizontalAlignment("center").setFontColor(CONFIG.COLORS.MONTH_TEXT).setFontWeight("bold");
            }
            currentMonth = m;
            mergeCount = 1;
        } else {
            mergeCount++;
        }
        mergeStart++;
    }
    if (mergeCount > 0) {
         sheet.getRange(rowNum, mergeStart - mergeCount, 1, mergeCount).merge()
              .setValue(Utilities.formatDate(rawDates[rawDates.length-1], SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "MMMM yyyy").toUpperCase())
              .setHorizontalAlignment("center").setFontColor(CONFIG.COLORS.MONTH_TEXT).setFontWeight("bold");
    }
}

function deriveCategory(roleName) {
    const r = roleName.toLowerCase();
    if (r.includes("architect") || r.includes("principal")) return "Architect";
    if (r.includes("full stack") || r.includes("fullstack") || r.includes("mern")) return "Fullstack";
    if (r.includes("back end") || r.includes("backend") || r.includes("java") || r.includes("node")) return "Backend";
    if (r.includes("front end") || r.includes("frontend") || r.includes("react")) return "Frontend";
    if (r.includes("mobile") || r.includes("ios") || r.includes("android")) return "Mobile";
    if (r.includes("data")) return "Data";
    if (r.includes("qa") || r.includes("quality") || r.includes("test")) return "Testing";
    if (r.includes("design") || r.includes("ux")) return "Design";
    return "Other";
}

function getCategoryRank(roleName) {
    const r = roleName.toLowerCase();
    for (let i = 0; i < CONFIG.CATEGORY_PRIORITY.length; i++) {
        if (r.includes(CONFIG.CATEGORY_PRIORITY[i])) return i;
    }
    return 99; 
}

function getSeniorityRank(roleName) {
    const r = roleName.toLowerCase();
    for (let i = 0; i < CONFIG.SENIORITY_PRIORITY.length; i++) {
        const keywords = CONFIG.SENIORITY_PRIORITY[i];
        if (keywords.some(k => r.includes(k))) return i;
    }
    return 3; 
}

function setupSheet(ss, name, index) {
  const existing = ss.getSheetByName(name);
  if (existing) ss.deleteSheet(existing);
  return ss.insertSheet(name, index);
}

function writeToSheet(sheet, rows, bgColors, fontColors, fontWeights, totalCols, frozenCols, dateColWidth) {
  const range = sheet.getRange(1, 1, rows.length, totalCols);
  range.setValues(rows);
  range.setBackgrounds(bgColors);
  range.setFontColors(fontColors); 
  range.setFontWeights(fontWeights);
  
  range.setFontFamily("Arial").setFontSize(10)
       .setBorder(true, true, true, true, true, true, "#d9d9d9", SpreadsheetApp.BorderStyle.SOLID);

  if (totalCols > frozenCols) {
    sheet.getRange(1, frozenCols + 1, rows.length, totalCols - frozenCols).setHorizontalAlignment("center");
  }
  
  sheet.getRange(2, 1, 1, totalCols)
       .setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(frozenCols);
  sheet.setHiddenGridlines(true);
  sheet.setRowHeights(1, rows.length, CONFIG.ROW_HEIGHT); 
  sheet.autoResizeColumns(1, frozenCols);
  sheet.setColumnWidths(frozenCols + 1, totalCols - frozenCols, dateColWidth);
}

function applyThickBorders(sheet, rowIndices, totalCols) {
  rowIndices.forEach(idx => {
    sheet.getRange(idx, 1, 1, totalCols)
         .setBorder(null, null, true, null, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID_THICK);
  });
}

function getBandwidthColor(val) {
  if (val < -10) return CONFIG.COLORS.SPECTRUM[0]; 
  if (val <= 10) return CONFIG.COLORS.SPECTRUM[1]; 
  if (val <= 20) return CONFIG.COLORS.SPECTRUM[2]; 
  if (val <= 30) return CONFIG.COLORS.SPECTRUM[3]; 
  return CONFIG.COLORS.SPECTRUM[4];                
}

// ======================================================
// R360 WEBHOOK + ALLOCATION PATCH
// ======================================================

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Invalid JSON body' });
  }

  if (body.action === 'PATCH_ALLOCATION_CELLS' || body.action === 'UPDATE_PROJECT_ALLOCATION') {
    var secret = PropertiesService.getScriptProperties().getProperty('R360_SYNC_SECRET');
    if (secret) {
      var headerKey =
        (e && e.parameter && e.parameter['x-r360-sync-key']) ||
        body.syncKey ||
        null;
      if (headerKey !== secret) {
        return jsonResponse({ status: 'FAILED', error: 'Unauthorized' });
      }
    }
    return handleUpdateProjectAllocation(body);
  }

  if (body.action === 'UPSERT_WEEKLY_PLANNER_ROWS') {
    var upsertSecret = PropertiesService.getScriptProperties().getProperty('R360_SYNC_SECRET');
    if (upsertSecret) {
      var upsertKey =
        (e && e.parameter && e.parameter['x-r360-sync-key']) ||
        body.syncKey ||
        null;
      if (upsertKey !== upsertSecret) {
        return jsonResponse({ status: 'FAILED', error: 'Unauthorized' });
      }
    }
    return handleUpsertWeeklyPlannerRows(body);
  }

  try {
    var action = body.action;
    var tabName = body.tabName;

    var result = {
      status: 'success',
      message: '',
      results: [],
    };

    if (!action && !tabName) {
      syncSheetToR360('Resource');
      syncSheetToR360('Project');
      syncSheetToR360('Project_Allocation');
      result.message = 'Full sync completed';
    } else if (tabName) {
      syncSheetToR360(tabName);
      result.message = tabName + ' sync completed';
    } else if (action) {
      switch (action) {
        case 'syncResource':
          syncSheetToR360('Resource');
          result.message = 'Resource synced';
          break;

        case 'syncProject':
          syncSheetToR360('Project');
          result.message = 'Project synced';
          break;

        case 'syncProjectAllocation':
          syncSheetToR360('Project_Allocation');
          result.message = 'Allocation synced';
          break;

        case 'syncAll':
          var resourceRequest = createSyncRequest('Resource');
          var projectRequest = createSyncRequest('Project');

          var responses = UrlFetchApp.fetchAll([resourceRequest, projectRequest]);

          var resourceResponse = JSON.parse(responses[0].getContentText());
          var projectResponse = JSON.parse(responses[1].getContentText());

          var allocationResponse = syncSheetToR360('Project_Allocation');

          result.results.push({ sheet: 'Resource', response: resourceResponse });
          result.results.push({ sheet: 'Project', response: projectResponse });
          result.results.push({ sheet: 'Project_Allocation', response: allocationResponse });

          result.message = 'Resource and Project parallel, Allocation sequential';
          break;

        default:
          throw new Error('Invalid action');
      }
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

function doGet(e) {
  return jsonResponse({
    status: 'success',
    message: 'Apps Script is running',
    note: 'Use POST to trigger sync',
  });
}

function isAllocationTabName(tabName) {
  return (
    tabName === CONFIG.SOURCE.ALLOCATION_SHEET ||
    tabName === CONFIG.SOURCE.WEEKLY_PLANNER_SHEET
  );
}

function resolvePatchTargetSheets(payload) {
  var requested = payload.targetSheets || [];
  var defaults = [CONFIG.SOURCE.ALLOCATION_SHEET];
  var names = requested.length > 0 ? requested : defaults;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resolved = [];
  names.forEach(function (name) {
    if (ss.getSheetByName(name)) {
      resolved.push(name);
    }
  });
  if (resolved.length === 0 && ss.getSheetByName(CONFIG.SOURCE.ALLOCATION_SHEET)) {
    resolved.push(CONFIG.SOURCE.ALLOCATION_SHEET);
  }
  return resolved;
}

function handleUpdateProjectAllocation(payload) {
  var cells = payload.cells || payload.updates || [];
  Logger.log('PATCH_ALLOCATION_CELLS received, cells=' + cells.length);

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
          weekHeader: cell.weekHeader || cell.weekStart,
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
  var sheetName = payload.sheetName || CONFIG.SOURCE.WEEKLY_PLANNER_SHEET;
  Logger.log('UPSERT_WEEKLY_PLANNER_ROWS rows=' + rows.length + ' sheet=' + sheetName);

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
      failed.push({
        pid: row.pid,
        eid: row.eid,
        reason: err.message || String(err),
      });
    }
  });

  return jsonResponse({
    status: failed.length === 0 ? 'SUCCESS' : applied > 0 ? 'PARTIAL' : 'FAILED',
    applied: applied,
    failed: failed,
  });
}

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

function loadWeeklyPlannerPatchContext(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(sheetName + ' sheet not found');
  }

  var timezone = ss.getSpreadsheetTimeZone();
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    throw new Error(sheetName + ' has no header row');
  }
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

  return {
    sheet: sheet,
    sheetName: sheetName,
    timezone: timezone,
    data: data,
    headers: headers,
    pidCol: pidCol,
    eidCol: eidCol,
  };
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
  if (!pid || !eid) {
    throw new Error('Missing pid or eid on upsert row');
  }

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

function loadAllocationPatchContext(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(sheetName + ' sheet not found');
  }

  var timezone = ss.getSpreadsheetTimeZone();
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    throw new Error(sheetName + ' has no header row');
  }
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

  return {
    sheet: sheet,
    sheetName: sheetName,
    timezone: timezone,
    data: data,
    headers: headers,
    pidCol: pidCol,
    eidCol: eidCol,
  };
}

function applyAllocationCellPatch(ctx, cell, appendIfMissing) {
  var weekHeader = cell.weekHeader || cell.weekStart;
  var weekStartIso = cell.weekStart || null;
  var pid = String(cell.pid || '').trim().toUpperCase();
  var eid = String(cell.eid || '').trim().toUpperCase();
  var hours = Number(cell.plannedHours);

  if (!pid || !eid || !weekHeader) {
    throw new Error('Missing pid, eid, or weekHeader');
  }
  if (!Number.isFinite(hours)) {
    throw new Error('Invalid plannedHours for ' + pid + '/' + eid);
  }

  var weekCol = findWeekColumn(ctx.headers, weekHeader, weekStartIso, ctx.timezone);
  if (weekCol === -1) {
    throw new Error('Week column missing: ' + weekHeader);
  }

  var targetRow = findAllocationRowIndex(ctx, pid, eid);
  if (targetRow === -1) {
    if (!appendIfMissing) {
      throw new Error('Row not found for PID=' + pid + ' EID=' + eid);
    }
    targetRow = appendAllocationRow(ctx, cell);
    ctx.data = ctx.sheet.getDataRange().getValues();
  }

  ctx.sheet.getRange(targetRow, weekCol + 1).setValue(hours);
}

function findAllocationRowIndex(ctx, pid, eid) {
  for (var r = 1; r < ctx.data.length; r++) {
    var rowPid = String(ctx.data[r][ctx.pidCol] || '').trim().toUpperCase();
    var rowEid = String(ctx.data[r][ctx.eidCol] || '').trim().toUpperCase();
    if (rowPid === pid && rowEid === eid) {
      return r + 1;
    }
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

function upsertAllocationRow(ctx, row) {
  var pid = String(row.pid || '').trim().toUpperCase();
  var eid = String(row.eid || '').trim().toUpperCase();
  if (!pid || !eid) {
    throw new Error('Missing pid or eid on upsert row');
  }

  var targetRow = findAllocationRowIndex(ctx, pid, eid);
  if (targetRow === -1) {
    targetRow = appendAllocationRow(ctx, row);
    ctx.data = ctx.sheet.getDataRange().getValues();
  }

  var weeklyHours = row.weeklyHours || [];
  weeklyHours.forEach(function (week) {
    var weekCol = findWeekColumn(
      ctx.headers,
      week.weekHeader || week.weekStart,
      week.weekStart || null,
      ctx.timezone
    );
    if (weekCol === -1) return;
    ctx.sheet.getRange(targetRow, weekCol + 1).setValue(Number(week.hours) || 0);
  });
}

function loadProjectAllocationPatchContext() {
  return loadAllocationPatchContext(CONFIG.SOURCE.ALLOCATION_SHEET);
}

function applyProjectAllocationCellPatch(ctx, cell) {
  applyAllocationCellPatch(ctx, cell, true);
}

function normalizeWeekHeaderLabel(value) {
  var s = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase();

  var mmmD = s.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})$/);
  if (mmmD) {
    return mmmD[2] + ' ' + mmmD[1];
  }

  var dMmm = s.match(/^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/);
  if (dMmm) {
    return dMmm[1] + ' ' + dMmm[2];
  }

  return s;
}

function formatHeaderAsWeekLabel(header, timezone) {
  if (header instanceof Date && !isNaN(header.getTime())) {
    var d = new Date(header.getTime());
    if (d.getFullYear() === 2001) {
      d.setFullYear(new Date().getFullYear());
    }
    return Utilities.formatDate(d, timezone, 'd MMM');
  }
  return String(header || '').trim();
}

function headerMatchesWeekColumn(header, weekHeader, timezone) {
  var target = normalizeWeekHeaderLabel(weekHeader);
  if (!target) return false;

  if (header instanceof Date && !isNaN(header.getTime())) {
    var d = new Date(header.getTime());
    if (d.getFullYear() === 2001) {
      d.setFullYear(new Date().getFullYear());
    }
    var dMon = normalizeWeekHeaderLabel(Utilities.formatDate(d, timezone, 'd MMM'));
    var monD = normalizeWeekHeaderLabel(Utilities.formatDate(d, timezone, 'MMM d'));
    return dMon === target || monD === target;
  }

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
    if (headerMatchesWeekColumn(headers[i], weekHeader, timezone)) {
      return i;
    }
  }
  if (weekStartIso) {
    for (var j = 0; j < headers.length; j++) {
      if (headerMatchesWeekStartIso(headers[j], weekStartIso, timezone)) {
        return j;
      }
    }
  }
  return -1;
}


function syncSheetToR360(tabName) {

  tabName = tabName || "Project_Allocation";

  var url = PropertiesService
    .getScriptProperties()
    .getProperty('R360_SYNC_URL');

  var key = PropertiesService
    .getScriptProperties()
    .getProperty('R360_SYNC_KEY');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    throw new Error("Cannot find tab: " + tabName);
  }

  var data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    throw new Error("No data found");
  }

  var headers = data[0];

  Logger.log("Headers");
  Logger.log(headers);

  // ======================================
  // PROJECT MASTER MAP
  // ======================================
  var projectMap = {};

  if (tabName === "Project_Allocation" || tabName === CONFIG.SOURCE.WEEKLY_PLANNER_SHEET) {

    var projectSheet = ss.getSheetByName("Project");

    if (projectSheet) {

      var pdata = projectSheet.getDataRange().getValues();
      var pheaders = pdata[0];

      var pidIndex = -1;
      var nameIndex = -1;

      pheaders.forEach(function (h, i) {

        var value = h.toString().trim().toLowerCase();

        if (value === "p-id" || value === "pid" || value === "2mo") {
          pidIndex = i;
        }

        if (value === "project" || value === "project name") {
          nameIndex = i;
        }

      });

      // for (var p = 1; p < pdata.length; p++) {

      //   var pid = pdata[p][pidIndex];
      //   var name = pdata[p][nameIndex];
if (pidIndex === -1 || nameIndex === -1) {
  throw new Error(
    "Project sheet missing PID or Project Name column"
  );
}

for (var p = 1; p < pdata.length; p++) {

  var pid = pdata[p][pidIndex];
  var name = pdata[p][nameIndex];
        if (pid && name) {
          projectMap[String(pid).trim()] = String(name).trim();
        }

      }

    }
  }

  var rows = [];

  // ======================================
  // MAIN LOOP
  // ======================================
  data.slice(1).forEach(function (row) {

    var obj = {};

    headers.forEach(function (header, index) {
      if (!header) return;
      obj[normalizeHeader(tabName, header)] = row[index];
    });

    // ======================================
    // RESOURCE
    // ======================================
    if (tabName === "Resource") {

      obj.EID = obj.ID;
      obj.Email = obj.Email || obj.eMail;
      obj.Skills = obj["Skill (from HR)"];

      rows.push(obj);
      return;
    }

    // ======================================
    // PROJECT
    // ======================================
    if (tabName === "Project") {

      obj.PID = obj.PID || obj["2mo"];
      obj.Name = obj.Name || obj.Project;

      if (obj.PID && obj.Name) {
        rows.push(obj);
      }

      return;
    }

    // ======================================
    // PROJECT ALLOCATION (FIXED)
    // ======================================
    if (tabName === "Project_Allocation" || tabName === CONFIG.SOURCE.WEEKLY_PLANNER_SHEET) {

      var pid = obj.PID || obj["P-id"];

      var projectName = String(obj.Project || "").trim();

      if (!projectName && pid) {
        projectName = projectMap[String(pid).trim()] || "";
      }

      // var allocation = {

      //   PID: pid,
      //   Project: projectName,
      //   ProjectName: projectName,
      //   Name: projectName,

      //   EID: obj.EID || obj["E-id"],

      //   Resource: obj.Resource || "",
      //   ResourceRole: obj["Resource Role"] || "",
      //   ResourceType: obj["Resource Type"] || "",
      //   Active: obj.Active || ""
      // };

var allocation = {

  PID: pid,

  // Project information
  Project: projectName,
  ProjectName: projectName,

  // IMPORTANT:
  // Name should be resource name, not project name
  Name: obj.Resource || "",

  // Employee
  EID: obj.EID || obj["E-id"] || "",

  Resource: obj.Resource || "",
  ResourceRole: obj["Resource Role"] || "",
  ResourceType: obj["Resource Type"] || "",
  Active: obj.Active || "",

  // Project metadata — used by backend to repair project status/type after allocation sync
  "Project Status": obj["Project Status"] || "",
  "Project Type": obj["Project Type"] || "",
  ProjectStatus: obj["Project Status"] || "",
  ProjectType: obj["Project Type"] || ""
};

      // ======================================
      // FIXED WEEK LOGIC (FLATTENED)
      // ======================================
      if (tabName === CONFIG.SOURCE.WEEKLY_PLANNER_SHEET) {
        headers.forEach(function (header, index) {
          var parsed = parseWeeklyPlannerColumnHeader(header);
          if (!parsed || parsed.metric !== 'plan') return;

          var value = row[index];
          var num = parseFloat(value);
          if (isNaN(num)) num = 0;

          var weekLabel = parsed.weekLabel.toString().trim().replace(/\s+/g, '-');
          allocation[weekLabel] = num;
        });
      } else {
        headers.forEach(function (header, index) {
          if (!isDateColumn(header)) return;

          var value = row[index];
          var num = parseFloat(value);

          if (isNaN(num)) {
            num = 0;
          }

          var weekLabel = header.toString().trim().replace(/\s+/g, '-');

          allocation[weekLabel] = num;
        });
      }

        if (
  allocation.PID &&
  allocation.ProjectName &&
  allocation.Resource
) {
        rows.push(allocation);
      } else {
        Logger.log(
          "Skipping allocation (missing PID, project, resource, or EID): " +
          JSON.stringify(allocation)
        );
      }
    }

  });

  Logger.log("Total rows sending:");
  Logger.log(rows.length);

  if (rows.length === 0) {
    throw new Error("No valid rows found to send. Check weekly data.");
  }

  Logger.log("First Payload:");
  Logger.log(JSON.stringify(rows[0]));

  return postSheetRowsToWebhook(tabName, rows, url, key);
}

/** Max rows per webhook POST — keeps payload under server limits. */
var SHEET_SYNC_BATCH_SIZE = 50;

function isWebhookSuccess(response) {
  return response && (response.status === 'SUCCESS' || response.syncCompleted === true);
}

function postSheetRowsToWebhook(tabName, rows, url, key, syncBatchId) {
  url = url || PropertiesService.getScriptProperties().getProperty('R360_SYNC_URL');
  key = key || PropertiesService.getScriptProperties().getProperty('R360_SYNC_KEY');

  if (!url || !key) {
    throw new Error('R360_SYNC_URL and R360_SYNC_KEY must be set in Script Properties');
  }

  if (rows.length <= SHEET_SYNC_BATCH_SIZE) {
    return sendSheetWebhookBatch(tabName, rows, url, key, syncBatchId);
  }

  var lastResponse;
  var batchCount = Math.ceil(rows.length / SHEET_SYNC_BATCH_SIZE);

  for (var offset = 0; offset < rows.length; offset += SHEET_SYNC_BATCH_SIZE) {
    var batch = rows.slice(offset, offset + SHEET_SYNC_BATCH_SIZE);
    var batchNum = Math.floor(offset / SHEET_SYNC_BATCH_SIZE) + 1;
    Logger.log('Sending batch ' + batchNum + ' of ' + batchCount + ' (' + batch.length + ' rows)');

    lastResponse = sendSheetWebhookBatch(tabName, batch, url, key, syncBatchId);

    if (!isWebhookSuccess(lastResponse)) {
      throw new Error(
        'Batch ' + batchNum + ' failed: ' + JSON.stringify(lastResponse)
      );
    }
  }

  return lastResponse;
}

function sendSheetWebhookBatch(tabName, rows, url, key, syncBatchId) {
  try {
    var headers = {
      'X-R360-SYNC-KEY': key
    };
    if (syncBatchId) {
      headers['X-Sync-Batch-Id'] = syncBatchId;
    }

    var response = UrlFetchApp.fetch(
      url + '/api/google-sheet-sync/webhook',
      {
        method: 'post',
        contentType: 'application/json',
        headers: headers,
        payload: JSON.stringify({
          sheet: tabName,
          rows: rows,
          syncBatchId: syncBatchId || undefined
        }),
        muteHttpExceptions: true
      }
    );

    var responseText = response.getContentText();

    Logger.log('Webhook Response:');
    Logger.log(responseText);

    return JSON.parse(responseText);
  } catch (e) {
    Logger.log('Webhook Error: ' + e.message);

    return {
      status: 'error',
      message: e.message
    };
  }
}

// ======================================
// DATE COLUMN CHECK
// ======================================
// function isDateColumn(header) {
//   if (!header) return false;

//   var value = header.toString().trim();

//   var regex = /^\d{1,2}[-\s](Jan|Feb|Mar|March|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

//   return regex.test(value);
// }
function isDateColumn(header) {

  if (!header) return false;

  var value = header.toString().trim();

  return (
    /^\d{1,2}[-\/\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(value)
    ||
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s\/]\d{1,2}/i.test(value)
  );
}

// ======================================
// HEADER NORMALIZER
// ======================================
function normalizeHeader(tabName, header) {

  if (!header) return "";

  var value = header.toString().trim();

  if (tabName === "Project_Allocation" || tabName === CONFIG.SOURCE.WEEKLY_PLANNER_SHEET) {

    // switch (value.toLowerCase()) {
switch (value.toLowerCase().trim()) {
      case "p-id":
      case "pid":
        return "PID";

      case "e-id":
      case "eid":
        return "EID";

      case "project":
        return "Project";

      case "resource":
        return "Resource";

      case "resource role":
        return "Resource Role";

      case "resource type":
        return "Resource Type";

      case "active":
        return "Active";

      case "project status":
        return "Project Status";

      case "project type":
        return "Project Type";

      default:
        return value;
    }
  }

  if (tabName === "Resource") {

    // switch (value.toLowerCase()) {
switch (value.toLowerCase().trim()) {
      case "id":
        return "ID";

      case "email":
      case "e-mail":
      case "email id":
      case "email address":
        return "Email";

      case "skill (from hr)":
        return "Skill (from HR)";

      default:
        return value;
    }
  }

  if (tabName === "Project") {

    // switch (value.toLowerCase()) {
switch (value.toLowerCase().trim()) {
      case "p-id":
      case "pid":
      case "2mo":
        return "PID";

      case "project":
      case "project name":
        return "Name";

      case "project tech req":
        return "Tech";

      case "be resources required":
        return "BE";

      case "mobile required":
        return "Mobile";

      case "fe required":
        return "FE";

      case "qa":
        return "QA";

      default:
        return value;
    }
  }

  return value;
}

// ======================================
// MANUAL SYNC FUNCTIONS
// ======================================
function syncResource() {
  syncSheetToR360("Resource");
}

function syncProject() {
  syncSheetToR360("Project");
}

function syncProjectAllocation() {
  syncSheetToR360("Project_Allocation");
}
