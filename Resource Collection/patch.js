const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. WRAP LAYOUT (SHELL + SIDEBAR + HEADER)
html = html.replace(/<nav class="bg-red-600[\s\S]*?<\/nav>/, '');
let app_shell_start = `
<div class="flex h-screen w-full overflow-hidden bg-gray-100 font-sans text-gray-900">
    <!-- SIDEBAR -->
    <aside id="sidebar" class="w-16 hover:w-64 flex-shrink-0 bg-red-800 text-white transition-all duration-300 flex flex-col z-50 shadow-xl overflow-hidden fixed md:relative h-full group hidden">
        <div class="h-16 flex items-center justify-center border-b border-red-700/50 flex-shrink-0 group-hover:justify-start group-hover:px-4 transition-all w-full">
            <i class='fas fa-cubes text-2xl group-hover:mr-3'></i>
            <span class="font-bold text-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Authority Ledger</span>
        </div>
        <div class="flex-1 py-4 flex flex-col gap-2 overflow-y-auto overflow-x-hidden w-full">
            <button onclick="goToHome()" class="w-full flex items-center px-4 py-3 hover:bg-red-700 transition cursor-pointer text-left focus:outline-none focus:bg-red-900 border-l-4 border-transparent focus:border-white w-full group/btn">
                <div class="w-8 flex-shrink-0 flex justify-center"><i class="fas fa-home text-lg"></i></div>
                <span class="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-medium ml-2 text-sm tracking-wide">Dashboard Utama</span>
            </button>
            <button id="sideNavClaim" onclick="openModule('claim')" class="hidden w-full flex items-center px-4 py-3 hover:bg-red-700 transition cursor-pointer text-left focus:outline-none focus:bg-red-900 border-l-4 border-transparent focus:border-white w-full group/btn relative">
                <div class="w-8 flex-shrink-0 flex justify-center"><i class="fas fa-file-invoice-dollar text-lg text-yellow-300 group-focus/btn:text-white group-hover/btn:-translate-y-0.5 transition-transform"></i></div>
                <span class="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-medium ml-2 text-sm tracking-wide text-yellow-100">Claim System</span>
            </button>
            <button id="sideNavKelola" onclick="openModule('manageAccess')" class="hidden w-full flex items-center px-4 py-3 hover:bg-red-700 transition cursor-pointer text-left focus:outline-none focus:bg-red-900 border-l-4 border-transparent focus:border-white w-full group/btn">
                <div class="w-8 flex-shrink-0 flex justify-center"><i class="fas fa-users-cog text-lg text-blue-300 group-focus/btn:text-white group-hover/btn:rotate-12 transition-transform"></i></div>
                <span class="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-medium ml-2 text-sm tracking-wide text-blue-100">Kelola Akses <i class="fas fa-lock ml-2 opacity-50 text-[10px]"></i></span>
            </button>
        </div>
    </aside>

    <!-- MAIN CONTENT AREA -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
        <!-- STICKY HEADER -->
        <header id="topHeader" class="hidden flex-shrink-0 h-16 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] flex items-center justify-between px-6 z-40 w-full sticky top-0 backdrop-blur-md bg-white/90">
            <div class="flex items-center gap-4">
                <div class="text-xl font-black text-gray-800 tracking-tight flex items-center">
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-900">Authority Ledger</span>
                </div>
                <!-- Runtime Counter -->
                <div class="bg-gray-50 border border-gray-200 px-3 py-1 rounded-full flex items-center text-gray-600 text-xs shadow-inner hidden md:flex ml-4 mt-0.5 pointer-events-none">
                    <i class="fas fa-stopwatch mr-1.5 text-red-500 animate-pulse"></i>
                    <span class="font-bold tracking-widest font-mono text-[11px]" id="runtimeCounter">00:00:00</span>
                </div>
            </div>

            <!-- Header Right Section -->
            <div class="flex flex-row items-center gap-4">
                <div class="text-right hidden sm:block">
                    <p id="displayUser" class="text-sm font-bold text-gray-800 leading-none mb-1">User Name</p>
                    <p id="displayRole" class="text-[9px] uppercase font-black text-red-600 tracking-widest bg-red-50 inline-block px-1.5 py-0.5 rounded">ROLE</p>
                </div>
                
                <!-- Settings Dropdown -->
                <div class="relative text-left flex items-center">
                    <button id="userDropdownBtn" onclick="toggleSettingsDropdown()" class="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 hover:shadow-md text-red-700 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 overflow-hidden border border-red-200 group/prof">
                        <i class="fas fa-user pointer-events-none mt-1 group-hover/prof:scale-110 transition-transform"></i>
                    </button>
                    <!-- Dropdown Panel -->
                    <div id="settingsDropdown" class="hidden origin-top-right absolute right-0 top-12 mt-2 w-64 rounded-2xl shadow-xl bg-white border border-gray-100 divide-y divide-gray-50 transform transition-all z-50 overflow-hidden">
                        <div class="px-5 py-4 bg-gray-50">
                            <p class="text-[9px] uppercase font-black tracking-widest text-gray-400 mb-1">Entitas Tertaut</p>
                            <p id="displayDepotDropdown" class="text-sm font-black text-gray-800 truncate" title="Sistem Manager / Head Office">---</p>
                        </div>
                        <div class="py-2">
                            <button onclick="openProfileModal()" class="group flex w-full items-center px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none transition-colors duration-200">
                                <div class="bg-blue-50 text-blue-500 rounded p-1.5 mr-3 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors"><i class="fas fa-id-card-alt w-4 text-center"></i></div> Profil Base / Depot
                            </button>
                            <button onclick="toggleSettingsDropdown(); openModule('manageAccess')" id="settingAksesBtn" class="hidden group flex w-full items-center px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-purple-50 hover:text-purple-700 focus:outline-none transition-colors duration-200">
                                <div class="bg-purple-50 text-purple-500 rounded p-1.5 mr-3 group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors"><i class="fas fa-shield-alt w-4 text-center"></i></div> Manajemen Akses
                            </button>
                            <a href="#" class="group flex w-full items-center px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none transition-colors duration-200">
                                <div class="bg-emerald-50 text-emerald-500 rounded p-1.5 mr-3 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors"><i class="fas fa-book w-4 text-center"></i></div> Resource Hub
                            </a>
                        </div>
                        <div class="p-2 border-t border-gray-100 bg-gray-50">
                            <button onclick="logout()" class="group flex w-full items-center justify-center px-4 py-2 text-sm text-red-600 hover:bg-red-600 hover:text-white font-black focus:outline-none transition-colors rounded-xl border border-transparent hover:border-red-700 shadow-sm hover:shadow-md">
                                <i class="fas fa-sign-out-alt mr-2 group-hover:-translate-x-1 transition-transform"></i> Keluar Sistem
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- MAIN SCROLLABLE AREA -->
        <main id="mainScrollArea" class="flex-1 overflow-auto p-4 md:p-6 bg-gray-100/50 relative w-full h-full">
            <div id="contentWrapper" class="max-w-6xl mx-auto pb-10 w-full h-full">
`;
html = html.replace(/<div class="max-w-6xl mx-auto p-4 md:p-6 mt-4">/, app_shell_start);
html = html.replace('</body>', '\n            </div>\n        </main>\n    </div>\n</div>\n</body>');

// 2. HAPUS TAMBAH AKUN DI DASHBOARD & GABUNGKAN KE KELOLA AKSES
html = html.replace(/<div id="menuTambahAkun"[\s\S]*?<\/div>/, '');

let new_manage_access = `
        <!-- SECTION 4: KELOLA AKSES TERPADU (RBAC) -->
        <div id="manageAccessSection" class="hidden">
            <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 border border-gray-100 mb-8">
                <div class="flex flex-col md:flex-row justify-between md:items-end border-b pb-4 mb-6 gap-4">
                    <div>
                        <h2 class="text-2xl font-black text-gray-800 tracking-tight flex items-center"><div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-inner"><i class="fas fa-users-cog"></i></div> Kelola Akses <span class="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded ml-2 text-sm tracking-widest border border-red-200">RBAC</span></h2>
                        <p class="text-sm text-gray-500 mt-2 font-medium">Sentralisasi manajemen akun, persetujuan request profil, dan Role-Based Access Control.</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="fetchManageableData()" class="bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold py-2.5 px-4 rounded-xl shadow-sm border border-gray-200 transition focus:ring-2 focus:ring-gray-300 flex items-center hover:shadow hover:-translate-y-0.5 active:translate-y-0">
                            <i class="fas fa-sync-alt mr-2 text-gray-400"></i> Refresh
                        </button>
                        <button onclick="showKelolaTab('req')" class="bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 text-sm font-bold py-2.5 px-4 rounded-xl shadow-sm transition relative focus:ring-2 focus:ring-orange-300 flex items-center hover:shadow hover:-translate-y-0.5 active:translate-y-0">
                            <i class="fas fa-bell mr-2 text-orange-400"></i> Requests <span id="reqBadge" class="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black hidden shadow-md border-2 border-white animate-bounce-slow">0</span>
                        </button>
                        <button onclick="showKelolaTab('add')" id="btnTabTambahAkunOuter" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-5 rounded-xl shadow-md transition focus:ring-2 focus:ring-emerald-500 flex items-center hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0">
                            <i class="fas fa-user-plus mr-2"></i> Tambah Akun
                        </button>
                    </div>
                </div>

                <div id="manageLoader" class="text-center py-10 hidden">
                    <div class="loader mx-auto mb-3 border-t-blue-600 border-gray-200"></div>
                </div>

                <!-- SUB TABS KELOLA -->
                <div class="flex space-x-2 md:space-x-4 mb-8 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-200 overflow-x-auto shadow-inner">
                    <button onclick="showKelolaTab('users')" id="tabUsers" class="flex-1 min-w-[140px] py-2.5 font-bold rounded-xl bg-white shadow-sm px-4 text-blue-700 transition-colors focus:outline-none">Daftar Pengguna</button>
                    <button onclick="showKelolaTab('roles')" id="tabRoles" class="hidden flex-1 min-w-[140px] py-2.5 font-bold rounded-xl text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm px-4 transition-colors focus:outline-none">Matrix Otoritas</button>
                </div>

                <!-- VIEW USERS (CARD GRID) -->
                <div id="viewUsersList" class="block">
                    <div class="flex gap-4 mb-6">
                        <div class="relative w-full md:w-1/3">
                            <i class="fas fa-search absolute left-4 top-3 text-gray-400"></i>
                            <input type="text" id="searchUserKelola" onkeyup="renderUserCards()" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl shadow-inner bg-gray-50 font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition" placeholder="Cari nama atau UID...">
                        </div>
                        <div class="relative">
                            <select id="filterRoleKelola" onchange="renderUserCards()" class="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-700 shadow-sm cursor-pointer hover:border-gray-400 focus:ring-2 focus:ring-blue-500 appearance-none pr-10">
                                <option value="ALL">🔍 Filter Role</option><option value="Admin">Admin Pusat/Depot</option><option value="OSC">OSC Unit</option><option value="Supervisor">Supervisor/Manager</option><option value="Lainnya">Staf Lainnya</option>
                            </select>
                            <i class="fas fa-chevron-down absolute right-3 top-3.5 text-gray-400 pointer-events-none text-[10px]"></i>
                        </div>
                    </div>
                    <div id="userCardsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <!-- Cards injected by JS -->
                    </div>
                </div>

                <!-- VIEW ROLES MATRIX -->
                <div id="viewRolesMatrix" class="hidden">
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl mb-8 flex gap-5 items-start shadow-inner">
                        <div class="bg-white p-2 rounded-full shadow-sm text-blue-500 mt-1"><i class="fas fa-shield-alt text-2xl"></i></div>
                        <div>
                            <h4 class="font-bold text-blue-900 mb-1">Mode Role-Based Access Control</h4>
                            <p class="text-xs text-blue-800/80 leading-relaxed font-medium">Penyetelan otoritas tidak lagi diisolasi per-user melainkan disatukan. Mengubah matrix hak akses pada salah satu Role di bawah ini akan <strong>secara otomatis di-sinkronisasikan ke seluruh pengguna</strong> yang menjabat Role tersebut pada database utama.</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Role Panel Admin -->
                        <div class="border border-gray-200 rounded-3xl shadow-sm bg-white overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all border-t-8 border-t-blue-500 flex flex-col group relative">
                            <div class="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="pt-6 pb-2 px-6 flex flex-col items-center text-center flex-1 relative z-10">
                                <div class="w-20 h-20 bg-white border border-blue-100 shadow-inner rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 transform -rotate-3 group-hover:rotate-0"><i class="fas fa-desktop text-4xl text-blue-600"></i></div>
                                <h3 class="font-black text-gray-800 tracking-tight text-xl mb-2">ADMIN DEPOT</h3>
                                <p class="text-[11px] text-gray-500 mb-6 flex-1 px-4 leading-relaxed font-medium">Peran operasional front-liner yang bertugas melakukan klaim manual dan upload data massal.</p>
                            </div>
                            <div class="p-4 bg-gray-50 mt-auto relative z-10 border-t">
                                <button onclick="editRoleMatrix('admin')" class="w-full py-3 bg-white hover:bg-blue-600 hover:text-white border border-gray-200 hover:border-blue-600 text-blue-700 rounded-xl font-black text-sm shadow-sm transition-all focus:ring-2 focus:ring-blue-500 ease-in-out">Konfigurasi Matrix</button>
                            </div>
                        </div>
                        <!-- Role Panel OSC -->
                        <div class="border border-gray-200 rounded-3xl shadow-sm bg-white overflow-hidden hover:shadow-xl hover:border-indigo-300 transition-all border-t-8 border-t-indigo-500 flex flex-col group relative">
                            <div class="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="pt-6 pb-2 px-6 flex flex-col items-center text-center flex-1 relative z-10">
                                <div class="w-20 h-20 bg-white border border-indigo-100 shadow-inner rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 transform rotate-3 group-hover:rotate-0"><i class="fas fa-user-check text-4xl text-indigo-600"></i></div>
                                <h3 class="font-black text-gray-800 tracking-tight text-xl mb-2">OSC VALIDATOR</h3>
                                <p class="text-[11px] text-gray-500 mb-6 flex-1 px-4 leading-relaxed font-medium">Operations Support Checkers. Bertugas eksekusi validasi, release dan clearing pada pengajuan.</p>
                            </div>
                            <div class="p-4 bg-gray-50 mt-auto relative z-10 border-t">
                                <button onclick="editRoleMatrix('osc')" class="w-full py-3 bg-white hover:bg-indigo-600 hover:text-white border border-gray-200 hover:border-indigo-600 text-indigo-700 rounded-xl font-black text-sm shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 ease-in-out">Konfigurasi Matrix</button>
                            </div>
                        </div>
                        <!-- Role Panel Lainnya -->
                        <div class="border border-gray-200 rounded-3xl shadow-sm bg-white overflow-hidden hover:shadow-xl hover:border-purple-300 transition-all border-t-8 border-t-purple-500 flex flex-col group relative">
                            <div class="absolute inset-0 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="pt-6 pb-2 px-6 flex flex-col items-center text-center flex-1 relative z-10">
                                <div class="w-20 h-20 bg-white border border-purple-100 shadow-inner rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"><i class="fas fa-eye text-4xl text-purple-600"></i></div>
                                <h3 class="font-black text-gray-800 tracking-tight text-xl mb-2">LAINNYA</h3>
                                <p class="text-[11px] text-gray-500 mb-6 flex-1 px-4 leading-relaxed font-medium">Staf Sales, SPV, Audit, dan staf support lainnya dengan level akses *View-Only* & Read Log.</p>
                            </div>
                            <div class="p-4 bg-gray-50 mt-auto relative z-10 border-t">
                                <button onclick="editRoleMatrix('semualainnya')" class="w-full py-3 bg-white hover:bg-purple-600 hover:text-white border border-gray-200 hover:border-purple-600 text-purple-700 rounded-xl font-black text-sm shadow-sm transition-all focus:ring-2 focus:ring-purple-500 ease-in-out">Konfigurasi Matrix</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- VIEW REQUEST PROFIL -->
                <div id="viewRequests" class="hidden">
                    <h3 class="font-black text-xl text-gray-800 mb-6 pb-2 flex items-center border-b border-dashed"><i class="fas fa-inbox text-orange-500 mr-2"></i> Kotak Masuk Permohonan Profil</h3>
                    <div id="reqCardsContainer" class="space-y-4"></div>
                </div>

                <!-- VIEW TAMBAH AKUN -->
                <div id="viewTambahAkun" class="hidden relative max-w-2xl mx-auto border border-gray-200 p-8 rounded-3xl shadow-lg bg-white mt-4">
        <!-- SECTION 5: TAMBAH AKUN (RBAC) -->
`;
html = html.replace(/<div id="manageAccessSection"[\s\S]*?<!-- SECTION 5: TAMBAH AKUN \(RBAC\) -->/, new_manage_access);

let append_modals = `
                </div> <!-- End View Tambah Akun -->
            </div>
        </div>
        
        <!-- MODAL PROFIL DEPOT -->
        <div id="profileModal" class="hidden fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-4 md:p-8 font-sans backdrop-blur-md transition-opacity">
            <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] pb-0 transform transition-transform scale-100 border border-white/20 ring-1 ring-black/5">
                <div class="h-20 flex-shrink-0 bg-gradient-to-r from-red-900 to-red-700 px-8 flex justify-between items-center text-white relative overflow-hidden shadow-md">
                    <i class="fas fa-building absolute -right-6 -bottom-8 text-8xl text-white/10 transform rotate-12 blur-[2px]"></i>
                    <h3 class="font-black text-2xl z-10 tracking-wider flex items-center"><i class="fas fa-id-card-alt mr-3 text-red-200 text-3xl"></i> PROFIL DEPOT & ORGANISASI</h3>
                    <button onclick="closeProfileModal()" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 focus:ring-2 focus:ring-white flex justify-center items-center z-10 transition backdrop-blur-sm"><i class="fas fa-times text-lg"></i></button>
                </div>
                <div class="flex-1 overflow-auto p-4 md:p-8 bg-gray-50">
                    <div id="noProfilAlert" class="hidden bg-orange-50 border border-orange-200 text-orange-800 p-6 rounded-2xl shadow-sm font-bold flex items-center"><i class="fas fa-exclamation-triangle text-3xl mr-4 text-orange-400"></i> <div>Fitur profil tidak tersedia untuk akun Anda. Anda saat ini berada dalam mode akses Sistem Manager.</div></div>
                    
                    <form id="profileForm" onsubmit="event.preventDefault(); submitProfileRequest();" class="hidden grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        <!-- Block 1: Info Depot -->
                        <div class="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition duration-300">
                            <h4 class="font-black text-red-700 border-b border-gray-100 pb-3 mb-5 text-xs flex items-center uppercase tracking-widest"><div class="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mr-3 border border-red-100"><i class="fas fa-map-marker-alt"></i></div> Info Dasar Depot</h4>
                            <div class="space-y-4">
                                <div class="bg-gray-50/50 px-4 py-3 rounded-xl border border-gray-100 flex justify-between items-center"><label class="text-[9px] text-gray-400 uppercase font-bold tracking-widest flex-1">Nama & Kode Depot</label><div class="font-black text-gray-800 text-sm text-right" id="p_kodeNama"></div></div>
                                <div class="bg-gray-50/50 px-4 py-3 rounded-xl border border-gray-100 flex justify-between items-center"><label class="text-[9px] text-gray-400 uppercase font-bold tracking-widest flex-1">Region & Grade</label><div class="font-bold text-gray-600 text-sm text-right" id="p_regGrade"></div></div>
                                <div class="mt-2 group">
                                    <label class="text-[10px] text-blue-600 uppercase font-black tracking-wider mb-2 flex justify-between items-center group-hover:text-blue-800 transition">Alamat Lengkap <span class="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[8px] font-bold shadow-sm flex items-center"><i class="fas fa-pencil-alt mr-1"></i> Dapat Diubah</span></label>
                                    <textarea id="p_alamat" class="w-full text-sm font-medium border-gray-200 rounded-xl shadow-inner p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none bg-gray-50 focus:bg-white min-h-[90px]"></textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Block 2: Struktur Area -->
                        <div class="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition duration-300">
                            <h4 class="font-black text-blue-700 border-b border-gray-100 pb-3 mb-5 text-xs flex items-center uppercase tracking-widest"><div class="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mr-3 border border-blue-100"><i class="fas fa-sitemap mt-0.5"></i></div> Hierarki Area</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 flex flex-col justify-center"><label class="text-[9px] text-blue-400 uppercase font-black tracking-widest mb-1.5 flex items-center"><i class="fas fa-user-tie mr-1 opacity-50"></i> RSM</label><div class="font-black text-blue-900 text-sm truncate" id="p_rsm"></div></div>
                                <div class="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 flex flex-col justify-center"><label class="text-[9px] text-blue-400 uppercase font-black tracking-widest mb-1.5 flex items-center"><i class="fas fa-user-tie mr-1 opacity-50"></i> ASM</label><div class="font-black text-blue-900 text-sm truncate" id="p_asm"></div></div>
                                <div class="col-span-2 bg-gradient-to-r from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm"><label class="text-[10px] text-indigo-500 uppercase font-black tracking-widest mb-1.5 block flex items-center"><i class="fas fa-user-circle mr-1 opacity-70"></i> Sales Manager (SM)</label><div class="font-black text-indigo-900 text-base" id="p_sm"></div></div>
                            </div>
                        </div>

                        <!-- Block 3: Struktur Internal -->
                        <div class="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition duration-300">
                            <h4 class="font-black text-green-700 border-b border-gray-100 pb-3 mb-5 text-xs flex items-center uppercase tracking-widest"><div class="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center mr-3 border border-green-100"><i class="fas fa-users-cog"></i></div> Struktur Internal Depot</h4>
                            <div class="space-y-5">
                                <div class="group relative">
                                    <label class="text-[10px] text-blue-600 uppercase font-black tracking-wider flex justify-between items-center mb-2">Kepala Depot (AC) <span class="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[8px] font-bold shadow-sm flex items-center"><i class="fas fa-pencil-alt"></i></span></label>
                                    <div class="relative">
                                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><i class="fas fa-user-shield text-gray-400"></i></div>
                                        <input type="text" id="p_kepala" class="w-full text-base font-bold border rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 pl-11 pr-4 py-3 bg-gray-50 focus:bg-white transition shadow-inner">
                                    </div>
                                </div>
                                <div class="group relative">
                                    <label class="text-[10px] text-blue-600 uppercase font-black tracking-wider flex justify-between items-center mb-2">Kepala Admin (AD) <span class="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[8px] font-bold shadow-sm flex items-center"><i class="fas fa-pencil-alt"></i></span></label>
                                    <div class="relative">
                                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><i class="fas fa-user-edit text-gray-400"></i></div>
                                        <input type="text" id="p_adminHead" class="w-full text-base font-bold border rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 pl-11 pr-4 py-3 bg-gray-50 focus:bg-white transition shadow-inner">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Block 4: Info Pendukung & Email -->
                        <div class="bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition flex flex-col overflow-hidden">
                            <div class="p-6 border-b border-gray-100">
                                <h4 class="font-black text-teal-700 mb-4 text-xs flex items-center uppercase tracking-widest"><div class="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center mr-3 border border-teal-100"><i class="fas fa-envelope-open-text"></i></div> Email Distribusi Unit</h4>
                                <div class="space-y-3">
                                    <div class="flex items-center text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100"><span class="w-10 font-bold text-[9px] uppercase tracking-widest opacity-60">NPC</span> <span id="p_em_npc" class="truncate font-mono font-bold flex-1"></span></div>
                                    <div class="flex items-center text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100"><span class="w-10 font-bold text-[9px] uppercase tracking-widest opacity-60">FG</span> <span id="p_em_fg" class="truncate font-mono font-bold flex-1"></span></div>
                                </div>
                            </div>
                            <div class="p-6 bg-gradient-to-b from-gray-50/50 to-gray-100/50 flex-1">
                                <h4 class="font-black text-teal-700 mb-4 text-xs flex items-center uppercase tracking-widest"><div class="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mr-3 shadow-sm border border-teal-200"><i class="fas fa-link"></i></div> Tautan Akun Portal</h4>
                                <div class="mb-4">
                                    <label class="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-2">PIC OSC Penanggung Jawab</label>
                                    <div class="text-sm font-black text-white bg-teal-600 inline-flex items-center px-4 py-1.5 rounded-lg shadow-sm border border-teal-700" id="p_pic_osc"><i class="fas fa-check-circle text-teal-200 mr-2"></i> <span></span></div>
                                </div>
                                <div class="mt-2 text-xs">
                                    <label class="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-2">Akun Login Terhubung (Kolom H-J)</label>
                                    <div class="flex flex-wrap gap-2 mt-1 min-h-[28px]" id="p_usernames"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Block 5: Komposisi -->
                        <div class="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition lg:col-span-2">
                            <h4 class="font-black text-purple-700 border-b border-gray-100 pb-3 mb-6 text-xs flex flex-col sm:flex-row sm:items-center justify-between uppercase tracking-widest gap-3"><div class="flex items-center"><div class="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mr-3 border border-purple-100"><i class="fas fa-chart-pie"></i></div> Komposisi Karyawan</div> <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-bold px-4 py-2 rounded-xl text-xs flex items-center border border-purple-500 self-start sm:self-auto"><i class="fas fa-users mr-2 bg-white/20 p-1 rounded"></i> Total Karyawan: <span id="p_totKar" class="mx-2 text-xl font-black bg-white/10 px-2 rounded tracking-tighter">0</span></div></h4>
                            
                            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-2">
                                <div class="relative bg-gray-50 p-2 rounded-2xl border text-center pt-4 pb-3 hover:border-purple-300 transition-colors group">
                                    <label class="text-[9px] text-purple-800 uppercase font-black tracking-widest block mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex justify-center items-center"><i class="fas fa-pencil-alt text-[8px] mr-1 text-blue-500"></i> Sales</label>
                                    <input type="number" id="p_k_sales" class="w-full text-center text-xl font-black text-gray-800 border-b-2 border-transparent focus:border-purple-500 bg-transparent py-0 focus:ring-0 transition" value="0">
                                </div>
                                <div class="relative bg-gray-50 p-2 rounded-2xl border text-center pt-4 pb-3 hover:border-purple-300 transition-colors group">
                                    <label class="text-[9px] text-purple-800 uppercase font-black tracking-widest block mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex justify-center items-center"><i class="fas fa-pencil-alt text-[8px] mr-1 text-blue-500"></i> Admin</label>
                                    <input type="number" id="p_k_admin" class="w-full text-center text-xl font-black text-gray-800 border-b-2 border-transparent focus:border-purple-500 bg-transparent py-0 focus:ring-0 transition" value="0">
                                </div>
                                <div class="relative bg-gray-50 p-2 rounded-2xl border text-center pt-4 pb-3 hover:border-purple-300 transition-colors group">
                                    <label class="text-[9px] text-purple-800 uppercase font-black tracking-widest block mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex justify-center items-center"><i class="fas fa-pencil-alt text-[8px] mr-1 text-blue-500"></i> FG</label>
                                    <input type="number" id="p_k_fg" class="w-full text-center text-xl font-black text-gray-800 border-b-2 border-transparent focus:border-purple-500 bg-transparent py-0 focus:ring-0 transition" value="0">
                                </div>
                                <div class="relative bg-gray-50 p-2 rounded-2xl border text-center pt-4 pb-3 hover:border-purple-300 transition-colors group">
                                    <label class="text-[9px] text-purple-800 uppercase font-black tracking-widest block mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex justify-center items-center"><i class="fas fa-pencil-alt text-[8px] mr-1 text-blue-500"></i> PCC</label>
                                    <input type="number" id="p_k_pcc" class="w-full text-center text-xl font-black text-gray-800 border-b-2 border-transparent focus:border-purple-500 bg-transparent py-0 focus:ring-0 transition" value="0">
                                </div>
                                <div class="relative bg-gray-50 p-2 rounded-2xl border text-center pt-4 pb-3 hover:border-purple-300 transition-colors group">
                                    <label class="text-[9px] text-purple-800 uppercase font-black tracking-widest block mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex justify-center items-center"><i class="fas fa-pencil-alt text-[8px] mr-1 text-blue-500"></i> Teknisi</label>
                                    <input type="number" id="p_k_tek" class="w-full text-center text-xl font-black text-gray-800 border-b-2 border-transparent focus:border-purple-500 bg-transparent py-0 focus:ring-0 transition" value="0">
                                </div>
                                <div class="relative bg-gray-50 p-2 rounded-2xl border text-center pt-4 pb-3 hover:border-purple-300 transition-colors group">
                                    <label class="text-[9px] text-purple-800 uppercase font-black tracking-widest block mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex justify-center items-center"><i class="fas fa-pencil-alt text-[8px] mr-1 text-blue-500"></i> Driver</label>
                                    <input type="number" id="p_k_drv" class="w-full text-center text-xl font-black text-gray-800 border-b-2 border-transparent focus:border-purple-500 bg-transparent py-0 focus:ring-0 transition" value="0">
                                </div>
                                <div class="relative bg-gray-50 p-2 rounded-2xl border text-center pt-4 pb-3 hover:border-purple-300 transition-colors group">
                                    <label class="text-[9px] text-purple-800 uppercase font-black tracking-widest block mb-3 opacity-60 group-hover:opacity-100 transition-opacity flex justify-center items-center"><i class="fas fa-pencil-alt text-[8px] mr-1 text-blue-500"></i> Lainnya</label>
                                    <input type="number" id="p_k_oth" class="w-full text-center text-xl font-black text-gray-800 border-b-2 border-transparent focus:border-purple-500 bg-transparent py-0 focus:ring-0 transition" value="0">
                                </div>
                            </div>
                        </div>

                    </form>
                </div>
                <!-- PROFIL FOOTER -->
                <div id="profileFooter" class="px-8 py-5 border-t border-gray-100 hidden flex-shrink-0 flex flex-col md:flex-row justify-between items-center bg-white gap-6 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20">
                    <div class="flex items-start text-xs text-orange-700 bg-orange-50 border border-orange-100 px-4 py-3 rounded-2xl md:flex-1 w-full relative overflow-hidden">
                        <div class="absolute right-0 top-0 bottom-0 w-2 bg-orange-300"></div>
                        <i class="fas fa-info-circle mr-3 text-orange-400 text-2xl mt-0.5"></i> 
                        <span class="leading-relaxed font-medium">Pengajuan revisi data yang ditandai pensil (<i class="fas fa-pencil-alt mx-1 text-blue-500 text-[9px]"></i>) akan dikirimkan ke <strong>PIC OSC Valdiator</strong> cabang Anda untuk divalidasi dan diganti pada Pusat Master Data Depo.</span>
                    </div>
                    <button type="submit" form="profileForm" class="w-full md:w-auto bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-black py-4 px-10 rounded-2xl shadow-[0_5px_15px_rgba(22,163,74,0.3)] text-sm transition-all focus:ring-4 focus:ring-green-500/50 flex items-center justify-center transform hover:-translate-y-1 active:translate-y-0 group">
                        <i class="fas fa-paper-plane mr-2 group-hover:translate-x-1 transition-transform"></i> Ajukan Perubahan Form
                        <div id="profSubmitLoader" class="loader w-5 h-5 hidden border-t-white ml-2 border-2 border-white/20"></div>
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL EDIT AKSES (RBAC MATRIX) -->
`;
html = html.replace(/<!-- MODAL EDIT AKSES \(RBAC MATRIX\) -->/, append_modals);


let js_marker = "let userToken = '';";
let base_js_inject = `let userToken = '';
let depoInfoData = null; 
let isRoleEditMode = false;
let currentEditRole = '';

let runtimeSeconds = 0;
setInterval(() => {
    runtimeSeconds++;
    let h = Math.floor(runtimeSeconds / 3600).toString().padStart(2, '0');
    let m = Math.floor((runtimeSeconds % 3600) / 60).toString().padStart(2, '0');
    let s = Math.floor(runtimeSeconds % 60).toString().padStart(2, '0');
    let el = document.getElementById('runtimeCounter');
    if(el) el.textContent = \`\${h}:\${m}:\${s}\`;
}, 1000);

function toggleSettingsDropdown() {
    let d = document.getElementById('settingsDropdown');
    d.classList.toggle('hidden');
}

document.addEventListener('click', function(event) {
    let dropdown = document.getElementById('settingsDropdown');
    let btn = document.getElementById('userDropdownBtn');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(event.target) && !btn.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    }
});

function openProfileModal() {
    document.getElementById('settingsDropdown').classList.add('hidden');
    document.getElementById('profileModal').classList.remove('hidden');
    
    let modalInner = document.getElementById('profileModal').children[0];
    modalInner.classList.remove('scale-100'); modalInner.classList.add('scale-90', 'opacity-0');
    setTimeout(() => { modalInner.classList.remove('scale-90', 'opacity-0'); modalInner.classList.add('scale-100', 'opacity-100'); }, 10);
    
    if(!depoInfoData) {
        document.getElementById('noProfilAlert').classList.remove('hidden');
        document.getElementById('profileForm').classList.add('hidden');
        document.getElementById('profileFooter').classList.add('hidden');
        return;
    }
    document.getElementById('noProfilAlert').classList.add('hidden');
    document.getElementById('profileForm').classList.replace('hidden', 'grid');
    document.getElementById('profileFooter').classList.replace('hidden', 'flex');
    
    document.getElementById('p_kodeNama').textContent = \`\${depoInfoData.kodeDepot} - \${depoInfoData.namaDepot}\`;
    document.getElementById('p_regGrade').textContent = \`Reg: \${depoInfoData.region} | Grade: \${depoInfoData.grade || '-'}\`;
    document.getElementById('p_alamat').value = depoInfoData.alamat;
    document.getElementById('p_rsm').textContent = depoInfoData.rsm || '-';
    document.getElementById('p_asm').textContent = depoInfoData.asm || '-';
    document.getElementById('p_sm').textContent = depoInfoData.sm || '-';
    document.getElementById('p_kepala').value = depoInfoData.kepalaDepot;
    document.getElementById('p_adminHead').value = depoInfoData.kepalaAdmin;
    document.getElementById('p_k_sales').value = depoInfoData.sales || 0;
    document.getElementById('p_k_admin').value = depoInfoData.admin || 0;
    document.getElementById('p_k_fg').value = depoInfoData.fg || 0;
    document.getElementById('p_k_pcc').value = depoInfoData.pcc || 0;
    document.getElementById('p_k_tek').value = depoInfoData.teknisi || 0;
    document.getElementById('p_k_drv').value = depoInfoData.driver || 0;
    document.getElementById('p_k_oth').value = depoInfoData.lainnya || 0;
    document.getElementById('p_totKar').textContent = depoInfoData.totalKaryawan || 0;
    document.getElementById('p_em_npc').textContent = depoInfoData.emailNpc || '-';
    document.getElementById('p_em_fg').textContent = depoInfoData.emailFg || '-';
    let picEl = document.querySelector('#p_pic_osc span'); if(picEl) picEl.textContent = depoInfoData.picOsc || '-';
    
    let usrHtml = '';
    [depoInfoData.usrn1, depoInfoData.usrn2, depoInfoData.usrn3].forEach(u => {
        if(u) usrHtml += \`<span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-md shadow-sm text-[10px] font-black border border-gray-200">\${u}</span>\`;
    });
    document.getElementById('p_usernames').innerHTML = usrHtml || '<span class="text-xs text-gray-400 italic">Auth Linkage Empty</span>';
}

function closeProfileModal() { document.getElementById('profileModal').classList.add('hidden'); }

function submitProfileRequest() {
    let btn = document.querySelector('button[form="profileForm"]');
    document.getElementById('profSubmitLoader').classList.remove('hidden');
    btn.disabled = true;
    let changes = {
        alamat: document.getElementById('p_alamat').value, kepalaDepot: document.getElementById('p_kepala').value, kepalaAdmin: document.getElementById('p_adminHead').value,
        sales: document.getElementById('p_k_sales').value, admin: document.getElementById('p_k_admin').value, fg: document.getElementById('p_k_fg').value, pcc: document.getElementById('p_k_pcc').value, teknisi: document.getElementById('p_k_tek').value, driver: document.getElementById('p_k_drv').value, lainnya: document.getElementById('p_k_oth').value
    };
    fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: 'submitProfileUpdate', data: { sysRole: userRoleGlobal, kodeDepot: depoInfoData.kodeDepot, namaDepot: depoInfoData.namaDepot, requesterId: currentUserData.userId, changes: changes } })
    }).then(() => {
        alert("Request Perubahan Data Profil berhasil direkam dan menunggu Approve PIC OSC Administrator Sistem.");
        closeProfileModal(); btn.disabled = false; document.getElementById('profSubmitLoader').classList.add('hidden');
    }).catch(e => { alert("Koneksi Request Timeout atau Gagal Terekam: " + e); btn.disabled = false; document.getElementById('profSubmitLoader').classList.add('hidden'); });
}

function showKelolaTab(t) {
    document.getElementById('viewUsersList').classList.add('hidden'); document.getElementById('viewRolesMatrix').classList.add('hidden'); document.getElementById('viewRequests').classList.add('hidden'); document.getElementById('viewTambahAkun').classList.add('hidden');
    document.getElementById('tabUsers').className = 'flex-1 min-w-[140px] py-2.5 font-bold rounded-xl text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm px-4 transition-colors focus:outline-none';
    if(document.getElementById('tabRoles')) document.getElementById('tabRoles').className = 'hidden flex-1 min-w-[140px] py-2.5 font-bold rounded-xl text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm px-4 transition-colors focus:outline-none';
    
    if(t === 'users') { document.getElementById('viewUsersList').classList.remove('hidden'); document.getElementById('tabUsers').className = 'flex-1 min-w-[140px] py-2.5 font-bold rounded-xl bg-white shadow-sm px-4 text-blue-700 transition-colors focus:outline-none cursor-default'; }
    else if(t === 'roles') { document.getElementById('viewRolesMatrix').classList.remove('hidden'); document.getElementById('tabRoles').className = 'flex-1 min-w-[140px] py-2.5 font-bold rounded-xl bg-white shadow-sm px-4 text-blue-700 transition-colors focus:outline-none cursor-default'; }
    else if(t === 'req') { document.getElementById('viewRequests').classList.remove('hidden'); fetchProfileRequests(); }
    else if(t === 'add') { document.getElementById('viewTambahAkun').classList.remove('hidden'); }
}
`;
html = html.replace(js_marker, base_js_inject);

html = html.replace(/currentUserData = resp\.data;/, `currentUserData = resp.data; depoInfoData = resp.data.depoInfo;
        document.getElementById('sidebar').classList.remove('hidden'); document.getElementById('topHeader').classList.remove('hidden');
        document.getElementById('displayDepotDropdown').textContent = resp.data.depot + " (" + resp.data.kodeDepot + ")";
`);

html = html.replace('document.getElementById("userInfo").classList.remove("hidden");', '/* Legacy userInfo hidden in new UI Sidebar */');

let card_render_js = `
function renderManageAccessTable(data) { globalManageableData = data; renderUserCards(); }
function renderUserCards() {
    const container = document.getElementById('userCardsContainer'); if(!container) return;
    let term = document.getElementById('searchUserKelola').value.toLowerCase(); let rFilter = document.getElementById('filterRoleKelola').value.toLowerCase();
    let html = '';
    globalManageableData.forEach(u => {
        let nRole = (u.role || '').toLowerCase();
        if (term && u.userId.toLowerCase().indexOf(term) === -1 && u.email.toLowerCase().indexOf(term) === -1) return;
        if (rFilter !== 'all') { if(rFilter === 'lainnya' && ['admin','osc','supervisor'].includes(nRole)) return; if(rFilter !== 'lainnya' && nRole !== rFilter) return; }
        
        let color = 'gray'; let icon = 'fa-user'; let roleTitle = (u.role || '').toUpperCase();
        if(nRole === 'admin') { color = 'blue'; icon = 'fa-desktop'; } else if(nRole === 'osc') { color = 'indigo'; icon = 'fa-user-check'; } else if(['supervisor','system manager'].includes(nRole)) { color = 'red'; icon = 'fa-crown'; }
        
        let actCol = u.activation==='approved'?'green':(u.activation==='pending'?'yellow':'red');
        let actBg = u.activation==='approved'?'bg-green-100':(u.activation==='pending'?'bg-yellow-100':'bg-red-100');
        let actBd = u.activation==='approved'?'border-green-300':(u.activation==='pending'?'border-yellow-400':'border-red-300');
        let actTx = u.activation==='approved'?'text-green-800':(u.activation==='pending'?'text-yellow-800':'text-red-800');
        
        html += \`<div class="bg-white rounded-[1.5rem] shadow-[0_5px_15px_rgba(0,0,0,0.02)] border border-gray-100 hover:shadow-xl hover:border-\${color}-200 transition-all overflow-hidden flex flex-col group/card hover:-translate-y-1"><div class="p-6 flex items-start gap-5 relative"><div class="bg-\${color}-50 border border-\${color}-100 w-16 h-16 rounded-2xl flex items-center justify-center text-\${color}-600 flex-shrink-0 shadow-inner group-hover/card:bg-\${color}-500 group-hover/card:text-white group-hover/card:shadow-[0_5px_15px_rgba(0,0,0,0.1)] transition-all duration-300 transform group-hover/card:rotate-3"><i class="fas \${icon} text-2xl group-hover/card:scale-110 transition-transform"></i></div><div class="flex-1 min-w-0 pr-16 items-start"><h5 class="font-black text-gray-800 text-lg truncate tracking-tight" title="\${u.userId}">\${u.userId}</h5><p class="text-xs text-gray-500 font-medium truncate mb-1 border-b border-gray-100 pb-1.5">\${u.email}</p><span class="text-[9px] font-black text-\${color}-700 bg-\${color}-50 inline-block px-2.5 py-1 rounded mt-1 border border-\${color}-200 uppercase tracking-widest shadow-sm">\${roleTitle}</span></div><div class="absolute right-5 top-5"><span class="px-3 py-1 text-[9px] font-black rounded-lg \${actBg} \${actTx} border \${actBd} shadow-sm uppercase tracking-wider">\${u.activation}</span></div></div><div class="px-6 py-4 bg-gray-50/80 border-t flex flex-col gap-1 text-xs"><div class="flex justify-between items-center"><span class="text-gray-400 font-bold uppercase tracking-widest text-[9px]"><i class="fas fa-link mr-1 opacity-50"></i> Depot Master Binding</span><span class="font-black text-gray-800 text-right truncate max-w-[50%] bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200" title="\${u.depotName}">\${u.depotName}</span></div></div><div class="p-4 bg-white border-t rounded-b-[1.5rem] flex items-center justify-between gap-3"> \${u.pinStatus === 'pending' ? \`<div class="text-orange-700 font-bold bg-orange-50 px-3 py-2.5 rounded-xl text-xs border border-orange-200 animate-pulse text-center w-auto flex-shrink-0 shadow-sm" title="Menunggu Konfirmasi Security PIN"><i class="fas fa-key"></i> Key Request</div>\` : ''} <button onclick="editUserCard('\${u.userId}')" class="flex-1 text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50/50 border border-blue-200 hover:border-transparent py-2.5 rounded-xl text-xs font-black transition-colors focus:ring-4 focus:ring-blue-500/30 uppercase tracking-widest flex items-center justify-center"><i class="fas fa-user-edit mr-2"></i> Edit Account</button></div></div>\`;
    });
    if(html === '') html = '<div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200"><i class="fas fa-search text-6xl mb-5 opacity-40 text-blue-300"></i><p class="font-bold text-gray-500 text-lg">Tidak ada pengguna teregister dengan filter.</p></div>';
    container.innerHTML = html;
}

function editUserCard(userId) {
    let user = globalManageableData.find(u => u.userId === userId); if (!user) return;
    isRoleEditMode = false; currentEditRole = '';
    document.getElementById('editUserId').value = user.userId;
    document.getElementById('editUserDisplay').textContent = user.userId + ' (' + user.email + ')';
    document.getElementById('editRoleDisplay').textContent = "Security ID Role: " + user.role.toUpperCase();
    document.getElementById('editActivation').value = user.activation;
    document.getElementById('manageRBACBlock').classList.add('hidden');
    document.getElementById('editActivationBlock').classList.remove('hidden');
    document.getElementById('editAccessModal').classList.remove('hidden');
    document.getElementById('btnApprovePin').classList.toggle('hidden', user.pinStatus !== 'pending');
}

function editRoleMatrix(role) {
    isRoleEditMode = true; currentEditRole = role;
    document.getElementById('editUserId').value = 'ROLE_MATRIX_OVERRIDE';
    document.getElementById('editUserDisplay').textContent = "MATRIX KONFIGURASI GROUP (" + role.toUpperCase() + ")";
    document.getElementById('editRoleDisplay').textContent = "WARNING SYSTEM: Konfigurasi akan melimpahi kewenangan semua pengguna dengan Role ini.";
    document.getElementById('editActivationBlock').classList.add('hidden');
    document.getElementById('manageRBACBlock').classList.remove('hidden');
    document.getElementById('editAccessModal').classList.remove('hidden');
    document.getElementById('btnApprovePin').classList.add('hidden');
}

function fetchProfileRequests() {
    fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({action: "getProfileRequests"}) }).then(r => r.json()).then(resp => {
        let c = document.getElementById('reqCardsContainer');
        if(resp.requests && resp.requests.length > 0) {
            let html = '';
            resp.requests.forEach(r => {
                let j = r.changes; let chgHtml = Object.keys(j).map(k => \`<span class="bg-gray-50 border text-gray-700 px-2 py-1.5 flex items-center justify-between rounded-lg text-xs mr-2 mb-2 font-mono shadow-sm"><span class="mr-4 opacity-50 font-black uppercase text-[9px] tracking-widest">\${k}</span> <b class="text-indigo-800 bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded text-right whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title="\${j[k]}">\${j[k]}</b></span>\`).join('');
                html += \`<div class="border border-gray-200 rounded-3xl p-6 bg-white shadow-[0_5px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row justify-between hover:border-indigo-300 transition-colors gap-6 overflow-hidden relative"><div class="absolute top-0 left-0 w-2 h-full bg-orange-400"></div><div class="flex-1 pl-4"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><span class="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-md shadow-sm tracking-widest"><i class="fas fa-hourglass-half mr-1 animate-pulse"></i> WAITING APPROVAL</span><span class="text-xs text-gray-400 font-bold bg-gray-50 px-2.5 py-1 rounded border"><i class="far fa-clock mr-1"></i> \${r.timestamp}</span></div></div><h5 class="font-black text-gray-800 text-xl mb-1 tracking-tight flex items-center"><i class="fas fa-building text-indigo-400 mr-3 p-1.5 bg-indigo-50 rounded-lg"></i> <span class="bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-500">\${r.kodeDepot} - \${r.namaDepot}</span></h5><p class="text-[10px] font-bold text-gray-500 mb-5 bg-gray-50 inline-block px-3 py-1 rounded-lg border mt-1">Delegated UID: <span class="text-gray-800 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm mx-1 mr-2">\${r.requesterId}</span> <span class="bg-purple-100 text-purple-800 px-1.5 rounded uppercase">\${r.role}</span></p><div class="p-4 bg-gray-50/80 rounded-xl border border-gray-100"><div class="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest flex items-center"><i class="fas fa-random mr-2"></i> Parameter Target Modifikasi:</div><div class="flex flex-wrap">\${chgHtml}</div></div></div><div class="flex flex-row md:flex-col gap-3 mt-4 md:mt-0 justify-end md:justify-center w-full md:w-36 pt-4 md:pt-0 border-t border-gray-100 md:border-t-0 md:border-l md:pl-6 bg-gray-50/50 md:bg-transparent -m-6 md:m-0 p-6 md:p-0"><button onclick="approveReq(\${r.rowId}, 'REJECTED')" class="flex-1 w-full px-4 border-2 border-red-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-transparent rounded-2xl text-xs font-black transition-all focus:ring-4 focus:ring-red-500/30 flex flex-col items-center justify-center py-2 h-[80px] shadow-sm"><i class="fas fa-times text-2xl mb-1 opacity-70"></i> Tolak</button><button onclick="approveReq(\${r.rowId}, 'APPROVED')" class="flex-1 w-full px-4 border-2 border-transparent bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-md hover:shadow-lg text-xs font-black transition-all focus:ring-4 focus:ring-green-500/50 flex flex-col items-center justify-center py-2 h-[80px] transform hover:-translate-y-0.5"><i class="fas fa-check text-2xl mb-1"></i> Authorize & Simpan</button></div></div>\`;
            });
            c.innerHTML = html; document.getElementById('reqBadge').textContent = resp.requests.length; document.getElementById('reqBadge').classList.remove('hidden');
            let innerBadge = document.querySelector('button[onclick="showKelolaTab(\\'req\\')"] span'); if(innerBadge) innerBadge.textContent = resp.requests.length;
        } else {
            c.innerHTML = '<div class="text-center py-16 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-3xl shadow-sm"><i class="fas fa-inbox text-6xl text-gray-300 mb-5"></i><p class="text-gray-500 font-bold">Kotak masuk formulir pengajuan kosong.</p></div>'; document.getElementById('reqBadge').classList.add('hidden');
        }
    }).catch(e => console.error(e));
}

function approveReq(row, status) {
    if(!confirm("Warning Administrator: Persetujuan merubah struktur database di DepoMaster. Lanjutkan tindakan (" + status + ") ?")) return;
    fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "approveProfileRequest", rowId: row, statusAction: status })
    }).then(() => { fetchProfileRequests(); }).catch(e => alert(e));
}

function saveUserAccess() {
    document.getElementById('submitAccessLoader').classList.remove('hidden'); let btn = document.getElementById('submitAccessLoader').parentElement; btn.disabled = true;
    let payload = {}; let act = '';
    if (isRoleEditMode) {
        act = 'updateRoleAccess';
        payload = {
            targetRole: currentEditRole,
            menus: { claim: document.getElementById('editMenuClaim').value, kelola: document.getElementById('editMenuKelola').value, tambah: document.getElementById('editMenuTambah').value }, claimAccess: { manual: document.getElementById('editClaimManual').value, mass: document.getElementById('editClaimMass').value, release: document.getElementById('editClaimRelease').value, history: document.getElementById('editClaimHistory').value, summary: document.getElementById('editClaimSummary').value }, kelolaAccess: { pin: document.getElementById('editKelolaPin').value, manual: document.getElementById('editKelolaManual').value, mass: document.getElementById('editKelolaMass').value, activation: document.getElementById('editKelolaAct').value },
            addAccountLevel: document.getElementById('editAddLevel').value
        };
    } else {
        act = 'updateUserActivation';
        payload = { targetUserId: document.getElementById('editUserId').value, activation: document.getElementById('editActivation').value };
    }
    fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: act, data: payload, requesterId: currentUserData.userId, requesterRole: userRoleGlobal })
    }).then(() => {
        alert("Integrasi Data Matrix Access Control Tersimpan Pada Sistem Cluster Database."); closeEditModal(); fetchManageableData(); btn.disabled = false; document.getElementById('submitAccessLoader').classList.add('hidden');
    }).catch(e => { alert("Error Server Connection: " + e); btn.disabled = false; document.getElementById('submitAccessLoader').classList.add('hidden'); });
}
`;
html = html.replace(/function renderManageAccessTable\(data\)[\s\S]*?\}/, card_render_js);

