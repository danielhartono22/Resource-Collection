const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Patch 1: Show Sidebar and TopHeader after login!
// We insert it after `currentUserData = res.data;`
let loginHook = `currentUserData = res.data; 
                    depoInfoData = res.data.depoInfo;
                    document.getElementById('sidebar').classList.remove('hidden'); 
                    document.getElementById('topHeader').classList.remove('hidden');
                    document.getElementById('displayDepotDropdown').textContent = res.data.depot + " (" + res.data.kodeDepot + ")";`;
html = html.replace(/currentUserData = res\.data;/, loginHook);

// Also the mock login hook
let mockHook = `currentUserData = { userId: uid, namaLengkap: "MOCK USER", role: "Admin", sysRole: "admin", kodeDepot: "1S", depot: "Bogor", claimAccess: {manual:'approved', mass:'approved', release:'approved', history:'approved', summary:'approved'}, menus: {claim:'approved', kelola:'approved', tambah:'approved'} };
                    document.getElementById('sidebar').classList.remove('hidden'); 
                    document.getElementById('topHeader').classList.remove('hidden');
                    document.getElementById('displayDepotDropdown').textContent = "Bogor (1S)";`;
html = html.replace(/currentUserData = { userId: uid[\s\S]*?};/, mockHook);

// Patch 2: Hide Legacy Navbar / Dashboard 
// Karena sekarang pakai layout Sidebar, pastikan document.getElementById('dashboardSection').classList.remove('hidden') tidak hanya memunculkan isi lama.
// (Atau biarkan saja masuk ke module Utama).
// remove legacy userInfo
html = html.replace(/document\.getElementById\('userInfo'\)\.classList\.remove\('hidden'\);/g, "/* Legacy userInfo removed */");
html = html.replace(/document\.getElementById\("userInfo"\)\.classList\.remove\("hidden"\);/g, "/* Legacy userInfo removed */");

fs.writeFileSync('index.html', html);
console.log("Fixed login hooks!");
