// =========================================================================
// KONFIGURASI NAMA SHEET (Single Source of Truth Architecture)
// =========================================================================
const SHEET_AUTHORITY = "Authority";
const SHEET_COMPILE = "Compile";       // Master & Pusat Data Transaksi
const SHEET_LIST_CAMPAIGN = "ListCampaign";
const SHEET_CUSTOMER_DB = "ListCust"; 
const SHEET_DATA_CLAIM = "DataClaim";  // Hanya untuk workflow sementara
const SHEET_ACTIVITY_LOG = "LogActivity";
const SHEET_REQ_PROFILE = "ReqProfile"; // Sheet baru untuk menampung request profil

// Helper: Normalisasi Bulan (contoh: des-26 -> Dec-26, 1/7/26 -> Jul-26)
function normalizeMonth(input) {
    if (!input) return "";
    var str = input.toString().trim().toLowerCase();
    
    // Menangani format input 1/7/26 atau 01-07-2026
    var dateMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dateMatch) {
       var m = parseInt(dateMatch[2], 10);
       var y = dateMatch[3].length === 4 ? dateMatch[3].substring(2) : dateMatch[3];
       var mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
       if (m >= 1 && m <= 12) return mNames[m-1] + "-" + y;
    }
    
    // Menangani format singkatan (des-26, ags 26, dll)
    var map = { 'jan':'Jan', 'peb':'Feb', 'feb':'Feb', 'mar':'Mar', 'apr':'Apr', 'mei':'May', 'may':'May', 'jun':'Jun', 'jul':'Jul', 'agu':'Aug', 'ags':'Aug', 'sep':'Sep', 'okt':'Oct', 'oct':'Oct', 'nov':'Nov', 'des':'Dec', 'dec':'Dec' };
    str = str.replace(/\s+/g, '-'); // ganti spasi dengan strip
    var parts = str.split("-");
    if (parts.length === 2) {
        var mText = parts[0].replace(/[^a-z]/g, '');
        var m = map[mText] || parts[0];
        var y = parts[1].length === 4 ? parts[1].substring(2) : parts[1];
        return m.charAt(0).toUpperCase() + m.slice(1) + "-" + y;
    }
    return input;
}

// Helper: Normalisasi Currency / Angka (contoh: 1.000.000,50 -> 1000000.50)
function normalizeCurrency(input) {
    if (!input) return 0;
    var str = input.toString().trim();
    // Jika format Indonesia (titik ribuan, koma desimal)
    if (str.indexOf('.') !== -1 && str.indexOf(',') !== -1) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.indexOf(',') !== -1) {
        var parts = str.split(',');
        if (parts[parts.length-1].length <= 2) {
            str = str.replace(/,/g, '.'); // koma sebagai desimal
        } else {
            str = str.replace(/,/g, '');  // koma sebagai ribuan
        }
    }
    return parseFloat(str) || 0;
}

// Helper: Normalisasi sysRole (kepala depot = admin, unknown = non-osc)
function normalizeRole(rawRole) {
  var r = rawRole ? rawRole.toString().trim().toLowerCase() : '';
  if (r === 'system manager') return 'system manager';
  if (r === 'supervisor') return 'supervisor';
  if (r === 'osc') return 'osc';
  if (r === 'admin' || r === 'kepala depot') return 'admin';
  if (r === 'non-osc') return 'non-osc';
  return 'non-osc'; // default fallback
}

function formatDateSafe(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, "Asia/Jakarta", "dd-MMM-yyyy");
  return val.toString();
}