html = html.replace(/<div>\s*<label class="block text-xs font-bold text-gray-700 mb-1">Aktivasi Akun \(Kolom I\)<\/label>/, '<div id="editActivationBlock">\n                            <label class="block text-xs font-bold text-gray-700 mb-1">Aktivasi Akun (Kolom I)</label>');
html = html.replace(/<div>\s*<label class="block text-xs font-bold text-gray-700 mb-1">Menu Claim System \(Kolom J\)<\/label>/, '</div><div id="manageRBACBlock" class="hidden w-full space-y-4">\n                        <div>\n                            <label class="block text-xs font-bold text-gray-700 mb-1">Menu Claim System (Kolom J)</label>');
html = html.replace(/<!-- Hak Tambah Akun -->\s*<div class="bg-white p-4 border rounded-lg shadow-sm space-y-4">/, '</div>\n<!-- Hak Tambah Akun -->\n                    <div class="bg-white p-4 border rounded-lg shadow-sm space-y-4">');

html = html.replace(/document\.getElementById\('menuTambahAkun'\)\.classList\.remove\('hidden'\);/, "if(document.getElementById('btnTabTambahAkunOuter')) document.getElementById('btnTabTambahAkunOuter').classList.remove('hidden');");

fs.writeFileSync('index.html', html);
console.log("HTML Patched!");
