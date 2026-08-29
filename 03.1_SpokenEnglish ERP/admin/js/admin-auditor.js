/**
 * SCS Auditor Dashboard Controller
 * Focus: Teacher management and Forensic monitoring
 */

document.addEventListener('DOMContentLoaded', () => {
    // Theme Management
    function applyTheme() {
        const saved = localStorage.getItem('scs_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.innerText = saved === 'light' ? '🌙' : '☀️';
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('scs_theme', next);

        const btn = document.getElementById('theme-toggle');
        if (btn) btn.innerText = next === 'light' ? '🌙' : '☀️';
    }

    applyTheme();
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // DOM Elements
    // ROLE-BASED ACCESS CONTROL (MORPHING)
    const userRole = sessionStorage.getItem('sea_user_role') || 'guest';
    const erpToken = sessionStorage.getItem('sea_erp_token');

    // if (!erpToken) {
    //     window.location.href = '/03.1_SpokenEnglish ERP/launchpad/index.html';
    //     return;
    // }

    // Check for Impersonation
    if (sessionStorage.getItem('sea_is_impersonation') === 'true') {
        const banner = document.getElementById('impersonation-banner');
        if (banner) banner.style.display = 'block';
        const mainDashboard = document.getElementById('main-dashboard');
        if (mainDashboard) mainDashboard.style.marginTop = '40px';
    }

    function applyRoleMorphing() {
        if (userRole === 'supervisor') {
            // Hide sensitive buttons
            const emergencyBtn = document.getElementById('emergency-kill-btn');
            if (emergencyBtn) emergencyBtn.style.display = 'none';
            const pilotBtn = document.getElementById('pilot-toggle-btn');
            if (pilotBtn) pilotBtn.style.display = 'none';
            const debugBtn = document.getElementById('debug-toggle-btn');
            if (debugBtn) debugBtn.style.display = 'none';
            const addTeacherBtn = document.getElementById('add-teacher-btn');
            if (addTeacherBtn) addTeacherBtn.style.display = 'none';
            const addSupervisorBtn = document.getElementById('add-supervisor-btn');
            if (addSupervisorBtn) addSupervisorBtn.style.display = 'none';

            // Add a style to globally hide certain sensitive actions in tables
            const style = document.createElement('style');
            style.innerHTML = `
                [data-action="reset-dna"], [data-action="delete-teacher"] { display: none !important; }
                /* Hide all tabs EXCEPT Student Hub and Master Attendance */
                button[data-target="view-teachers"],
                button[data-target="view-access-matrix"],
                button[data-target="view-chronos"],
                button[data-target="view-security"],
                button[data-target="view-manifest"],
                button[data-target="view-requests"],
                button[data-target="view-archive"] { display: none !important; }
            `;
            document.head.appendChild(style);

            // Default to Global Student Hub instead of Teacher Profiles
            setTimeout(() => {
                const studentTab = document.querySelector('button[data-target="view-students"]');
                if (studentTab) studentTab.click();
            }, 100);
        }
    }

    applyRoleMorphing();

    // Bootstrap Dashboard
    loadTeacherData(erpToken);
    checkEmergencyStatus(erpToken);
    if (window.loadManifestData) window.loadManifestData();

    // Modal Logic
    const addTeacherBtn = document.getElementById('add-teacher-btn');
    const addTeacherModal = document.getElementById('add-teacher-modal');
    const addSupervisorBtn = document.getElementById('add-supervisor-btn');
    const addSupervisorModal = document.getElementById('add-supervisor-modal');
    const editLevelsModal = document.getElementById('edit-levels-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');

    addTeacherBtn.addEventListener('click', () => addTeacherModal.classList.remove('hidden'));
    if (addSupervisorBtn) {
        addSupervisorBtn.addEventListener('click', () => addSupervisorModal.classList.remove('hidden'));
    }

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => {
        addTeacherModal.classList.add('hidden');
        if (addSupervisorModal) addSupervisorModal.classList.add('hidden');
        editLevelsModal.classList.add('hidden');
    }));

    // Emergency Lock
    const emergencyBtn = document.getElementById('emergency-kill-btn');
    emergencyBtn.addEventListener('click', async () => {
        const isLocked = emergencyBtn.classList.contains('locked');
        const action = isLocked ? "DEACTIVATE" : "ACTIVATE";
        const msg = isLocked ? "Re-enable global access?" : "☢️ DANGER: Lock all teachers out of the system?";
        if (!confirm(msg)) return;

        const key = sessionStorage.getItem('sea_erp_token');
        const deviceId = await SCSSecurity.getFingerprint();
        const response = await fetch('/.netlify/functions/scs-admin-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': key,
                'x-device-id': deviceId
            },
            body: JSON.stringify({ action: 'EMERGENCY_LOCK', payload: { status: !isLocked } })
        });

        if (response.ok) {
            updateEmergencyUI(!isLocked);
            alert(`System ${!isLocked ? 'LOCKED' : 'ACTIVATED'}`);
        }
    });

    function updateEmergencyUI(isLocked) {
        if (isLocked) {
            emergencyBtn.classList.add('locked');
            emergencyBtn.textContent = "🔓 RELEASE SYSTEM LOCK";
            emergencyBtn.style.background = "var(--accent-glow)";
            emergencyBtn.style.color = "var(--bg-dark)";
        } else {
            emergencyBtn.classList.remove('locked');
            emergencyBtn.textContent = "☢️ EMERGENCY LOCK";
            emergencyBtn.style.background = "";
            emergencyBtn.style.color = "";
        }
    }

    // Pilot Master Switch
    const pilotToggleBtn = document.getElementById('pilot-toggle-btn');
    if (pilotToggleBtn) {
        pilotToggleBtn.addEventListener('click', async () => {
            const isActive = !pilotToggleBtn.classList.contains('suspended');
            const msg = isActive ? "🛑 SUSPEND Pilot URL? Teachers will be blocked from access." : "🚀 RE-ACTIVATE Pilot URL? Teachers will be able to log in.";
            if (!confirm(msg)) return;

            const key = sessionStorage.getItem('sea_erp_token');
            const deviceId = await SCSSecurity.getFingerprint();
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'PILOT_LOCK', payload: { status: !isActive } })
            });

            if (response.ok) {
                updatePilotUI(!isActive);
                alert(`Pilot URL ${!isActive ? 'ACTIVATED' : 'SUSPENDED'}`);
            }
        });
    }

    function updatePilotUI(active) {
        if (!pilotToggleBtn) return;
        if (active) {
            pilotToggleBtn.classList.remove('suspended');
            pilotToggleBtn.textContent = "🚀 PILOT: ACTIVE";
            pilotToggleBtn.style.borderColor = "#38bdf8";
            pilotToggleBtn.style.color = "#38bdf8";
            pilotToggleBtn.style.background = "";
        } else {
            pilotToggleBtn.classList.add('suspended');
            pilotToggleBtn.textContent = "🛑 PILOT: SUSPENDED";
            pilotToggleBtn.style.borderColor = "var(--brand-red)";
            pilotToggleBtn.style.color = "var(--brand-red)";
            pilotToggleBtn.style.background = "rgba(238, 44, 54, 0.1)";
        }
    }

    // Debug Master Switch
    const debugToggleBtn = document.getElementById('debug-toggle-btn');
    if (debugToggleBtn) {
        debugToggleBtn.addEventListener('click', async () => {
            const isActive = debugToggleBtn.classList.contains('active-debug');
            const msg = isActive ? "🛠️ DISABLE Global Debug Mode? Telemetry will be hidden." : "🛠️ ENABLE Global Debug Mode? Telemetry and debug logs will be visible.";
            if (!confirm(msg)) return;

            const key = sessionStorage.getItem('sea_erp_token');
            const deviceId = await SCSSecurity.getFingerprint();
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'UPDATE_CONFIG', payload: { key: 'global_debug_mode', value: { active: !isActive, timestamp: new Date().toISOString() } } })
            });

            if (response.ok) {
                updateDebugUI(!isActive);
            }
        });
    }

    function updateDebugUI(active) {
        if (!debugToggleBtn) return;
        if (active) {
            debugToggleBtn.classList.add('active-debug');
            debugToggleBtn.textContent = "🛠️ DEBUG: ON";
            debugToggleBtn.style.background = "rgba(147, 51, 234, 0.2)";
        } else {
            debugToggleBtn.classList.remove('active-debug');
            debugToggleBtn.textContent = "🛠️ DEBUG: OFF";
            debugToggleBtn.style.background = "";
        }
    }

    // Logout Logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('sea_erp_token');
            sessionStorage.removeItem('sea_user_role');
            window.location.href = '/03.1_SpokenEnglish ERP/launchpad/index.html';
        });
    }

    // Edit Levels Form
    const editLevelsForm = document.getElementById('edit-levels-form');
    editLevelsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = sessionStorage.getItem('sea_erp_token');
        const id = document.getElementById('edit-teacher-id').value;
        const levels = Array.from(document.querySelectorAll('#edit-levels-grid input:checked')).map(cb => cb.value);
        const hasMasterAccess = document.getElementById('edit-master-access').checked;
        const courseStartDate = document.getElementById('edit-start-date').value;
        const timeLockBypass = document.getElementById('edit-time-bypass').checked;
        const surgicalOverrides = collectOverrides('edit-overrides-list');

        const units = {};
        document.querySelectorAll('#edit-units-container input:checked').forEach(cb => {
            const [lid, uid] = cb.value.split(':');
            if (!units[lid]) units[lid] = [];
            units[lid].push(uid);
        });

        const deviceId = await SCSSecurity.getFingerprint();
        const response = await fetch('/.netlify/functions/scs-admin-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': key,
                'x-device-id': deviceId
            },
            body: JSON.stringify({
                action: 'UPDATE_ACCESS',
                payload: { teacherId: id, levels, units, hasMasterAccess, courseStartDate, timeLockBypass, surgicalOverrides }
            })
        });

        if (response.ok) {
            editLevelsModal.classList.add('hidden');
            loadTeacherData(key);
        }
    });

    // Add Teacher Form
    const addTeacherForm = document.getElementById('add-teacher-form');

    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = sessionStorage.getItem('sea_erp_token');
            const name = document.getElementById('new-teacher-name').value;
            const email = document.getElementById('new-teacher-email').value;
            const levels = Array.from(document.querySelectorAll('#add-levels-grid input:checked')).map(cb => cb.value);
            const hasMasterAccess = document.getElementById('add-master-access').checked;
            const courseStartDate = document.getElementById('add-start-date').value;
            const timeLockBypass = document.getElementById('add-time-bypass').checked;
            const surgicalOverrides = collectOverrides('add-overrides-list');

            const units = {};
            document.querySelectorAll('#add-units-container input:checked').forEach(cb => {
                const [lid, uid] = cb.value.split(':');
                if (!units[lid]) units[lid] = [];
                units[lid].push(uid);
            });

            const deviceId = await SCSSecurity.getFingerprint();
            const payload = { email, name, levels, units, hasMasterAccess, courseStartDate, timeLockBypass, surgicalOverrides };

            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({
                    action: 'ADD_TEACHER',
                    payload: payload
                })
            });

            if (response.ok) {
                alert(`Teacher ${name} invited! They can now log in using their email.`);
                addTeacherModal.classList.add('hidden');
                addTeacherForm.reset();
                loadTeacherData(key);
            } else {
                const err = await response.json();
                const detailMsg = err.message || err.error || "Unknown Error";
                const detailStack = err.detail || "";
                alert(`AUDITOR ERROR:\n${detailMsg}\n\nTechnical Detail: ${detailStack}`);
            }
        });
    }

    // Add Supervisor Form
    const addSupervisorForm = document.getElementById('add-supervisor-form');
    if (addSupervisorForm) {
        addSupervisorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = sessionStorage.getItem('sea_erp_token');
            const name = document.getElementById('supervisor-name').value;
            const email = document.getElementById('supervisor-email').value;
            const password = document.getElementById('supervisor-password').value;

            const deviceId = await SCSSecurity.getFingerprint();
            const payload = { email, name, password };

            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({
                    action: 'ADD_SUPERVISOR',
                    payload: payload
                })
            });

            if (response.ok) {
                alert(`Supervisor ${name} created! They can now log in using their email and the provided password.`);
                addSupervisorModal.classList.add('hidden');
                addSupervisorForm.reset();
                loadTeacherData(key);
            } else {
                const err = await response.json();
                const detailMsg = err.message || err.error || "Unknown Error";
                const detailStack = err.detail || "";
                alert(`AUDITOR ERROR:\n${detailMsg}\n\nTechnical Detail: ${detailStack}`);
            }
        });
    }

    // Edit Supervisor Form
    const editSupervisorForm = document.getElementById('edit-supervisor-form');
    const editSupervisorModal = document.getElementById('edit-supervisor-modal');
    if (editSupervisorForm) {
        editSupervisorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const key = sessionStorage.getItem('sea_erp_token');
            const supervisorId = document.getElementById('edit-supervisor-id').value;
            const name = document.getElementById('edit-supervisor-name').value;
            const email = document.getElementById('edit-supervisor-email').value;
            const password = document.getElementById('edit-supervisor-password').value;

            const deviceId = await SCSSecurity.getFingerprint();
            const payload = { supervisorId, email, name, password };

            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({
                    action: 'UPDATE_SUPERVISOR',
                    payload: payload
                })
            });

            if (response.ok) {
                alert(`Supervisor ${name} updated!`);
                editSupervisorModal.classList.add('hidden');
                editSupervisorForm.reset();
                loadTeacherData(key);
            } else {
                const err = await response.json();
                const detailMsg = err.message || err.error || "Unknown Error";
                const detailStack = err.detail || "";
                alert(`AUDITOR ERROR:\n${detailMsg}\n\nTechnical Detail: ${detailStack}`);
            }
        });
    }

    async function loadTeacherData(key) {
        const deviceId = await SCSSecurity.getFingerprint();
        const tbody = document.getElementById('teacher-list-body');
        try {
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                headers: {
                    'x-admin-key': key,
                    'x-device-id': deviceId
                }
            });

            const textResponse = await response.text();
            let teachers;
            try {
                teachers = JSON.parse(textResponse);
            } catch (e) {
                console.error("Failed to parse JSON. Raw response:", textResponse);
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--brand-red);">Failed to parse response from server. Check console.</td></tr>`;
                return;
            }

            if (!response.ok || !Array.isArray(teachers)) {
                const errorMsg = teachers.error || teachers.message || 'Failed to load data';
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--brand-red);">${errorMsg}</td></tr>`;
                return;
            }

            tbody.innerHTML = teachers.map(t => {
                const devices = t.device_metadata || [];
                const deviceIds = t.device_ids || [];

                // Format Last Seen (Exact Time)
                const lastSeen = t.last_login ? new Date(t.last_login).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : 'Never';

                let deviceHTML = '';
                if (devices.length === 0) {
                    deviceHTML = `
                    <div class="device-cell empty">
                        <span class="device-name" style="opacity:0.5;">Pending Login</span>
                        <div class="forensic-subtext">No hardware DNA bound.</div>
                    </div>
                `;
                } else {
                    deviceHTML = devices.map((meta, idx) => {
                        const brand = meta.deviceName || "Unknown Device";
                        const dna = deviceIds[idx] || "MISSING DNA";
                        const detail = `${meta.gpu || '?'} | ${meta.cpu || '?'} Cores`;
                        return `
                        <div class="device-cell" style="${idx > 0 ? 'margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;' : ''}">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="device-name">${brand}</span>
                                <span class="dna-count" style="font-size:0.6rem; opacity:0.4;">Slot ${idx + 1}/${t.email === 'admin2@gmail.com' ? 5 : 2}</span>
                            </div>
                            <span class="dna-badge">${dna}</span>
                            <div class="forensic-subtext">${detail}</div>
                        </div>
                    `;
                    }).join('');
                }

                return `
                <tr>
                    <td><strong>${t.full_name}</strong></td>
                    <td>${t.email}</td>
                    <td>
                        <div class="level-list clickable" 
                             data-action="${t.role === 'supervisor' ? 'edit-supervisor' : 'edit-levels'}" 
                             data-id="${t.id}" 
                             data-name="${t.full_name.replace(/'/g, "&apos;")}" 
                             data-email="${t.email}"
                             data-levels="${(t.assigned_levels || []).join(',')}"
                             data-units='${JSON.stringify(t.assigned_units || {})}'
                             data-master-access="${t.has_master_access}"
                             data-start-date="${t.course_start_date || ''}"
                             data-time-bypass="${t.time_lock_bypass === true}"
                             data-surgical-overrides='${JSON.stringify(t.surgical_overrides || [])}'>
                            ${t.role === 'supervisor' ? '<span class="lvl-tag" style="background:var(--accent-glow); color:var(--bg-dark);">SUPERVISOR</span>' : ''}
                            ${t.role !== 'supervisor' && t.has_master_access ? '<span class="lvl-tag" style="background:var(--warning-yellow); color:black;">MASTER</span>' : ''}
                            ${t.role !== 'supervisor' ? (t.assigned_levels || []).map(lvl => `<span class="lvl-tag">${lvl}</span>`).join('') : ''}
                            ${t.role !== 'supervisor' && (t.surgical_overrides && t.surgical_overrides.length > 0) ? '<span class="lvl-tag" style="background:rgba(238,44,54,0.1); color:var(--brand-red); border-color:rgba(238,44,54,0.2);" title="Surgical Overrides Active">🎯 OVERRIDE</span>' : ''}
                            <span class="edit-icon">✎</span>
                        </div>
                    </td>
                    <td>
                        ${deviceHTML}
                    </td>
                    <td>${lastSeen}</td>
                    <td>
                        <div class="status-group" style="display:flex; align-items:center; gap:10px;">
                            <span class="status-badge ${t.last_login ? 'active' : 'pending'}">${t.last_login ? 'Active' : 'Pending'}</span>
                            <button class="btn-ghost impersonate-btn" 
                                    data-action="impersonate" 
                                    data-email="${t.email}" 
                                    data-name="${t.full_name}"
                                    title="🎭 Auditor Takeover">🎭</button>
                        </div>
                    </td>
                    <td>
                        <div class="actions-group" style="display:flex; gap:5px;">
                            ${t.role === 'supervisor' ?
                        `<button class="btn-ghost" data-action="edit-supervisor" data-id="${t.id}" data-name="${t.full_name.replace(/'/g, "&apos;")}" data-email="${t.email}">Edit</button>` :
                        `<button class="btn-ghost" 
                                    data-action="edit-levels" 
                                    data-id="${t.id}" 
                                    data-name="${t.full_name.replace(/'/g, "&apos;")}" 
                                    data-levels="${(t.assigned_levels || []).join(',')}"
                                    data-units='${JSON.stringify(t.assigned_units || {})}'
                                    data-master-access="${t.has_master_access}"
                                    data-start-date="${t.course_start_date || ''}"
                                    data-time-bypass="${t.time_lock_bypass === true}"
                                    data-surgical-overrides='${JSON.stringify(t.surgical_overrides || [])}'>Edit</button>`
                    }
                            <button class="btn-ghost" data-action="reset-dna" data-id="${t.id}" data-email="${t.email}">Reset DNA</button>
                            <button class="btn-ghost" style="color: var(--warning-yellow);" data-action="delete-teacher" data-id="${t.id}" data-name="${t.full_name || t.email}">Remove</button>
                        </div>
                    </td>
                </tr>

            `;
            }).join('');

            document.getElementById('total-teachers-count').textContent = teachers.length;
            document.getElementById('active-sessions-count').textContent = teachers.filter(t => t.last_login).length;

            // Build the Access Matrix (Audit Tab)
            buildAccessMatrix(teachers);
        } catch (error) {
            console.error("Fetch or API Error:", error);
            const tbody = document.getElementById('teacher-list-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--brand-red);">Network or Server Error: ${error.message}</td></tr>`;
            }
        }
    }

    // Chronos Command Helper Logic (Libya Time Sync)
    function getLibyaCurrentWeek(startDateStr) {
        if (!startDateStr) return null;
        const now = new Date();
        const libyaNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
        const start = new Date(startDateStr);
        start.setUTCHours(0, 0, 0, 0);

        if (libyaNow < start) return 0; // Not started

        // Find first Friday 05:00 AM after start
        let firstFriday = new Date(start);
        while (firstFriday.getUTCDay() !== 5) {
            firstFriday.setUTCDate(firstFriday.getUTCDate() + 1);
        }
        firstFriday.setUTCHours(5, 0, 0, 0);

        if (libyaNow < firstFriday) return 1;

        const diff = libyaNow.getTime() - firstFriday.getTime();
        return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 2;
    }

    function buildAccessMatrix(teachers) {
        const matrixBody = document.getElementById('matrix-list-body');
        if (!matrixBody) return;

        if (teachers.length === 0) {
            matrixBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No teachers found.</td></tr>';
            return;
        }

        matrixBody.innerHTML = teachers.map(t => {
            const hasMaster = t.has_master_access === true || t.has_master_access === 'true';
            const levels = t.assigned_levels || [];
            const unitsMap = t.assigned_units || {};
            const schedules = t.chronos_schedules || {};
            const bypass = t.time_lock_bypass === true || t.time_lock_bypass === 'true';

            let accessDetailHTML = '';

            if (levels.length === 0) {
                accessDetailHTML = `<span style="opacity: 0.5; font-style: italic;">No access assigned.</span>`;
            } else {
                accessDetailHTML = levels.map(lvl => {
                    let lid = lvl === 'Starter' ? 'L0' : 'L' + lvl.replace('Level ', '');
                    const units = unitsMap[lid] || [];

                    let unitTags = '';
                    if (hasMaster) {
                        unitTags = ` <span class="lvl-tag master-badge" style="font-size:0.6rem; margin-left:8px;">👑 ALL UNITS UNLOCKED</span>`;
                    } else {
                        unitTags = units.length > 0
                            ? ` <span class="unit-pills">[ ${units.map(u => u.replace('U', '')).sort((a, b) => a - b).join(', ')} ]</span>`
                            : ' <span class="unit-pills" style="opacity:0.5;">[ No Units ]</span>';
                    }

                    // Chronos Status for this level
                    let chronosStatus = '';
                    const startDate = schedules[lvl];
                    if (startDate && !hasMaster && !bypass) {
                        const week = getLibyaCurrentWeek(startDate);
                        chronosStatus = `<span class="chronos-mini-pill" title="Started: ${startDate}">⏳ W${week}</span>`;
                    }

                    return `
                        <div class="matrix-level-row">
                            <span class="lvl-tag">${lvl}</span>
                            ${chronosStatus}
                            ${unitTags}
                        </div>
                    `;
                }).join('');
            }

            // Surgical Overrides for Matrix
            const overrides = t.surgical_overrides || [];
            let overrideHTML = '';
            if (overrides.length > 0) {
                overrideHTML = `
                    <div class="matrix-override-group" style="margin-top: 8px; padding-top: 8px; border-top: 1px dotted rgba(238, 44, 54, 0.3);">
                        <div style="font-size: 0.65rem; color: var(--brand-red); margin-bottom: 5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">🎯 Precision Overrides</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${overrides.map(ov => {
                    const bType = ov.book === 'all' ? 'Any' : (ov.book === 'student_book' ? 'SB' : (ov.book === 'teacher_book' ? 'TG' : 'WB'));
                    return `<span class="chronos-mini-pill" style="background: rgba(238, 44, 54, 0.1); color: var(--brand-red); border: 1px solid rgba(238, 44, 54, 0.2); font-size: 0.65rem;" title="${ov.level} | ${ov.book}">p.${ov.pages} (${bType})</span>`;
                }).join('')}
                        </div>
                    </div>
                `;
            }

            return `
                <tr>
                    <td>
                        <strong>${t.full_name}</strong><br>
                        <small style="opacity:0.6;">${t.email}</small>
                    </td>
                    <td><span class="status-badge ${t.last_login ? 'active' : 'pending'}">${t.last_login ? 'Active' : 'Pending'}</span></td>
                    <td>
                        <div class="matrix-access-grid">
                            ${accessDetailHTML}
                            ${overrideHTML}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function renderChronosCommand() {
        const key = sessionStorage.getItem('sea_erp_token');
        const deviceId = await SCSSecurity.getFingerprint();
        const response = await fetch('/.netlify/functions/scs-admin-api', {
            headers: { 'x-admin-key': key, 'x-device-id': deviceId }
        });
        const teachers = await response.json();

        const listBody = document.getElementById('chronos-list-body');
        if (!listBody) return;

        listBody.innerHTML = teachers.map(t => {
            const levels = t.assigned_levels || [];
            const schedules = t.chronos_schedules || {};
            const bypass = t.time_lock_bypass === true || t.time_lock_bypass === 'true';

            let scheduleInputs = levels.map(lvl => {
                const dateVal = schedules[lvl] || '';
                const week = getLibyaCurrentWeek(dateVal);
                const weekDisplay = week !== null ? `<span class="badge" style="background:var(--accent-glow); margin-left:8px;">Week ${week}</span>` : '';

                return `
                    <div class="chronos-input-row" style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                        <span class="lvl-tag" style="min-width:70px;">${lvl}</span>
                        <input type="date" class="chronos-level-date" data-level="${lvl}" data-teacher-id="${t.id}" value="${dateVal}" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:white; padding:4px 8px; border-radius:4px;">
                        ${weekDisplay}
                    </div>
                `;
            }).join('') || '<span style="opacity:0.5;">No levels assigned.</span>';

            return `
                <tr data-teacher-id="${t.id}">
                    <td><strong>${t.full_name}</strong></td>
                    <td><div class="chronos-schedule-group">${scheduleInputs}</div></td>
                    <td>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" class="chronos-bypass-toggle" data-teacher-id="${t.id}" ${bypass ? 'checked' : ''}>
                            <span style="font-size:0.8rem;">Bypass Lock</span>
                        </label>
                    </td>
                    <td>
                        <button class="btn-primary save-chronos-row" data-teacher-id="${t.id}" style="padding: 6px 12px; font-size: 0.8rem;">Save Timeline</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach event listeners for save buttons
        document.querySelectorAll('.save-chronos-row').forEach(btn => {
            btn.addEventListener('click', () => saveTeacherChronos(btn.getAttribute('data-teacher-id')));
        });
    }

    async function saveTeacherChronos(id) {
        const row = document.querySelector(`tr[data-teacher-id="${id}"]`);
        const bypass = row.querySelector('.chronos-bypass-toggle').checked;
        const schedules = {};

        row.querySelectorAll('.chronos-level-date').forEach(input => {
            const lvl = input.getAttribute('data-level');
            const date = input.value;
            if (date) schedules[lvl] = date;
        });

        try {
            const key = sessionStorage.getItem('sea_erp_token');
            const deviceId = await SCSSecurity.getFingerprint();

            // Get current teacher data to preserve other fields
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': key, 'x-device-id': deviceId },
                body: JSON.stringify({
                    action: 'UPDATE_ACCESS',
                    payload: {
                        id,
                        chronosSchedules: schedules,
                        timeLockBypass: bypass
                    }
                })
            });

            if (response.ok) {
                alert("Timeline saved successfully!");
                renderChronosCommand();
            } else {
                alert("Failed to save timeline.");
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to server.");
        }
    }

    // Global Event Delegation for Table
    const tableBody = document.getElementById('teacher-list-body');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.getAttribute('data-action');
            const id = target.getAttribute('data-id');

            if (action === 'impersonate') {
                const email = target.getAttribute('data-email');
                const name = target.getAttribute('data-name');
                handleImpersonation(email, name);
            } else if (action === 'edit-supervisor') {
                const name = target.getAttribute('data-name');
                const email = target.getAttribute('data-email');
                document.getElementById('edit-supervisor-id').value = id;
                document.getElementById('edit-supervisor-name').value = name;
                document.getElementById('edit-supervisor-email').value = email;
                document.getElementById('edit-supervisor-password').value = '';
                document.getElementById('edit-supervisor-modal').classList.remove('hidden');
            } else if (action === 'edit-levels') {
                const name = target.getAttribute('data-name');
                const levels = target.getAttribute('data-levels').split(',').filter(l => l);
                const units = target.getAttribute('data-units');
                const hasMasterAccess = target.getAttribute('data-master-access');
                const startDate = target.getAttribute('data-start-date');
                const timeBypass = target.getAttribute('data-time-bypass');
                const surgicalOverrides = target.getAttribute('data-surgical-overrides');
                openEditLevels(id, name, levels, units, hasMasterAccess, startDate, timeBypass, surgicalOverrides);
            } else if (action === 'reset-dna') {
                const email = target.getAttribute('data-email');
                resetTeacher(id, email);
            } else if (action === 'delete-teacher') {
                const name = target.getAttribute('data-name');
                deleteTeacher(id, name);
            }
        });
    }

    function openEditLevels(id, name, levels, units, hasMasterAccess, startDate, timeBypass, surgicalOverrides) {
        document.getElementById('edit-teacher-id').value = id;
        document.getElementById('edit-teacher-display-name').textContent = name;

        const checkboxes = document.querySelectorAll('#edit-levels-grid input');
        checkboxes.forEach(cb => {
            cb.checked = levels.includes(cb.value);
        });

        document.getElementById('edit-master-access').checked = (hasMasterAccess === 'true' || hasMasterAccess === true);

        // Populate Chronos Fields
        document.getElementById('edit-start-date').value = startDate || '';
        document.getElementById('edit-time-bypass').checked = (timeBypass === 'true' || timeBypass === true);

        // Populate Surgical Overrides
        try {
            const ovData = surgicalOverrides ? JSON.parse(surgicalOverrides) : [];
            renderOverrideRows('edit-overrides-list', ovData);
        } catch (e) {
            console.error("Failed to parse surgical overrides:", e);
            renderOverrideRows('edit-overrides-list', []);
        }

        window._currentEditingUnits = units ? JSON.parse(units) : {};
        renderUnitCheckboxes(levels, 'edit-units-container', window._currentEditingUnits);

        document.getElementById('edit-levels-modal').classList.remove('hidden');
    }

    async function resetTeacher(id, email = null) {
        const maxSlots = email === 'admin2@gmail.com' ? 5 : 2;
        if (!confirm(`☢️ WARNING: This will unbind ALL authorized devices (Up to ${maxSlots}/${maxSlots}) for this teacher. They will need to log in again from their new devices to re-marry their hardware. Proceed?`)) return;
        const key = sessionStorage.getItem('sea_erp_token');
        const deviceId = await SCSSecurity.getFingerprint();
        try {
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'RESET_DEVICES', payload: { teacherId: id } })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || err.message || 'Database transaction failed');
            }
            alert("Hardware DNA successfully reset. Devices cleared.");
            setTimeout(() => loadTeacherData(key), 300);
        } catch (error) {
            alert(`Error resetting devices: ${error.message}`);
        }
    }

    async function deleteTeacher(id, name) {
        if (!confirm(`☢️ CRITICAL WARNING: You are about to PERMANENTLY delete the teacher: ${name}.\n\nThis will instantly destroy their password hash, hardware DNA marriages, scheduled curriculum timelines, and all associated pedagogical data.\n\nTHIS ACTION CANNOT BE UNDONE. Are you absolutely sure?`)) return;

        const finalConfirm = prompt(`To confirm deletion, please type the word DELETE below:`);
        if (finalConfirm !== 'DELETE') {
            alert("Deletion cancelled.");
            return;
        }

        const key = sessionStorage.getItem('sea_erp_token');
        const deviceId = await SCSSecurity.getFingerprint();
        try {
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'DELETE_TEACHER', payload: { teacherId: id } })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || err.message || 'Database transaction failed');
            }
            alert(`Teacher ${name} has been permanently removed from the system.`);
            setTimeout(() => loadTeacherData(key), 300);
        } catch (error) {
            alert(`Error removing teacher: ${error.message}`);
        }
    }

    function renderUnitCheckboxes(levels, containerId, unitsAssigned = {}) {
        const container = document.getElementById(containerId);
        container.innerHTML = ''; // Clear existing

        if (!levels || levels.length === 0) {
            container.innerHTML = '<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Select a level above to assign specific units.</p>';
            return;
        }

        if (!window.scsManifestCache) {
            container.innerHTML = '<p style="color: var(--warning-yellow);">Manifest data loading... Please refresh.</p>';
            return;
        }

        // We only care about student_book for units list
        const studentBooks = window.scsManifestCache.filter(r => r.book_type === 'student_book');

        levels.forEach(levelName => {
            // "Level 1" -> "L1", "Starter" -> "L0"
            let lid = levelName === 'Starter' ? 'L0' : 'L' + levelName.replace('Level ', '');

            const levelRow = studentBooks.find(r => r.level_id === lid);
            if (!levelRow || !levelRow.units || Object.keys(levelRow.units).length === 0) {
                const p = document.createElement('p');
                p.style.fontSize = '0.9em';
                p.style.opacity = '0.7';
                p.textContent = `${levelName}: No units configured in manifest.`;
                container.appendChild(p);
                return;
            }

            const groupDiv = document.createElement('div');
            groupDiv.style.marginBottom = '10px';

            const groupTitle = document.createElement('h4');
            groupTitle.textContent = levelName;
            groupTitle.style.margin = '0 0 5px 0';
            groupTitle.style.fontSize = '0.9em';
            groupTitle.style.color = 'var(--accent-glow)';
            groupDiv.appendChild(groupTitle);

            const gridDiv = document.createElement('div');
            gridDiv.className = 'checkbox-grid';
            gridDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))';

            Object.keys(levelRow.units).forEach(unitId => {
                const label = document.createElement('label');
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                // Value format: "L1:U1"
                cb.value = `${lid}:${unitId}`;

                // Check if this unit is assigned
                // NEW: Auto-select Unit 1 for newly added levels to ensure Chronos works by default
                const isUnit1 = unitId.toString() === '1';
                if ((unitsAssigned[lid] && unitsAssigned[lid].includes(unitId)) || (!unitsAssigned[lid] && isUnit1)) {
                    cb.checked = true;
                }

                label.appendChild(cb);
                label.appendChild(document.createTextNode(` Unit ${unitId}`));
                gridDiv.appendChild(label);
            });

            groupDiv.appendChild(gridDiv);
            container.appendChild(groupDiv);
        });
    }

    const addLevelsGrid = document.getElementById('add-levels-grid');
    if (addLevelsGrid) {
        addLevelsGrid.addEventListener('change', () => {
            const levels = Array.from(addLevelsGrid.querySelectorAll('input:checked')).map(cb => cb.value);
            // Capture current checks before re-render
            const currentUnits = {};
            document.querySelectorAll('#add-units-container input:checked').forEach(cb => {
                const [lid, uid] = cb.value.split(':');
                if (!currentUnits[lid]) currentUnits[lid] = [];
                currentUnits[lid].push(uid);
            });
            renderUnitCheckboxes(levels, 'add-units-container', currentUnits);
        });
    }

    const editLevelsGrid = document.getElementById('edit-levels-grid');
    if (editLevelsGrid) {
        editLevelsGrid.addEventListener('change', () => {
            const levels = Array.from(editLevelsGrid.querySelectorAll('input:checked')).map(cb => cb.value);
            // Capture current checks before re-render
            const currentUnits = {};
            document.querySelectorAll('#edit-units-container input:checked').forEach(cb => {
                const [lid, uid] = cb.value.split(':');
                if (!currentUnits[lid]) currentUnits[lid] = [];
                currentUnits[lid].push(uid);
            });
            renderUnitCheckboxes(levels, 'edit-units-container', currentUnits);
        });
    }

    async function checkEmergencyStatus(key) {
        try {
            const deviceId = await SCSSecurity.getFingerprint();
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'GET_CONFIG', payload: { key: 'emergency_lock' } })
            });
            const data = await response.json();
            if (data && data.value && data.value.locked) {
                updateEmergencyUI(true);
            }
            // Also check pilot status and debug status
            checkPilotStatus(key);
            checkDebugStatus(key);
        } catch (e) {
            console.error("Failed to check emergency status:", e);
        }
    }

    async function checkPilotStatus(key) {
        try {
            const deviceId = await SCSSecurity.getFingerprint();
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'GET_CONFIG', payload: { key: 'pilot_lock' } })
            });
            const data = await response.json();
            if (data && data.value) {
                let configValue = data.value;
                if (typeof configValue === 'string') {
                    try { configValue = JSON.parse(configValue); } catch (e) { }
                }
                updatePilotUI(configValue.active);
            }
        } catch (e) {
            console.error("Failed to check pilot status:", e);
        }
    }

    async function checkDebugStatus(key) {
        try {
            const deviceId = await SCSSecurity.getFingerprint();
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'GET_CONFIG', payload: { key: 'global_debug_mode' } })
            });
            const data = await response.json();
            if (data && data.value) {
                let configValue = data.value;
                if (typeof configValue === 'string') {
                    try { configValue = JSON.parse(configValue); } catch (e) { }
                }
                updateDebugUI(configValue.active);
            }
        } catch (e) {
            console.error("Failed to check debug status:", e);
        }
    }

    // ====== SECURITY DIAL LOGIC ======
    const dialEnabled = document.getElementById('dial-enabled');
    const dialOpacity = document.getElementById('dial-opacity');
    const dialDensity = document.getElementById('dial-density');
    const dialStrobe = document.getElementById('dial-strobe');
    const saveSecurityBtn = document.getElementById('save-security-btn');
    const previewCanvas = document.getElementById('security-preview-canvas');

    // Forensic Fields
    const fieldName = document.getElementById('field-name');
    const fieldDate = document.getElementById('field-date');
    const fieldDNA = document.getElementById('field-dna');

    const opacityVal = document.getElementById('opacity-val');
    const densityVal = document.getElementById('density-val');

    function updatePreview() {
        if (!dialOpacity) return;

        const enabled = dialEnabled.checked;
        const opacity = parseFloat(dialOpacity.value);
        const density = parseInt(dialDensity.value);

        const fields = {
            name: fieldName.checked,
            date: fieldDate.checked,
            dna: fieldDNA.checked
        };

        opacityVal.textContent = opacity.toFixed(2);
        densityVal.textContent = density;

        drawPreview(enabled, opacity, density, fields);
    }

    function drawPreview(enabled, opacity, density, fields) {
        if (!previewCanvas) return;
        const ctx = previewCanvas.getContext('2d');
        const w = previewCanvas.width = previewCanvas.offsetWidth;
        const h = previewCanvas.height = previewCanvas.offsetHeight;

        ctx.clearRect(0, 0, w, h);

        if (!enabled) {
            ctx.fillStyle = "rgba(238, 44, 54, 0.1)";
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#EE2C36";
            ctx.font = "bold 14px Outfit";
            ctx.textAlign = "center";
            ctx.fillText("WATERMARK DISABLED", w / 2, h / 2);
            return;
        }

        ctx.fillStyle = `rgba(48, 69, 135, ${opacity})`;
        ctx.font = "bold 11px Outfit";
        ctx.textAlign = "center";

        // Build preview text based on fields
        let previewParts = [];
        if (fields.name) previewParts.push("NAME");
        if (fields.date) previewParts.push("DATE");
        if (fields.dna) previewParts.push("DNA");
        const previewText = previewParts.join(" | ") || "EMPTY WATERMARK";

        const stepX = 180 - (density * 10);
        const stepY = 120 - (density * 8);

        for (let x = 0; x < w + stepX; x += stepX) {
            for (let y = 0; y < h + stepY; y += stepY) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 4);
                ctx.fillText(previewText, 0, 0);
                ctx.restore();
            }
        }
    }

    // High-Stakes Confirmation for Disabling Watermark
    if (dialEnabled) {
        dialEnabled.addEventListener('change', (e) => {
            if (!e.target.checked) {
                const confirmed = confirm("🚨 CRITICAL SECURITY WARNING:\n\nYou are about to DISABLE the curriculum watermark globally.\n\nThis will remove all forensic tracking from the teaching assets, making it impossible to trace the source of any leaked content.\n\nAre you ABSOLUTELY sure you want to proceed?");
                if (!confirmed) {
                    e.target.checked = true;
                }
            }
            updatePreview();
        });
    }

    [dialOpacity, dialDensity, fieldName, fieldDate, fieldDNA].forEach(el => {
        el?.addEventListener('input', updatePreview);
    });

    async function loadSecurityConfig() {
        const key = localStorage.getItem(ADMIN_KEY_STORAGE);
        const deviceId = await SCSSecurity.getFingerprint();
        try {
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'GET_CONFIG', payload: { key: 'watermark_settings' } })
            });
            const data = await response.json();
            if (data && data.value) {
                dialEnabled.checked = data.value.enabled !== false;
                dialOpacity.value = data.value.opacity || 0.15;
                dialDensity.value = data.value.density || 5;

                // Fields (Default to Name + Date)
                fieldName.checked = data.value.fields?.name !== false;
                fieldDate.checked = data.value.fields?.date !== false;
                fieldDNA.checked = data.value.fields?.dna === true;

                updatePreview();
            } else {
                updatePreview();
            }
        } catch (e) {
            console.error("Failed to load security config:", e);
            updatePreview();
        }
    }

    // Premium Date Picker Behavior: Force open calendar on click/focus
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'date') {
            if ('showPicker' in HTMLInputElement.prototype) {
                try {
                    e.target.showPicker();
                } catch (err) { }
            }
        }
    });

    // Also support direct clicks for non-keyboard users
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'date') {
            if ('showPicker' in HTMLInputElement.prototype) {
                try { e.target.showPicker(); } catch (err) { }
            }
        }
    });

    if (saveSecurityBtn) {
        saveSecurityBtn.addEventListener('click', async () => {
            const key = localStorage.getItem(ADMIN_KEY_STORAGE);
            const deviceId = await SCSSecurity.getFingerprint();

            const config = {
                enabled: dialEnabled.checked,
                opacity: parseFloat(dialOpacity.value),
                density: parseInt(dialDensity.value),
                fields: {
                    name: fieldName.checked,
                    date: fieldDate.checked,
                    dna: fieldDNA.checked
                }
            };

            saveSecurityBtn.textContent = 'Applying...';
            saveSecurityBtn.disabled = true;

            try {
                const response = await fetch('/.netlify/functions/scs-admin-api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': key,
                        'x-device-id': deviceId
                    },
                    body: JSON.stringify({
                        action: 'UPDATE_CONFIG',
                        payload: { key: 'watermark_settings', value: config }
                    })
                });

                if (response.ok) {
                    saveSecurityBtn.textContent = '✅ Applied Globally';
                    setTimeout(() => {
                        saveSecurityBtn.textContent = 'Apply Security Configuration';
                        saveSecurityBtn.disabled = false;
                    }, 2000);
                }
            } catch (e) {
                console.error(e);
                alert("Failed to save security config.");
                saveSecurityBtn.textContent = 'Apply Security Configuration';
                saveSecurityBtn.disabled = false;
            }
        });
    }

    // Tab integration for Security Dial
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.getAttribute('data-target');
            if (targetView === 'view-security') {
                loadSecurityConfig();
            } else if (targetView === 'view-chronos') {
                renderChronosCommand();
            } else if (targetView === 'view-requests') {
                loadPendingRequests();
            } else if (targetView === 'view-archive') {
                loadArchivedStudents();
            }
        });
    });

    // Migration V2 Trigger
    const migrationBtn = document.getElementById('run-migration-btn');
    if (migrationBtn) {
        migrationBtn.addEventListener('click', async () => {
            if (!confirm("DANGER: This will modify the database schema to support Chronos v2. Proceed?")) return;

            try {
                const key = sessionStorage.getItem('sea_erp_token');
                const deviceId = await SCSSecurity.getFingerprint();
                const response = await fetch('/.netlify/functions/scs-admin-api', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-admin-key': key,
                        'x-device-id': deviceId
                    },
                    body: JSON.stringify({ action: 'MIGRATE_V2' })
                });
                const data = await response.json();
                if (data.success) {
                    alert("Migration Successful: chronos_schedules column added.");
                    migrationBtn.style.display = 'none';
                } else {
                    alert("Migration Failed: " + (data.error || 'Unknown error'));
                }
            } catch (err) {
                console.error(err);
                alert("Critical failure during migration.");
            }
        });
    }


    async function handleImpersonation(email, name) {
        if (!confirm(`🎭 Auditor Takeover: Enter "Audit Mode" for ${name}?`)) return;

        const key = sessionStorage.getItem('sea_erp_token');
        const deviceId = await SCSSecurity.getFingerprint();

        try {
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'IMPERSONATE', payload: { email } })
            });

            if (response.ok) {
                const data = await response.json();
                // Store in sessionStorage (Temp Audit Session)
                sessionStorage.setItem('scs_audit_session', JSON.stringify({
                    profile: data.profile,
                    isAuditMode: true,
                    auditorName: "Master Auditor"
                }));
                // Redirect to Dashboard
                window.location.href = '/pilot';
            } else {
                const err = await response.json();
                alert("Impersonation Failed: " + (err.error || "Access Denied"));
            }
        } catch (e) {
            console.error("Impersonation error:", e);
            alert("Connection error during takeover.");
        }
    }
    // Migration V3 Trigger
    const migrationV3Btn = document.getElementById('run-migration-v3-btn');
    if (migrationV3Btn) {
        migrationV3Btn.addEventListener('click', async () => {
            if (!confirm("🚨 EVOLUTION TRIGGER: This will migrate all legacy surgical overrides to the new Level-Aware JSONB format. This cannot be easily undone. Proceed?")) return;

            try {
                const key = sessionStorage.getItem('sea_erp_token');
                const deviceId = await SCSSecurity.getFingerprint();
                const response = await fetch('/.netlify/functions/scs-admin-api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': key,
                        'x-device-id': deviceId
                    },
                    body: JSON.stringify({ action: 'MIGRATE_V3' })
                });
                const data = await response.json();
                if (data.success) {
                    alert("Migration Successful: Surgical overrides evolved to JSONB.");
                    migrationV3Btn.style.display = 'none';
                    loadTeacherData(key);
                } else {
                    alert("Migration Failed: " + (data.error || 'Unknown error'));
                }
            } catch (err) {
                console.error(err);
                alert("Critical failure during evolution.");
            }
        });
    }

    // Surgical Overrides Helpers
    function createOverrideRow(containerId, data = { level: 'all', book: 'all', pages: '' }) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'override-row';

        row.innerHTML = `
            <select class="override-level">
                <option value="all" ${data.level === 'all' ? 'selected' : ''}>All Levels</option>
                <option value="L0" ${data.level === 'L0' ? 'selected' : ''}>Starter (L0)</option>
                <option value="L1" ${data.level === 'L1' ? 'selected' : ''}>Level 1</option>
                <option value="L2" ${data.level === 'L2' ? 'selected' : ''}>Level 2</option>
                <option value="L3" ${data.level === 'L3' ? 'selected' : ''}>Level 3</option>
                <option value="L4" ${data.level === 'L4' ? 'selected' : ''}>Level 4</option>
                <option value="L5" ${data.level === 'L5' ? 'selected' : ''}>Level 5</option>
                <option value="L6" ${data.level === 'L6' ? 'selected' : ''}>Level 6</option>
            </select>
            <select class="override-book">
                <option value="all" ${data.book === 'all' ? 'selected' : ''}>All Books</option>
                <option value="student_book" ${data.book === 'student_book' ? 'selected' : ''}>Student Book</option>
                <option value="teacher_book" ${data.book === 'teacher_book' ? 'selected' : ''}>Teacher Guide</option>
                <option value="work_book" ${data.book === 'work_book' ? 'selected' : ''}>Work Book</option>
            </select>
            <input type="text" class="override-pages" placeholder="Pages (e.g. 10, 11-15)" value="${data.pages || ''}">
            <button type="button" class="btn-remove-override">×</button>
        `;

        row.querySelector('.btn-remove-override').addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    function renderOverrideRows(containerId, overrides = []) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        // Handle legacy string data
        if (typeof overrides === 'string' && overrides.length > 0) {
            createOverrideRow(containerId, { level: 'all', book: 'all', pages: overrides });
        } else if (Array.isArray(overrides)) {
            overrides.forEach(ov => createOverrideRow(containerId, ov));
        }
    }

    function collectOverrides(containerId) {
        const rows = document.querySelectorAll(`#${containerId} .override-row`);
        return Array.from(rows).map(row => ({
            level: row.querySelector('.override-level').value,
            book: row.querySelector('.override-book').value,
            pages: row.querySelector('.override-pages').value.trim()
        })).filter(ov => ov.pages);
    }

    // Attach row adders
    document.getElementById('edit-add-override-btn')?.addEventListener('click', () => createOverrideRow('edit-overrides-list'));
    document.getElementById('add-override-btn-new')?.addEventListener('click', () => createOverrideRow('add-overrides-list'));

    // ====== TEACHER REQUESTS LOGIC ======
    const refreshRequestsBtn = document.getElementById('refresh-requests-btn');
    if (refreshRequestsBtn) {
        refreshRequestsBtn.addEventListener('click', loadPendingRequests);
    }

    const trustModeToggle = document.getElementById('trust-mode-toggle');
    if (trustModeToggle) {
        // Fetch initial trust mode state
        async function fetchTrustMode() {
            const key = sessionStorage.getItem('sea_erp_token');
            const deviceId = await SCSSecurity.getFingerprint();
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'GET_CONFIG', payload: { key: 'global_settings' } })
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.value && data.value.trust_mode !== undefined) {
                    trustModeToggle.checked = data.value.trust_mode;
                    updateTrustModeUI(data.value.trust_mode);
                }
            }
        }
        fetchTrustMode();

        trustModeToggle.addEventListener('change', async (e) => {
            const isTrusted = e.target.checked;
            const msg = isTrusted ? "🛡️ ENABLE TRUST MODE? Teachers will insert directly to the database without approval." : "🛑 DISABLE TRUST MODE? Teachers will require approval for roster changes.";
            if (!confirm(msg)) {
                e.target.checked = !isTrusted; // revert
                return;
            }

            const key = sessionStorage.getItem('sea_erp_token');
            const deviceId = await SCSSecurity.getFingerprint();
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'UPDATE_CONFIG', payload: { key: 'global_settings', value: { trust_mode: isTrusted, timestamp: new Date().toISOString() } } })
            });

            if (response.ok) {
                updateTrustModeUI(isTrusted);
            } else {
                alert("Failed to update Trust Mode.");
                e.target.checked = !isTrusted;
            }
        });
    }

    function updateTrustModeUI(isTrusted) {
        if (!trustModeToggle) return;
        const slider = trustModeToggle.nextElementSibling;
        if (isTrusted) {
            slider.style.backgroundColor = '#34d399'; // green for trust
        } else {
            slider.style.backgroundColor = '#ccc'; // default
        }
    }

    async function loadPendingRequests() {
        const key = sessionStorage.getItem('sea_erp_token');
        const deviceId = await SCSSecurity.getFingerprint();
        const tbody = document.getElementById('requests-list-body');
        const badge = document.getElementById('pending-requests-badge');

        try {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">Loading pending requests...</td></tr>';
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'GET_PENDING_REQUESTS' })
            });

            const data = await response.json();

            if (!response.ok) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--brand-red);">${data.error || 'Failed to load requests'}</td></tr>`;
                return;
            }

            if (!data.requests || data.requests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No pending requests.</td></tr>';
                if (badge) badge.style.display = 'none';
                return;
            }

            if (badge) {
                badge.textContent = data.requests.length;
                badge.style.display = 'inline-block';
            }

            tbody.innerHTML = data.requests.map(req => {
                const dateStr = new Date(req.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                let typeBadge = '';
                let detailsHTML = '';

                if (req.action_type === 'add_group') {
                    typeBadge = '<span class="lvl-tag" style="background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2);">New Group</span>';
                    detailsHTML = `<strong>Group Name:</strong> ${req.payload.name}<br><strong>City:</strong> ${req.payload.city}<br><strong>Branch:</strong> ${req.payload.branch}`;
                } else if (req.action_type === 'edit_class') {
                    typeBadge = '<span class="lvl-tag" style="background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.2);">Edit Group</span>';
                    detailsHTML = `<strong>Group Name:</strong> ${req.payload.name}<br><strong>Level:</strong> ${req.payload.level}<br><strong>Schedule:</strong> ${req.payload.schedule}`;
                } else if (req.action_type === 'edit_branch') {
                    typeBadge = '<span class="lvl-tag" style="background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.2);">Edit Branch</span>';
                    detailsHTML = `<strong>City:</strong> ${req.payload.city}<br><strong>Branch:</strong> ${req.payload.branch}`;
                } else if (req.action_type === 'add_student') {
                    typeBadge = '<span class="lvl-tag" style="background: rgba(52, 211, 153, 0.1); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.2);">Add Student</span>';
                    // We need the group name if available, payload currently has class_id
                    const fullName = `${req.payload.first_name} ${req.payload.middle_name ? req.payload.middle_name + ' ' : ''}${req.payload.last_name}`;
                    detailsHTML = `<strong>Student Name:</strong> ${fullName}<br><strong>Group ID:</strong> <span style="font-family: monospace; opacity: 0.8; font-size: 0.8em;">${req.payload.class_id}</span>`;
                } else if (req.action_type === 'edit_student') {
                    typeBadge = '<span class="lvl-tag" style="background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.2);">Edit Student</span>';
                    const fullName = `${req.payload.firstName} ${req.payload.middleName ? req.payload.middleName + ' ' : ''}${req.payload.lastName}`;
                    detailsHTML = `<strong>Student Name:</strong> ${fullName}`;
                } else if (req.action_type === 'remove_student') {
                    typeBadge = '<span class="lvl-tag" style="background: rgba(238, 44, 54, 0.1); color: #ee2c36; border: 1px solid rgba(238, 44, 54, 0.2);">Remove Student</span>';
                    detailsHTML = `<strong>Student ID:</strong> <span style="font-family: monospace; opacity: 0.8; font-size: 0.8em;">${req.payload.student_id}</span><br><strong>Reason:</strong> ${req.payload.reason || 'Not provided'}`;
                }

                return `
                    <tr>
                        <td>${dateStr}</td>
                        <td><strong>${req.teacher_name || 'Unknown'}</strong><br><small style="opacity:0.6; font-family: monospace;">${req.teacher_id}</small></td>
                        <td>${typeBadge}</td>
                        <td><div style="font-size: 0.85rem;">${detailsHTML}</div></td>
                        <td>
                            <div class="actions-group" style="display:flex; gap:5px;">
                                <button class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem;" data-action="resolve-request" data-id="${req.id}" data-status="approved">Approve</button>
                                <button class="btn-danger" style="padding: 4px 10px; font-size: 0.8rem; background: rgba(238,44,54,0.1); border: 1px solid var(--brand-red); color: var(--brand-red);" data-action="resolve-request" data-id="${req.id}" data-status="rejected">Reject</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error("Fetch Error:", error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--brand-red);">Network or Server Error: ${error.message}</td></tr>`;
            }
        }
    }

    // Global Event Delegation for Requests Table
    const requestsTableBody = document.getElementById('requests-list-body');
    if (requestsTableBody) {
        requestsTableBody.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action="resolve-request"]');
            if (!target) return;

            const id = target.getAttribute('data-id');
            const status = target.getAttribute('data-status');

            if (confirm(`Are you sure you want to ${status.toUpperCase()} this request?`)) {
                resolvePendingRequest(id, status);
            }
        });
    }

    async function resolvePendingRequest(requestId, status) {
        const key = sessionStorage.getItem('sea_erp_token');
        const deviceId = await SCSSecurity.getFingerprint();
        try {
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'RESOLVE_PENDING_REQUEST', payload: { requestId, resolution: status } })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || err.message || 'Resolution failed');
            }
            alert(`Request ${status} successfully.`);
            loadPendingRequests();
        } catch (error) {
            alert(`Error resolving request: ${error.message}`);
        }
    }

    // --- STUDENT ARCHIVE LOGIC ---
    const refreshArchiveBtn = document.getElementById('refresh-archive-btn');
    if (refreshArchiveBtn) {
        refreshArchiveBtn.addEventListener('click', loadArchivedStudents);
    }

    async function loadArchivedStudents() {
        const key = sessionStorage.getItem('sea_erp_token');
        const deviceId = await SCSSecurity.getFingerprint();
        const tbody = document.getElementById('archive-list-body');
        if (!tbody) return;

        try {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading archived students...</td></tr>';
            const response = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ action: 'GET_ARCHIVED_STUDENTS' })
            });

            const data = await response.json();
            if (!response.ok) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--brand-red);">${data.error || 'Failed to load archive'}</td></tr>`;
                return;
            }

            if (!data.students || data.students.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No archived students found.</td></tr>';
                return;
            }

            tbody.innerHTML = data.students.map(s => {
                const dateStr = s.created_at ? new Date(s.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
                const fullName = `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`;
                return `
                    <tr>
                        <td><strong>${fullName}</strong><br><small style="opacity:0.6; font-family:monospace;">${s.student_id}</small></td>
                        <td>${s.class_name || 'Unassigned'}</td>
                        <td>${s.teacher_name || 'Unknown'}</td>
                        <td>${s.branch_name || 'Unknown'}</td>
                        <td>${dateStr}</td>
                        <td>
                            <button class="btn-primary restore-btn" data-id="${s.student_id}" data-name="${fullName}" style="margin-right: 8px;">Restore</button>
                            <button class="btn-danger eradicate-btn" data-id="${s.student_id}" data-name="${fullName}">Eradicate</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error("Archive Fetch Error:", error);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--brand-red);">Network Error: ${error.message}</td></tr>`;
        }
    }

    // Delegate eradicate and restore button clicks
    const archiveTableBody = document.getElementById('archive-list-body');
    const eradicateModal = document.getElementById('eradicate-modal');
    const confirmEradicateBtn = document.getElementById('confirm-eradicate-btn');
    const eradicateStudentIdInput = document.getElementById('eradicate-student-id');
    const eradicateStudentNameSpan = document.getElementById('eradicate-student-name');

    if (archiveTableBody && eradicateModal) {
        archiveTableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('eradicate-btn')) {
                const id = e.target.getAttribute('data-id');
                const name = e.target.getAttribute('data-name');
                eradicateStudentIdInput.value = id;
                eradicateStudentNameSpan.textContent = name;
                eradicateModal.classList.remove('hidden');
            } else if (e.target.classList.contains('restore-btn')) {
                const id = e.target.getAttribute('data-id');
                const name = e.target.getAttribute('data-name');
                if (confirm(`Are you sure you want to restore ${name} to active status?`)) {
                    e.target.disabled = true;
                    e.target.textContent = "Restoring...";
                    
                    const key = sessionStorage.getItem('sea_erp_token');
                    const deviceId = await SCSSecurity.getFingerprint();
                    
                    try {
                        const response = await fetch('/.netlify/functions/scs-admin-api', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-key': key,
                                'x-device-id': deviceId
                            },
                            body: JSON.stringify({ action: 'RESTORE_STUDENT', payload: { studentId: id } })
                        });

                        if (!response.ok) {
                            const err = await response.json();
                            throw new Error(err.error || 'Restore failed');
                        }

                        alert(`Student ${name} restored successfully.`);
                        loadArchivedStudents();
                    } catch (error) {
                        alert(`Restore failed: ${error.message}`);
                        e.target.disabled = false;
                        e.target.textContent = "Restore";
                    }
                }
            }
        });

        const eradicateCloseBtns = eradicateModal.querySelectorAll('.close-modal');
        eradicateCloseBtns.forEach(btn => btn.addEventListener('click', () => {
            eradicateModal.classList.add('hidden');
            eradicateStudentIdInput.value = '';
        }));

        confirmEradicateBtn.addEventListener('click', async () => {
            const studentId = eradicateStudentIdInput.value;
            if (!studentId) return;

            confirmEradicateBtn.disabled = true;
            confirmEradicateBtn.textContent = "Eradicating...";

            const key = sessionStorage.getItem('sea_erp_token');
            const deviceId = await SCSSecurity.getFingerprint();

            try {
                const response = await fetch('/.netlify/functions/scs-admin-api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': key,
                        'x-device-id': deviceId
                    },
                    body: JSON.stringify({ action: 'PERMANENT_DELETE_STUDENT', payload: { studentId } })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Deletion failed');
                }

                alert("Student permanently deleted from the database.");
                eradicateModal.classList.add('hidden');
                loadArchivedStudents();
            } catch (error) {
                alert(`Eradication failed: ${error.message}`);
            } finally {
                confirmEradicateBtn.disabled = false;
                confirmEradicateBtn.textContent = "Eradicate Student";
            }
        });
    }

    // Initial load for requests badge
    loadPendingRequests();
});


// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.admin-sidebar');
    
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target) && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
});