function doPost(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    var sheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
    var ss = SpreadsheetApp.openById(sheetId);
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    // ==========================================
    // ACTION: LOG ACTIVITY
    // ==========================================
    if (action === "logActivity") {
      var logSheet = ss.getSheetByName(SHEET_ACTIVITY_LOG);
      if (logSheet) {
        logSheet.appendRow([ requestData.timestamp, requestData.userId, requestData.role, requestData.detail ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // ACTION: LOGIN & FETCH MASTER DATA
    // ==========================================
    else if (action === "login") {
      var authoritySheet = ss.getSheetByName(SHEET_AUTHORITY);
      var data = authoritySheet.getDataRange().getValues();
      var userId = requestData.userid;
      var pin = requestData.pin;
      var loginSuccess = false;
      var userData = {};

      for (var i = 2; i < data.length; i++) { 
        if (data[i][4].toString().trim() === userId && data[i][5].toString().trim() === pin) {
          var activationStatus = data[i][8] ? data[i][8].toString().trim().toLowerCase() : "denied";
          var userRole = data[i][7] ? data[i][7].toString().trim() : "admin";
          var sysRole = normalizeRole(userRole);
          if (activationStatus === "approved" || activationStatus === "ok" || activationStatus === "active") {
            loginSuccess = true;

            var depotNameAuth = data[i][3].toString().trim();
            var regAuto = data[i][0].toString();
            var kodeDepotAuto = data[i][2].toString();
            var depoMasterSheet = ss.getSheetByName("DepoMaster");
            var managedDepots = []; 
            
            if (depoMasterSheet) {
                var dmData = depoMasterSheet.getDataRange().getValues();
                for (var dm = 2; dm < dmData.length; dm++) {
                    var currentDepotName = dmData[dm][2].toString().trim();
                    if (!currentDepotName) continue;
                    var oscUsers = dmData[dm][10] ? dmData[dm][10].toString().split(",").map(function(u){return u.trim();}) : [];
                    var nonOscUsers = dmData[dm][11] ? dmData[dm][11].toString().split(",").map(function(u){return u.trim();}) : [];
                    
                    if (sysRole === "supervisor" || sysRole === "system manager" || oscUsers.indexOf(userId) !== -1 || nonOscUsers.indexOf(userId) !== -1) {
                        managedDepots.push(currentDepotName);
                    }
                    if (sysRole === "admin" && (dmData[dm][7].toString().trim() === userId || currentDepotName.toLowerCase() === depotNameAuth.toLowerCase())) {
                        regAuto = dmData[dm][0].toString(); kodeDepotAuto = dmData[dm][1].toString(); depotNameAuth = currentDepotName; 
                        managedDepots.push(currentDepotName);
                    }
                }
            }

            if (sysRole !== "admin") { depotNameAuth = "Head Office"; regAuto = "0"; kodeDepotAuto = "0"; }

            // Fetch Additional DepoMaster Detailed Information for Profil (If user is Depot Admin/User)
            var depoInfo = null;
            if (sysRole === "admin" || (sysRole !== "admin" && managedDepots.length === 1)) {
                var tkKodeDepot = (sysRole === "admin") ? kodeDepotAuto : "0";
                var dmName = depotNameAuth;
                
                if (sysRole !== "admin" && managedDepots.length === 1) { dmName = managedDepots[0]; }
                
                if (depoMasterSheet && dmName !== "Head Office") {
                    var dmDataFull = depoMasterSheet.getDataRange().getValues();
                    for (var rdm = 2; rdm < dmDataFull.length; rdm++) {
                        if (dmDataFull[rdm][2].toString().trim().toLowerCase() === dmName.toLowerCase()) {
                            // Mapping (index is col - 1): A=0, B=1, ..., Y=24, AJ=35
                            depoInfo = {
                                region: dmDataFull[rdm][0].toString(),       // A
                                kodeDepot: dmDataFull[rdm][1].toString(),    // B
                                namaDepot: dmDataFull[rdm][2].toString(),    // C
                                kepalaDepot: (dmDataFull[rdm][28] && dmDataFull[rdm][28].toString()) || dmDataFull[rdm][3].toString(), // D/AC
                                kepalaAdmin: (dmDataFull[rdm][29] && dmDataFull[rdm][29].toString()) || dmDataFull[rdm][4].toString(), // E/AD
                                picOsc: dmDataFull[rdm][10].toString(),      // K
                                alamat: dmDataFull[rdm][12].toString(),      // M
                                rsm: dmDataFull[rdm][13].toString() || dmDataFull[rdm][25].toString(), // N/Z
                                asm: dmDataFull[rdm][14].toString() || dmDataFull[rdm][26].toString(), // O/AA
                                sm: dmDataFull[rdm][15].toString() || dmDataFull[rdm][27].toString(),  // P/AB
                                grade: dmDataFull[rdm][16].toString(),       // Q
                                sales: dmDataFull[rdm][17].toString(),       // R
                                admin: dmDataFull[rdm][18].toString(),       // S
                                fg: dmDataFull[rdm][19].toString(),          // T
                                pcc: dmDataFull[rdm][20].toString(),         // U
                                teknisi: dmDataFull[rdm][21].toString(),     // V
                                driver: dmDataFull[rdm][22].toString(),      // W
                                lainnya: dmDataFull[rdm][23].toString(),     // X
                                totalKaryawan: dmDataFull[rdm][24].toString(),// Y
                                emailNpc: dmDataFull[rdm][30] ? dmDataFull[rdm][30].toString() : "", // AE
                                emailFg: dmDataFull[rdm][31] ? dmDataFull[rdm][31].toString() : "",  // AF
                                emailSpv: [dmDataFull[rdm][32], dmDataFull[rdm][33], dmDataFull[rdm][34], dmDataFull[rdm][35]].filter(Boolean).join(", "), // AG-AJ
                                usrn1: dmDataFull[rdm][7].toString(), // H
                                usrn2: dmDataFull[rdm][8].toString(), // I
                                usrn3: dmDataFull[rdm][9].toString()  // J
                            };
                            break;
                        }
                    }
                }
            }

            // Otoritas Matrix J-Q dan R-S
            var isSysMgr = (sysRole === 'system manager');
            
            // Map I to S (index 8 to 18)
            var authI = data[i][8]  ? data[i][8].toString().trim() : "Inactive";
            var authJ = data[i][9]  ? data[i][9].toString().trim() : (isSysMgr ? "Visible" : "Hidden");
            var authK = data[i][10] ? data[i][10].toString().trim() : (isSysMgr ? "Yes" : "No");
            var authL = data[i][11] ? data[i][11].toString().trim() : (isSysMgr ? "Yes" : "No");
            var authM = data[i][12] ? data[i][12].toString().trim() : (isSysMgr ? "Yes" : "No");
            var authN = data[i][13] ? data[i][13].toString().trim() : (isSysMgr ? "Yes" : "No");
            var authO = data[i][14] ? data[i][14].toString().trim() : (isSysMgr ? "Yes" : "No");
            var authP = data[i][15] ? data[i][15].toString().trim() : (isSysMgr ? "Yes" : "No");
            var authQ = data[i][16] ? data[i][16].toString().trim() : (isSysMgr ? "Yes" : "No");
            var authR = data[i][17] ? data[i][17].toString().trim() : (isSysMgr ? "Visible" : "Hidden");
            var authS = data[i][18] ? data[i][18].toString().trim() : "Requester";
            var authT = data[i][19] ? data[i][19].toString().trim() : "Requester";
            var authU = data[i][20] ? data[i][20].toString().trim() : "Requester";
            // Kolom V (index 21) = Otorisasi Kelola Akses (Requester/Approver)
            var authV = data[i][21] ? data[i][21].toString().trim() : "Requester";
            
            // Y-AE (Hak Super Admin - Col 24 to 30) - biarkan di posisi default lama
            var kPin    = data[i][24] ? data[i][24].toString().trim().toLowerCase() : (isSysMgr ? "yes" : "no");
            var kManual = data[i][25] ? data[i][25].toString().trim().toLowerCase() : (isSysMgr ? "yes" : "no");
            var kMass   = data[i][26] ? data[i][26].toString().trim().toLowerCase() : (isSysMgr ? "yes" : "no");
            var kAct    = data[i][27] ? data[i][27].toString().trim().toLowerCase() : (isSysMgr ? "yes" : "no");
            var addLvl  = data[i][30] ? data[i][30].toString().trim().toLowerCase() : (isSysMgr ? "access" : "restriction");

            userData = {
              userId: data[i][4].toString(), namaLengkap: data[i][1].toString(), role: userRole, sysRole: sysRole,
              depot: depotNameAuth, depoInfo: depoInfo, kodeDepot: kodeDepotAuto, regional: regAuto, kodeRegional: regAuto, activation: activationStatus,
              auth: { i: authI, j: authJ, k: authK, l: authL, m: authM, n: authN, o: authO, p: authP, q: authQ, r: authR, s: authS, t: authT, u: authU, v: authV },
              kelolaAccess: { pin: kPin, manual: kManual, mass: kMass, activation: kAct },
              addAccountLevel: addLvl, managedDepots: managedDepots, token: Utilities.base64EncodeWebSafe(userId + ":" + pin)
            };
          }
          break;
        }
      }

      if (loginSuccess) {
        var compileSheet = ss.getSheetByName(SHEET_COMPILE);
        var listCompile = [];
        if (compileSheet) {
          var cData = compileSheet.getDataRange().getValues();
          for (var c = 1; c < cData.length; c++) {
            if (cData[c][1]) { // B: No Doc
              listCompile.push({
                noDoc: String(cData[c][1] || "").trim(), codeCampaign: String(cData[c][2] || "").trim(), 
                campaignName: String(cData[c][3] || "").trim(), dcCode: String(cData[c][4] || "").trim(),       
                depotName: String(cData[c][5] || "").trim(), custCode: String(cData[c][6] || "").trim(),     
                custName: String(cData[c][7] || "").trim(), netValue: cData[c][8], volume: cData[c][9], 
                cbNet: cData[c][10], status: String(cData[c][26] || "").trim()                        
              });
            }
          }
        }

        var campSheet = ss.getSheetByName(SHEET_LIST_CAMPAIGN);
        var listCampaign = [];
        if (campSheet) {
          var campData = campSheet.getDataRange().getValues();
          for (var cp = 1; cp < campData.length; cp++) {
            if(campData[cp][0]) { 
              listCampaign.push({
                codeCampaign: String(campData[cp][0] || "").trim(), campaignName: String(campData[cp][1] || "").trim(), 
                periodStart: formatDateSafe(campData[cp][2]), periodEnd: formatDateSafe(campData[cp][3]),         
                statusPajak: String(campData[cp][5] || "").trim(), jenisCb: String(campData[cp][6] || "").trim()       
              });
            }
          }
        }
        
        var custSheet = ss.getSheetByName(SHEET_CUSTOMER_DB);
        var listCust = [];
        if (custSheet) {
          var custData = custSheet.getDataRange().getValues();
          for (var u = 1; u < custData.length; u++) {
            if(custData[u][1]) { 
              listCust.push({ 
                custCode: String(custData[u][1] || "").trim(), noRek: String(custData[u][3] || "").trim(),        
                namaRek: String(custData[u][4] || "").trim(), bank: String(custData[u][5] || "").trim(),         
                npwp: String(custData[u][6] || "").trim(), ktp: String(custData[u][7] || "").trim(),          
                subyekPajak: String(custData[u][8] || "").trim(), top: String(custData[u][10] || "0").trim() 
              });
            }
          }
        }

        return ContentService.createTextOutput(JSON.stringify({ status: "success", data: userData, documents: listCompile, campaigns: listCampaign, customers: listCust })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Kredensial tidak valid atau akun diblokir." })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ==========================================
    // ACTION: SUBMIT DATA (UPDATE SHEET COMPILE)
    // ==========================================
    else if (action === "submitData") {
      var compileSheet = ss.getSheetByName(SHEET_COMPILE);
      var payloadData = Array.isArray(requestData.data) ? requestData.data : [requestData.data]; 
      var userData = requestData.userData; 
      
      if (!userData || !userData.token) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Akses Ditolak: Token hilang!" })).setMimeType(ContentService.MimeType.JSON);
      
      var tsUpload = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MMM-yyyy HH:mm:ss");

      // Load Master TOP ListCust for Server-Side Validation
      var custSheet = ss.getSheetByName(SHEET_CUSTOMER_DB);
      var topMap = {};
      if (custSheet) {
         var cData = custSheet.getDataRange().getValues();
         for(var cx=1; cx<cData.length; cx++) {
             topMap[String(cData[cx][1]).trim()] = parseFloat(cData[cx][10] || 0); // Payer(B) -> TOP(K)
         }
      }

      // Load Compile Map Row Index
      var compileDataArr = compileSheet.getDataRange().getValues();
      var docRowMap = {};
      for(var r = 1; r < compileDataArr.length; r++) {
          var docStr = String(compileDataArr[r][1]).trim().toUpperCase(); // Kolom B
          if(docStr) docRowMap[docStr] = r + 1; // 1-based index (Sheets)
      }

      var successCount = 0;
      var validationErrors = [];

      for(var k = 0; k < payloadData.length; k++) {
        var d = payloadData[k];
        var docUpper = String(d.noDoc || "").trim().toUpperCase();
        var rowIdx = docRowMap[docUpper];
        
        if (rowIdx) {
            // Validasi TOP & Approval
            var inputTop = parseFloat(d.top || 0);
            var masterTop = topMap[d.custCode] || 0;
            if (inputTop >= masterTop) {
                if (!d.approval || String(d.approval).trim() === "") {
                    validationErrors.push("No Doc " + docUpper + " Ditolak: TOP melebihi batas master, wajib isi Approval!");
                    continue; // Skip the row
                }
            }

            // Normalisasi
            var b1 = normalizeMonth(d.blnTagih1);
            var b2 = normalizeMonth(d.blnTagih2);
            var b3 = normalizeMonth(d.blnTagih3);
            var b4 = normalizeMonth(d.blnTagih4);
            var totTagih = normalizeCurrency(d.totTagih);

            // Update rentang Kolom L(12) sampai AB(28) -> 17 Kolom
            // Struktur: [L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z, AA, AB]
            var updateRange = compileSheet.getRange(rowIdx, 12, 1, 17);
            var updateVals = [
                d.periodStart,          // L (12): Periode Start
                d.campaignEnd,          // M (13): Periode End
                d.jenisCashback,        // N (14): Jenis CB
                d.ktp,                  // O (15): NoKTP
                d.npwp,                 // P (16): NPWP
                d.statusPajakCampaign,  // Q (17): Status Pajak
                d.tglLunas,             // R (18): Tanggal Lunas
                d.top,                  // S (19): TOP
                d.approval,             // T (20): Approval
                b1,                     // U (21): Bulan 1
                b2,                     // V (22): Bulan 2
                b3,                     // W (23): Bulan 3
                b4,                     // X (24): Bulan 4
                totTagih,               // Y (25): Total Tagihan
                d.subyekPajak,          // Z (26): Subyek Pajak
                "Submitted",            // AA (27): Status
                tsUpload                // AB (28): Tanggal Upload
            ];
            updateRange.setValues([updateVals]);
            successCount++;
        }
      }

      SpreadsheetApp.flush(); 
      if (validationErrors.length > 0) {
          return ContentService.createTextOutput(JSON.stringify({ status: "warning", message: validationErrors.join(" | "), summary: { successCount: successCount } })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: successCount > 0 ? "success" : "error", summary: { successCount: successCount } })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // ACTION: GET WORKFLOW DATA (COMPILE SHEET)
    // ==========================================
    else if (action === "getWorkflowData") {
      var compileSheet = ss.getSheetByName(SHEET_COMPILE);
      var releaseData = [];
      var claimFinData = [];
      var clearingData = [];

      var reqId = requestData.requesterId;
      var sysRole = normalizeRole(requestData.requesterRole);
      var managedDepots = requestData.managedDepots || [];

      var depoMasterSheet = ss.getSheetByName("DepoMaster");
      var depotPicMap = {};
      var depotNameMap = {};
      if(depoMasterSheet) {
          var dmData = depoMasterSheet.getDataRange().getValues();
          for(var dm=2; dm<dmData.length; dm++) {
              var kd = String(dmData[dm][1]).trim();
              depotPicMap[kd] = String(dmData[dm][10]).trim();
              depotNameMap[kd] = String(dmData[dm][2]).trim();
          }
      }

      if (compileSheet) {
        var compData = compileSheet.getDataRange().getValues();
        for (var c = 1; c < compData.length; c++) {
          var noDoc = String(compData[c][1] || "").trim(); // B: No Doc
          if (!noDoc) continue;
          
          var kdComp = String(compData[c][4] || "").trim(); // E: Kode Depot
          var status = String(compData[c][26] || "").trim(); // AA: Status
          var depotName = depotNameMap[kdComp] || String(compData[c][5] || "").trim(); // C column DepoMaster
          var picOsc = depotPicMap[kdComp] || "";
          
          var isAllowed = false;
          if (sysRole === 'supervisor' || sysRole === 'system manager') isAllowed = true;
          else if (sysRole === 'osc') { if (picOsc === reqId || managedDepots.indexOf(depotName) !== -1) isAllowed = true; }
          else { if (managedDepots.indexOf(depotName) !== -1) isAllowed = true; }

          if (isAllowed) {
            var dataRow = {
              noDoc: noDoc, depot: depotName, codeCampaign: compData[c][2], campaignName: compData[c][3],
              kodeToko: compData[c][6], namaToko: compData[c][7], periode: formatDateSafe(compData[c][11]) + " s/d " + formatDateSafe(compData[c][12]), 
              cbNet: compData[c][10], tglUpload: formatDateSafe(compData[c][27]), tglRelease: formatDateSafe(compData[c][28]), tglClaim: formatDateSafe(compData[c][29])
            };

            if (status === "Submitted") releaseData.push(dataRow);
            else if (status === "Released") claimFinData.push(dataRow);
            else if (status === "Claimed") clearingData.push(dataRow);
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", releaseData: releaseData, claimFinData: claimFinData, clearingData: clearingData })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // ACTION: PROCESS WORKFLOW (SINGLE SOURCE COMPILE)
    // ==========================================
    else if (action === "processWorkflow") {
      var compileSheet = ss.getSheetByName(SHEET_COMPILE);
      var dataClaimSheet = ss.getSheetByName(SHEET_DATA_CLAIM);
      var docsToProcess = requestData.docsToProcess; 
      var workflowType = requestData.workflowType; 
      
      if (!compileSheet || !docsToProcess || docsToProcess.length === 0) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Data tidak lengkap." })).setMimeType(ContentService.MimeType.JSON);

      var compData = compileSheet.getDataRange().getValues();
      var tglProsesStr = requestData.tglProses || Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MMM-yyyy HH:mm:ss");

      var rowsToCopy = [];
      var docsToRemoveFromDataClaim = [];

      for (var r = 1; r < compData.length; r++) {
        var doc = String(compData[r][1] || "").trim(); // B: No Doc
        if (docsToProcess.indexOf(doc) !== -1) {
          
          if (workflowType === 'release') {
              compileSheet.getRange(r + 1, 27).setValue("Released"); // AA (Status)
              compileSheet.getRange(r + 1, 29).setValue(tglProsesStr); // AC (Tgl Release)
          } 
          else if (workflowType === 'claim') {
              compileSheet.getRange(r + 1, 27).setValue("Claimed");  // AA (Status)
              compileSheet.getRange(r + 1, 30).setValue(tglProsesStr); // AD (Tgl Claim)
              rowsToCopy.push(compData[r]); // Copy Entire Row ke DataClaim
          }
          else if (workflowType === 'clearing') {
              compileSheet.getRange(r + 1, 27).setValue("Done");     // AA (Status)
              compileSheet.getRange(r + 1, 31).setValue(tglProsesStr); // AE (Tgl Proses)
              docsToRemoveFromDataClaim.push(doc); // Daftar dokumen untuk dihapus dari DataClaim
          }
        }
      }

      // Menambah ke DataClaim sementara (Saat Claim to Finance)
      if (rowsToCopy.length > 0 && dataClaimSheet) {
          var targetRow = dataClaimSheet.getLastRow() + 1;
          dataClaimSheet.getRange(targetRow, 1, rowsToCopy.length, rowsToCopy[0].length).setValues(rowsToCopy);
      }

      // Menghapus dari DataClaim (Saat proses Clearing selesai)
      if (docsToRemoveFromDataClaim.length > 0 && dataClaimSheet) {
          var dcData = dataClaimSheet.getDataRange().getValues();
          // Loop mundur agar index deleteRow tidak rusak
          for(var x = dcData.length - 1; x >= 1; x--) {
              var dcDoc = String(dcData[x][1]).trim();
              if (docsToRemoveFromDataClaim.indexOf(dcDoc) !== -1) {
                  dataClaimSheet.deleteRow(x + 1);
              }
          }
      }

      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // ACTION: GET DASHBOARD DATA (COMPILE SHEET)
    // ==========================================
    else if (action === "getDashboardData") {
      var compileSheet = ss.getSheetByName(SHEET_COMPILE);
      var history = [];
      var compileData = [];
      
      var reqId = requestData.requesterId;
      var sysRole = requestData.requesterRole.toLowerCase();
      if (sysRole !== 'admin' && sysRole !== 'osc' && sysRole !== 'supervisor' && sysRole !== 'system manager') sysRole = 'non-osc';
      var managedDepots = requestData.managedDepots || [];

      var depoMasterSheet = ss.getSheetByName("DepoMaster");
      var depotPicMap = {};
      var depotNameMap = {};
      if(depoMasterSheet) {
          var dmData = depoMasterSheet.getDataRange().getValues();
          for(var dm=2; dm<dmData.length; dm++) {
              var kd = String(dmData[dm][1]).trim();
              depotPicMap[kd] = String(dmData[dm][10]).trim();
              depotNameMap[kd] = String(dmData[dm][2]).trim();
          }
      }

      var listCampaignSheet = ss.getSheetByName("ListCampaign");
      var campYearMap = {};
      if(listCampaignSheet) {
          var lcData = listCampaignSheet.getDataRange().getValues();
          for(var lc=1; lc<lcData.length; lc++) {
              campYearMap[String(lcData[lc][0]).trim()] = String(lcData[lc][7]).trim(); // A: 0, H: 7
          }
      }

      if (compileSheet) {
        var cData = compileSheet.getDataRange().getValues();
        for (var c = 1; c < cData.length; c++) {
          var noDoc = String(cData[c][1] || "").trim(); // B: No Doc
          var kdComp = String(cData[c][4] || "").trim(); // E: Kode Depot
          var depotName = depotNameMap[kdComp] || String(cData[c][5] || "").trim();
          if (!noDoc || !depotName) continue;
          
          var picOsc = depotPicMap[kdComp] || "";
          var isAllowed = false;

          if (sysRole === 'supervisor' || sysRole === 'system manager') isAllowed = true;
          else if (sysRole === 'osc') { if (picOsc === reqId || managedDepots.indexOf(depotName) !== -1) isAllowed = true; }
          else { if (managedDepots.indexOf(depotName) !== -1) isAllowed = true; }

          if (isAllowed) {
            var statRaw = String(cData[c][26] || "").trim(); // AA
            var histStatus = "Not Yet";
            if (statRaw === "Done") histStatus = "Done";
            else if (statRaw === "Submitted" || statRaw === "Released" || statRaw === "Claimed") histStatus = "Submitted";

            // Populate array for Detailed History Table
            history.push({
              noDoc: noDoc, kodeToko: String(cData[c][6] || "").trim(), namaToko: String(cData[c][7] || "").trim(),
              codeCampaign: String(cData[c][2] || "").trim(), campaign: String(cData[c][3] || "").trim(),
              periode: formatDateSafe(cData[c][11]) + " s/d " + formatDateSafe(cData[c][12]), 
              totalClaim: cData[c][10] || 0, status: histStatus,
              tglProses: formatDateSafe(cData[c][30]), osc: picOsc, depot: depotName,
              campaignYear: campYearMap[String(cData[c][2] || "").trim()] || "Lainnya"
            });

            // Populate raw data for Analytics/Summary Calculation
            compileData.push({
              depotCode: String(cData[c][4] || "").trim(), depotName: depotName,
              codeCampaign: String(cData[c][2] || "").trim(), campaign: String(cData[c][3] || "").trim(), reward: cData[c][10] || 0,
              campaignYear: campYearMap[String(cData[c][2] || "").trim()] || "Lainnya"
            });
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", history: history, compileData: compileData })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // ACTION: KELOLA AKSES & TAMBAH AKUN (TETAP SAMA SEPERTI SEBELUMNYA)
    // ==========================================
    else if (action === "requestPinChange") {
      var authoritySheet = ss.getSheetByName(SHEET_AUTHORITY);
      var authData = authoritySheet.getDataRange().getValues();
      for (var u = 2; u < authData.length; u++) {
        if (authData[u][4].toString() === requestData.userId) {
          authoritySheet.getRange(u + 1, 15).setValue(requestData.newPin); 
          return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Permintaan ganti PIN berhasil." })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "User tidak ditemukan." })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "addAccount") {
      var authoritySheet = ss.getSheetByName(SHEET_AUTHORITY);
      var depoMasterSheet = ss.getSheetByName("DepoMaster");
      var reqData = requestData.data;

      var authData = authoritySheet.getDataRange().getValues();
      for (var a = 2; a < authData.length; a++) {
        if (authData[a][4].toString() === reqData.userId) {
          return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "User ID sudah terdaftar! Gunakan ID lain." })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      var dmData = depoMasterSheet.getDataRange().getValues();
      var regAuto = "0"; var kodeDepotAuto = "0"; var inputDepotName = reqData.depotName || "Head Office";
      var activationStatus = reqData.isRequest ? "pending" : "approved";
      var isMakingAdmin = (reqData.role.toLowerCase() === "admin" || reqData.role.toLowerCase() === "kepala depot");
      var isMakingOscOrNonOsc = (!isMakingAdmin && reqData.role.toLowerCase() !== "supervisor" && reqData.role.toLowerCase() !== "system manager");

      if (isMakingAdmin) {
        var targetRowIdx = -1;
        for (var dm = 2; dm < dmData.length; dm++) {
          if (dmData[dm][2].toString().trim().toLowerCase() === reqData.depotName.toLowerCase()) {
            targetRowIdx = dm; regAuto = dmData[dm][0].toString(); kodeDepotAuto = dmData[dm][1].toString(); inputDepotName = dmData[dm][2].toString(); break;
          }
        }
        if (targetRowIdx === -1) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Depot tidak ditemukan di Master!" })).setMimeType(ContentService.MimeType.JSON);
        
        if (!reqData.isRequest) {
          var slotFound = false;
          for (var col = 8; col <= 10; col++) {
            if (depoMasterSheet.getRange(targetRowIdx + 1, col).getValue().toString().trim() === "") {
              depoMasterSheet.getRange(targetRowIdx + 1, col).setValue(reqData.userId); slotFound = true; break;
            }
          }
          if (!slotFound) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Gagal: Slot User Admin di depot ini sudah penuh!" })).setMimeType(ContentService.MimeType.JSON);
          if (reqData.assignOsc) {
            var currentOscs = depoMasterSheet.getRange(targetRowIdx + 1, 11).getValue().toString();
            if (currentOscs.indexOf(reqData.assignOsc) === -1) { depoMasterSheet.getRange(targetRowIdx + 1, 11).setValue(currentOscs ? currentOscs + ", " + reqData.assignOsc : reqData.assignOsc); }
          }
        }
      } 
      else if (isMakingOscOrNonOsc) {
        if (!reqData.isRequest && reqData.assignAdmin) {
          var targetDepots = reqData.assignAdmin.split(",").map(function(s){return s.trim();});
          var isAllDepot = targetDepots.indexOf("ALL_DEPOT") !== -1;
          var colToUpdate = (reqData.role.toLowerCase() === "osc") ? 11 : 12;

          for (var dx = 2; dx < dmData.length; dx++) {
            var dName = dmData[dx][2].toString().trim(); if (!dName) continue;
            if (isAllDepot || targetDepots.indexOf(dName) !== -1) {
              var currentUsers = depoMasterSheet.getRange(dx + 1, colToUpdate).getValue().toString();
              if (currentUsers.indexOf(reqData.userId) === -1) { depoMasterSheet.getRange(dx + 1, colToUpdate).setValue(currentUsers ? currentUsers + ", " + reqData.userId : reqData.userId); }
            }
          }
        }
      }

      var newAuthRow = new Array(31).fill("");
      newAuthRow[0] = regAuto; newAuthRow[1] = reqData.nama; newAuthRow[2] = kodeDepotAuto; newAuthRow[3] = inputDepotName; newAuthRow[4] = reqData.userId; newAuthRow[5] = reqData.pin; newAuthRow[6] = reqData.email; newAuthRow[7] = reqData.role; newAuthRow[8] = activationStatus; 
      newAuthRow[9] = "Hidden"; newAuthRow[10] = "No"; newAuthRow[11] = "No"; newAuthRow[12] = "No"; newAuthRow[13] = "No"; newAuthRow[14] = "No"; newAuthRow[15] = "No"; newAuthRow[16] = "No"; newAuthRow[17] = "Hidden"; newAuthRow[18] = "Requester"; newAuthRow[19] = "Requester"; newAuthRow[20] = "Requester"; newAuthRow[21] = "Requester";
      newAuthRow[24] = "no"; newAuthRow[25] = "no"; newAuthRow[26] = "no"; newAuthRow[27] = "no"; newAuthRow[30] = "restriction";
      authoritySheet.appendRow(newAuthRow);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Berhasil memproses akun." })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "getManageableData") {
      var requesterId = requestData.requesterId;
      var sysRole = normalizeRole(requestData.requesterRole);
      var requesterDepot = requestData.requesterDepot || ""; // Depot dari user yang login
      
      var depoMasterSheet = ss.getSheetByName("DepoMaster");
      var dmData = depoMasterSheet.getDataRange().getValues();
      var managedDepots = []; var allDepots = []; var adminOscMap = {}; var oscDepotMap = {}; var nonOscDepotMap = {};

      for (var dm = 2; dm < dmData.length; dm++) {
        var depotName = dmData[dm][2].toString().trim();
        if (depotName !== "") {
            allDepots.push(depotName);
            var oscUsersStr = dmData[dm][10] ? dmData[dm][10].toString() : "";
            var nonOscUsersStr = dmData[dm][11] ? dmData[dm][11].toString() : "";
            var oscUsers = oscUsersStr.split(",").map(function(u){ return u.trim(); });
            var nonOscUsers = nonOscUsersStr.split(",").map(function(u){ return u.trim(); });

            adminOscMap[depotName] = oscUsersStr;
            oscUsers.forEach(function(ou){ if(ou) { if(!oscDepotMap[ou]) oscDepotMap[ou] = []; oscDepotMap[ou].push(depotName); } });
            nonOscUsers.forEach(function(nou){ if(nou) { if(!nonOscDepotMap[nou]) nonOscDepotMap[nou] = []; nonOscDepotMap[nou].push(depotName); } });

            if (sysRole === "supervisor" || sysRole === "system manager") managedDepots.push(depotName);
            else if (oscUsers.indexOf(requesterId) !== -1 || nonOscUsers.indexOf(requesterId) !== -1) managedDepots.push(depotName);
        }
      }

      var authoritySheet = ss.getSheetByName(SHEET_AUTHORITY);
      var authData = authoritySheet.getDataRange().getValues();
      var manageableUsers = [];

      // Level-rank untuk pengecekan hierarki
      var LEVEL = { 'system manager': 4, 'supervisor': 3, 'osc': 2, 'non-osc': 2, 'admin': 1, 'kepala depot': 1 };
      var requesterLevel = LEVEL[sysRole] || 1;

      // Ambil depot user yang login (untuk filter Admin/KepalaDepot)
      if (!requesterDepot && requestData.requesterDepot) requesterDepot = requestData.requesterDepot;

      for (var a = 2; a < authData.length; a++) {
        var uId = authData[a][4].toString().trim();
        var uDepot = authData[a][3].toString().trim();
        var uRole = authData[a][7] ? authData[a][7].toString().trim() : "admin";
        var uSysRole = normalizeRole(uRole);
        var uLevel = LEVEL[uSysRole] || 1;

        if (uId === requesterId) continue; // Skip diri sendiri

        // RBAC Hierarki Ketat:
        // 1. Tidak boleh lihat user yang levelnya >= level sendiri (kecuali System Manager)
        // 2. Scope berbasis role:
        //    - admin/kepala depot: hanya lihat user di depot yang sama DAN level lebih rendah (tidak ada di bawah admin)
        //    - osc: lihat admin/kepala depot di depot yang dikelolanya
        //    - supervisor: lihat osc + admin di depot yang dikelolanya
        //    - system manager: lihat semua

        var isAllowed = false;

        if (sysRole === 'system manager') {
          // System Manager lihat semua (boleh lihat sesama System Manager kecuali diri sendiri)
          isAllowed = true;
        } 
        else if (sysRole === 'supervisor') {
          // SPV: lihat OSC, Non-OSC, Admin, Kepala Depot — TIDAK lihat System Manager dan sesama SPV
          if (uSysRole !== 'system manager' && uSysRole !== 'supervisor') {
            isAllowed = true;
          }
        } 
        else if (sysRole === 'osc') {
          // OSC: hanya lihat Admin dan Kepala Depot di depot yang dikelolanya
          if ((uSysRole === 'admin') && managedDepots.indexOf(uDepot) !== -1) {
            isAllowed = true;
          }
        } 
        else {
          // Admin / Kepala Depot: TIDAK bisa mengakses siapapun
          // (hanya bisa lihat akun milik sendiri — sudah di-skip di atas)
          isAllowed = false;
        }

        if (isAllowed) {
          var asOsc = adminOscMap[uDepot] || ""; var asDepots = [];
          if(uSysRole === 'osc') asDepots = oscDepotMap[uId] || [];
          else if(uSysRole === 'non-osc') asDepots = nonOscDepotMap[uId] || [];

          var kodeDepotUser = authData[a][2] ? authData[a][2].toString().trim() : "";

          manageableUsers.push({
            userId: uId, email: authData[a][6].toString(), depotName: uDepot, kodeDepot: kodeDepotUser,
            role: uRole, sysRole: uSysRole, activation: authData[a][8] ? authData[a][8].toString() : "Inactive",
            auth: { 
                i: authData[a][8] ? authData[a][8].toString().trim() : "Inactive", 
                j: authData[a][9] ? authData[a][9].toString().trim() : "Hidden", 
                k: authData[a][10] ? authData[a][10].toString().trim() : "No", 
                l: authData[a][11] ? authData[a][11].toString().trim() : "No", 
                m: authData[a][12] ? authData[a][12].toString().trim() : "No", 
                n: authData[a][13] ? authData[a][13].toString().trim() : "No", 
                o: authData[a][14] ? authData[a][14].toString().trim() : "No", 
                p: authData[a][15] ? authData[a][15].toString().trim() : "No", 
                q: authData[a][16] ? authData[a][16].toString().trim() : "No", 
                r: authData[a][17] ? authData[a][17].toString().trim() : "Hidden", 
                s: authData[a][18] ? authData[a][18].toString().trim() : "Requester",
                t: authData[a][19] ? authData[a][19].toString().trim() : "Requester",
                u: authData[a][20] ? authData[a][20].toString().trim() : "Requester",
                v: authData[a][21] ? authData[a][21].toString().trim() : "Requester"
            },
            kelolaAccess: { pin: authData[a][24] ? authData[a][24].toString() : "no", manual: authData[a][25] ? authData[a][25].toString() : "no", mass: authData[a][26] ? authData[a][26].toString() : "no", activation: authData[a][27] ? authData[a][27].toString() : "no" },
            addAccountLevel: authData[a][30] ? authData[a][30].toString() : "restriction",
            pinStatus: authData[a][14] ? authData[a][14].toString().trim() !== "" ? "pending" : "" : "",
            assignedOsc: asOsc, assignedDepots: asDepots
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", users: manageableUsers, managedDepots: managedDepots, allDepots: allDepots })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "updateUserAccess") {
      var authoritySheet = ss.getSheetByName(SHEET_AUTHORITY);
      var reqData = requestData.data;
      var authData = authoritySheet.getDataRange().getValues();
      for (var u = 2; u < authData.length; u++) {
        if (authData[u][4].toString() === reqData.targetUserId) {
           var rIdx = u + 1;
           if (reqData.auth) {
               if (reqData.auth.i) authoritySheet.getRange(rIdx, 9).setValue(reqData.auth.i);  // I
               if (reqData.auth.j) authoritySheet.getRange(rIdx, 10).setValue(reqData.auth.j); // J
               if (reqData.auth.k) authoritySheet.getRange(rIdx, 11).setValue(reqData.auth.k); // K
               if (reqData.auth.l) authoritySheet.getRange(rIdx, 12).setValue(reqData.auth.l); // L
               if (reqData.auth.m) authoritySheet.getRange(rIdx, 13).setValue(reqData.auth.m); // M
               if (reqData.auth.n) authoritySheet.getRange(rIdx, 14).setValue(reqData.auth.n); // N
               if (reqData.auth.o) authoritySheet.getRange(rIdx, 15).setValue(reqData.auth.o); // O
               if (reqData.auth.p) authoritySheet.getRange(rIdx, 16).setValue(reqData.auth.p); // P
               if (reqData.auth.q) authoritySheet.getRange(rIdx, 17).setValue(reqData.auth.q); // Q
               if (reqData.auth.r) authoritySheet.getRange(rIdx, 18).setValue(reqData.auth.r); // R
               if (reqData.auth.s) authoritySheet.getRange(rIdx, 19).setValue(reqData.auth.s); // S
               if (reqData.auth.t) authoritySheet.getRange(rIdx, 20).setValue(reqData.auth.t); // T
               if (reqData.auth.u) authoritySheet.getRange(rIdx, 21).setValue(reqData.auth.u); // U
               if (reqData.auth.v) authoritySheet.getRange(rIdx, 22).setValue(reqData.auth.v); // V - Otorisasi Kelola
           }
           if (reqData.kelolaAccess) {
               if (reqData.kelolaAccess.pin) authoritySheet.getRange(rIdx, 25).setValue(reqData.kelolaAccess.pin); // Y
               if (reqData.kelolaAccess.manual) authoritySheet.getRange(rIdx, 26).setValue(reqData.kelolaAccess.manual); // Z
               if (reqData.kelolaAccess.mass) authoritySheet.getRange(rIdx, 27).setValue(reqData.kelolaAccess.mass); // AA
               if (reqData.kelolaAccess.activation) authoritySheet.getRange(rIdx, 28).setValue(reqData.kelolaAccess.activation); // AB
           }
           if (reqData.addAccountLevel) {
               authoritySheet.getRange(rIdx, 31).setValue(reqData.addAccountLevel); // AE
           }
           if (reqData.approvePin) {
               var pendingPin = authData[u][14];
               if (pendingPin) {
                   authoritySheet.getRange(rIdx, 6).setValue(pendingPin); // F -> Replace Pin
                   authoritySheet.getRange(rIdx, 15).clearContent(); // O -> Clear Request Pin (Wait O? P?) 14 is O
                   authoritySheet.getRange(rIdx, 32).setValue(0); // AF -> Reset Block
               }
           }
           
           // If Supervisor assigning Admin/OSC to Depots
           var depoMasterSheet = ss.getSheetByName("DepoMaster");
           if (depoMasterSheet && (reqData.assignOsc || reqData.assignDepots) && reqData.targetUserId) {
               var sysTgtRole = authData[u][7].toString().trim().toLowerCase();
               var dmData = depoMasterSheet.getDataRange().getValues();
               
               if (sysTgtRole === 'admin' && reqData.assignOsc) {
                   var targetDepot = authData[u][2].toString().trim(); // Kode Depot atau Nama Depot? (authData[u][3] is nama)
                   var tDepotName = authData[u][3].toString().trim();
                   if(tDepotName) {
                       for(var md = 2; md < dmData.length; md++) {
                           if(dmData[md][2].toString().trim() === tDepotName) {
                               depoMasterSheet.getRange(md + 1, 11).setValue(reqData.assignOsc); // K
                               break;
                           }
                       }
                   }
               } 
               else if (sysTgtRole === 'osc' && reqData.assignDepots) {
                   var dpts = reqData.assignDepots.split(",").map(x => x.trim());
                   for(var md2 = 2; md2 < dmData.length; md2++) {
                       var dn = dmData[md2][2].toString().trim();
                       if(dn) {
                           var cu = dmData[md2][10].toString();
                           // hapus user dari depot jika tidak dicentang (opsional), ini menimpa/menambah untuk simplicity
                           if(dpts.indexOf(dmData[md2][1].toString().trim()) !== -1) {
                               if(cu.indexOf(reqData.targetUserId) === -1) {
                                   depoMasterSheet.getRange(md2 + 1, 11).setValue(cu ? cu + ", " + reqData.targetUserId : reqData.targetUserId);
                               }
                           }
                       }
                   }
               }
           }
           
           SpreadsheetApp.flush();
           return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Akses Matrix user berhasil diperbarui!" })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Gagal: User ID tidak ada." })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "updateRoleAccess") {
      var authoritySheet = ss.getSheetByName(SHEET_AUTHORITY);
      var reqData = requestData.data; // { targetRole: 'admin', menus: {}, claimAccess: {} ... }
      var authData = authoritySheet.getDataRange().getValues();
      var countUpdated = 0;

      for (var u = 2; u < authData.length; u++) {
        var rowRole = authData[u][7] ? authData[u][7].toString().trim().toLowerCase() : "admin";
        var isMatch = false;
        if (reqData.targetRole.toLowerCase() === 'semualainnya') {
            if (rowRole !== 'admin' && rowRole !== 'kepala depot' && rowRole !== 'osc' && rowRole !== 'supervisor' && rowRole !== 'system manager') isMatch = true;
        } else {
            if (rowRole === reqData.targetRole.toLowerCase()) isMatch = true;
        }

        if (isMatch) {
            var rIdx = u + 1;
            if (reqData.menus) {
                if (reqData.menus.claim) authoritySheet.getRange(rIdx, 10).setValue(reqData.menus.claim);
                if (reqData.menus.kelola) authoritySheet.getRange(rIdx, 11).setValue(reqData.menus.kelola);
                if (reqData.menus.tambah) authoritySheet.getRange(rIdx, 12).setValue(reqData.menus.tambah);
            }
            if (reqData.claimAccess) {
                if (reqData.claimAccess.manual) authoritySheet.getRange(rIdx, 18).setValue(reqData.claimAccess.manual);
                if (reqData.claimAccess.mass) authoritySheet.getRange(rIdx, 19).setValue(reqData.claimAccess.mass);
                if (reqData.claimAccess.release) authoritySheet.getRange(rIdx, 20).setValue(reqData.claimAccess.release);
                if (reqData.claimAccess.history) authoritySheet.getRange(rIdx, 21).setValue(reqData.claimAccess.history);
                if (reqData.claimAccess.summary) authoritySheet.getRange(rIdx, 22).setValue(reqData.claimAccess.summary);
            }
            if (reqData.kelolaAccess) {
                if (reqData.kelolaAccess.pin) authoritySheet.getRange(rIdx, 25).setValue(reqData.kelolaAccess.pin);
                if (reqData.kelolaAccess.manual) authoritySheet.getRange(rIdx, 26).setValue(reqData.kelolaAccess.manual);
                if (reqData.kelolaAccess.mass) authoritySheet.getRange(rIdx, 27).setValue(reqData.kelolaAccess.mass);
                if (reqData.kelolaAccess.activation) authoritySheet.getRange(rIdx, 28).setValue(reqData.kelolaAccess.activation);
            }
            if (reqData.addAccountLevel) authoritySheet.getRange(rIdx, 31).setValue(reqData.addAccountLevel);
            countUpdated++;
        }
      }
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Hak akses matriks Role berhasil diperbarui disinkronisasikan ke " + countUpdated + " user." })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "updateUserActivation") { // Dipisah agar aktivasi tetap per-user, bukan per-role
      var authoritySheet = ss.getSheetByName(SHEET_AUTHORITY);
      var reqData = requestData.data;
      var authData = authoritySheet.getDataRange().getValues();
      for (var u = 2; u < authData.length; u++) {
        if (authData[u][4].toString() === reqData.targetUserId) { 
           authoritySheet.getRange(u + 1, 9).setValue(reqData.activation);
           if (reqData.approvePin) {
               var pendingPin = authData[u][14];
               if (pendingPin) {
                   authoritySheet.getRange(u + 1, 6).setValue(pendingPin); // Replace PIN
                   authoritySheet.getRange(u + 1, 15).clearContent(); // Clear buffer
                   authoritySheet.getRange(u + 1, 32).setValue(0); // Reset attempts
               }
           }
           SpreadsheetApp.flush();
           return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Aktivasi/PIN user dikonfirmasi." })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "User tidak ditemukan." })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // DATA REQUEST PROFIL (NEW)
    // ==========================================
    else if (action === "submitProfileUpdate") {
      var reqSheet = ss.getSheetByName(SHEET_REQ_PROFILE);
      if(!reqSheet) {
        reqSheet = ss.insertSheet(SHEET_REQ_PROFILE);
        reqSheet.appendRow(["Timestamp", "Role Requester", "Kode Depot", "Nama Depot", "Requester ID", "Payload JSON", "Status"]);
      }
      var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MMM-yyyy HH:mm:ss");
      var d = requestData.data;
      reqSheet.appendRow([now, d.sysRole, d.kodeDepot, d.namaDepot, d.requesterId, JSON.stringify(d.changes), "PENDING"]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Request profil disubmit ke OSC/Manager." })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "getProfileRequests") {
      var reqSheet = ss.getSheetByName(SHEET_REQ_PROFILE);
      var requests = [];
      if(reqSheet) {
          var rData = reqSheet.getDataRange().getValues();
          for(var r=1; r<rData.length; r++) {
              if (rData[r][6] === "PENDING") {
                 requests.push({
                     rowId: r + 1,
                     timestamp: formatDateSafe(rData[r][0]),
                     role: String(rData[r][1]),
                     kodeDepot: String(rData[r][2]),
                     namaDepot: String(rData[r][3]),
                     requesterId: String(rData[r][4]),
                     changes: JSON.parse(rData[r][5] || "{}")
                 });
              }
          }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", requests: requests })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "approveProfileRequest") {
      var reqSheet = ss.getSheetByName(SHEET_REQ_PROFILE);
      var depoMasterSheet = ss.getSheetByName("DepoMaster");
      var rId = requestData.rowId;
      var statusAct = requestData.statusAction; // 'APPROVED' / 'REJECTED'
      
      if(reqSheet) {
         reqSheet.getRange(rId, 7).setValue(statusAct); // Update Status
         
         if(statusAct === "APPROVED") {
             // Overwrite di DepoMaster
             var dData = reqSheet.getRange(rId, 1, 1, 7).getValues()[0];
             var targetKodeDepot = String(dData[2]);
             var changes = JSON.parse(dData[5]);
             
             if(depoMasterSheet && targetKodeDepot) {
                 var dmDataFull = depoMasterSheet.getDataRange().getValues();
                 for(var mx = 2; mx < dmDataFull.length; mx++) {
                     if(String(dmDataFull[mx][1]) === targetKodeDepot) {
                         // Mapping:
                         // changes.sales -> R(18)
                         if(changes.alamat !== undefined) depoMasterSheet.getRange(mx + 1, 13).setValue(changes.alamat);
                         if(changes.sales !== undefined) depoMasterSheet.getRange(mx + 1, 18).setValue(changes.sales);
                         if(changes.admin !== undefined) depoMasterSheet.getRange(mx + 1, 19).setValue(changes.admin);
                         if(changes.fg !== undefined) depoMasterSheet.getRange(mx + 1, 20).setValue(changes.fg);
                         if(changes.pcc !== undefined) depoMasterSheet.getRange(mx + 1, 21).setValue(changes.pcc);
                         if(changes.teknisi !== undefined) depoMasterSheet.getRange(mx + 1, 22).setValue(changes.teknisi);
                         if(changes.driver !== undefined) depoMasterSheet.getRange(mx + 1, 23).setValue(changes.driver);
                         if(changes.lainnya !== undefined) depoMasterSheet.getRange(mx + 1, 24).setValue(changes.lainnya);
                         if(changes.kepalaDepot !== undefined) depoMasterSheet.getRange(mx + 1, 29).setValue(changes.kepalaDepot); // AC
                         if(changes.kepalaAdmin !== undefined) depoMasterSheet.getRange(mx + 1, 30).setValue(changes.kepalaAdmin); // AD
                         break;
                     }
                 }
             }
         }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Profil request telah di-" + statusAct })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // ACTION: GET LOG ACTIVITY (RBAC SCOPED)
    // ==========================================
    else if (action === "getLogActivity") {
      var logSheet = ss.getSheetByName(SHEET_ACTIVITY_LOG);
      var requesterId = requestData.requesterId;
      var sysRole = normalizeRole(requestData.requesterRole);
      var managedDepots = requestData.managedDepots || [];
      var filterUser = requestData.filterUser || "";
      var filterJenis = requestData.filterJenis || "";

      if (!logSheet) return ContentService.createTextOutput(JSON.stringify({ status: "success", logs: [] })).setMimeType(ContentService.MimeType.JSON);

      // Build userid-to-sysrole map from Authority for scope check
      var authoritySheet = ss.getSheetByName(SHEET_AUTHORITY);
      var authData = authoritySheet.getDataRange().getValues();
      var userRoleMap = {}; // userId -> { sysRole, depot }
      var LEVEL = { 'system manager': 4, 'supervisor': 3, 'osc': 2, 'non-osc': 2, 'admin': 1, 'kepala depot': 1 };
      var requesterLevel = LEVEL[sysRole] || 1;

      for (var au = 2; au < authData.length; au++) {
        var uId = authData[au][4].toString().trim();
        var uDepot = authData[au][3].toString().trim();
        var uRaw = authData[au][7] ? authData[au][7].toString().trim() : "admin";
        var uSys = normalizeRole(uRaw);
        userRoleMap[uId] = { sysRole: uSys, depot: uDepot };
      }

      var logData = logSheet.getDataRange().getValues();
      var logs = [];

      for (var lg = 1; lg < logData.length; lg++) {
        var lTimestamp = logData[lg][0] ? formatDateSafe(logData[lg][0]) : "";
        var lUserId = logData[lg][1] ? logData[lg][1].toString().trim() : "";
        var lRole = logData[lg][2] ? logData[lg][2].toString().trim() : "";
        var lDetail = logData[lg][3] ? logData[lg][3].toString().trim() : "";

        // Apply text filters
        if (filterUser && lUserId.toLowerCase().indexOf(filterUser.toLowerCase()) === -1) continue;
        if (filterJenis && lDetail.toLowerCase().indexOf(filterJenis.toLowerCase()) === -1) continue;

        // RBAC scope: determine if requester can see this log entry
        var canSee = false;
        if (sysRole === 'system manager') {
          canSee = true;
        } else if (lUserId === requesterId) {
          canSee = true; // Always see own logs
        } else {
          var targetInfo = userRoleMap[lUserId];
          if (targetInfo) {
            var tLevel = LEVEL[targetInfo.sysRole] || 1;
            var tDepot = targetInfo.depot;
            if (sysRole === 'supervisor' && tLevel < 3) {
              canSee = true;
            } else if (sysRole === 'osc' && tLevel === 1 && managedDepots.indexOf(tDepot) !== -1) {
              canSee = true;
            }
          }
        }

        if (canSee) {
          logs.push({ timestamp: lTimestamp, userId: lUserId, role: lRole, detail: lDetail });
        }
      }

      // Return most recent first
      logs.reverse();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", logs: logs })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setHeaders({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
}