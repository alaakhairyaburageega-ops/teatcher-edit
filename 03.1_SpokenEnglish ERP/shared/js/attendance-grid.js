class AttendanceGrid {
    /**
     * @param {Object} config
     * @param {string} config.containerId - DOM element ID to render the grid
     * @param {string} config.role - 'admin', 'supervisor', 'cfo'
     * @param {Function} config.onSave - Callback when save is clicked: onSave({ records, deletedRecords })
     */
    constructor(config) {
        this.container = document.getElementById(config.containerId);
        if (!this.container) throw new Error(`Container #${config.containerId} not found`);
        
        this.role = config.role || 'cfo';
        this.onSaveCallback = config.onSave || null;
        
        this.isEditMode = false;
        this.backupState = null;
        
        // Data
        this.students = [];
        this.sessions = []; // For headers
        this.attendanceState = {}; // mapped by studentId -> { date: stateObject }
        this.originalState = {}; // to calculate delta for onSave
        
        // Constants
        this.stateTypes = [
            { class: 'toggle-present', icon: '✔', type: 'present', label: 'Present' },
            { class: 'toggle-absent', icon: '✘', type: 'absent', label: 'Absent' },
            { class: 'toggle-canceled', icon: '⊘', type: 'canceled', label: 'Canceled' },
            { class: 'toggle-excused', icon: 'E', type: 'excused', label: 'Excused' },
            { class: 'toggle-empty', icon: '-', type: 'empty', label: 'Empty' }
        ];

        this.initDOM();
    }

    initDOM() {
        // Build the basic HTML structure for the grid and its controls
        this.container.innerHTML = `
            <style>
                .ag-header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
                .ag-btn { background-color: var(--primary-red, #EE2C36); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
                .ag-btn:hover:not(:disabled) { transform: translateY(-2px); }
                .ag-btn:disabled { cursor: not-allowed; opacity: 0.5; }
                .ag-btn-blue { background-color: var(--primary-blue, #304587); }
                .ag-btn-gray { background-color: #666; }
                
                .ag-grid-container { background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(255,255,255,0.4); overflow-x: auto; overflow-y: visible; max-width: 100%; position: relative; transition: opacity 0.3s; }
                .ag-grid-container.locked { opacity: 0.85; }
                .ag-grid-container.locked .ag-toggle-btn { cursor: not-allowed; pointer-events: none; }
                .ag-grid-container.locked .ag-cancel-day-btn { display: none; }
                
                .ag-table { border-collapse: separate; border-spacing: 0; width: 100%; min-width: max-content; }
                .ag-table th, .ag-table td { padding: 4px; border-bottom: 1px solid rgba(0,0,0,0.08); border-right: 1px solid rgba(0,0,0,0.08); text-align: center; min-width: 32px; }
                .ag-table th { background-color: var(--primary-blue, #304587); color: white; font-weight: 500; font-size: 0.8rem; position: sticky; top: 0; z-index: 2; white-space: nowrap; }
                
                .ag-table td:first-child, .ag-table th:first-child { position: sticky; left: 0; z-index: 3; text-align: left; font-weight: 600; min-width: 200px; padding: 4px 12px; font-size: 0.85rem; }
                .ag-table td:first-child { background-color: #fafafa; border-right: 2px solid rgba(0,0,0,0.08); }
                .ag-table th:first-child { z-index: 5; }
                
                .ag-sticky-right-1 { position: sticky; right: 52px; z-index: 3; background-color: #e6f4ea !important; color: #137333; font-weight: bold; border-left: 2px solid rgba(0,0,0,0.08); min-width: 36px; font-size: 0.85rem; }
                .ag-sticky-right-2 { position: sticky; right: 0; z-index: 3; background-color: #fce8e6 !important; color: #c5221f; font-weight: bold; min-width: 36px; font-size: 0.85rem; }
                .ag-table th.ag-sticky-right-1, .ag-table th.ag-sticky-right-2 { z-index: 5; background-color: var(--primary-blue, #304587) !important; color: white; font-size: 0.8rem; }
                
                .ag-table tbody tr:hover td { background-color: rgba(48, 69, 135, 0.04); }
                .ag-table tbody tr:hover td:first-child { background-color: #f0f4f8; }
                
                .ag-toggle-btn { border: none; padding: 0; border-radius: 4px; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: all 0.15s; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
                .toggle-present { background-color: #e6f4ea; color: #137333; }
                .toggle-absent { background-color: #fce8e6; color: #c5221f; }
                .toggle-canceled { background-color: #888; color: white; }
                .toggle-excused { background-color: #fef0cd; color: #b06000; }
                .toggle-empty { background-color: transparent; color: #666; border: 1px dashed rgba(0,0,0,0.08); }
                
                .ag-empty-state { padding: 40px; text-align: center; color: #666; font-size: 1.1rem; }
                .ag-cancel-day-btn { display: block; background: #fff; color: var(--primary-blue, #304587); border: none; border-radius: 4px; font-size: 0.7rem; padding: 2px 6px; margin: 4px auto 0 auto; cursor: pointer; font-weight: bold; }
                .ag-cancel-day-btn:hover { background: #fce8e6; color: #c5221f; }
                
                /* Modal Styles */
                .ag-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 99999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
                .ag-modal-overlay.active { opacity: 1; pointer-events: auto; }
                .ag-modal-content { background: white; padding: 2rem; border-radius: 12px; width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transform: translateY(20px); transition: transform 0.2s; }
                .ag-modal-overlay.active .ag-modal-content { transform: translateY(0); }
                .ag-modal-title { color: var(--primary-blue, #304587); font-size: 1.2rem; font-weight: 600; margin-top: 0; }
                .ag-modal-message { color: #1a1a1a; margin: 1rem 0; line-height: 1.5; }
                .ag-modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 1.5rem; }
                .ag-btn-cancel { background: #eee; color: #333; box-shadow: none; }
                .ag-btn-cancel:hover { background: #e0e0e0; }
                
                .ag-loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.7); backdrop-filter: blur(4px); z-index: 10; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; border-radius: 16px; }
                .ag-loading-overlay.active { opacity: 1; pointer-events: auto; }
                .ag-spinner { width: 40px; height: 40px; border: 4px solid rgba(48,69,135,0.2); border-left-color: var(--primary-blue, #304587); border-radius: 50%; animation: ag-spin 1s linear infinite; }
                @keyframes ag-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
            
            <div class="ag-header-actions" style="display: ${this.role === 'cfo' ? 'none' : 'flex'}">
                <div style="display: flex; gap: 12px; margin-left: auto;">
                    <span id="agEditModeIndicator" style="display:none; color: var(--primary-red, #EE2C36); font-size: 0.9rem; margin-right: 10px; background: #fff0f0; padding: 8px 12px; border-radius: 4px; font-weight: bold; align-items: center;">⚠️ EDIT MODE ACTIVE</span>
                    <button id="agBtnEnableEdit" class="ag-btn ag-btn-blue">Enable Edit</button>
                    <button id="agBtnCancelChanges" class="ag-btn ag-btn-gray" style="display: none;" disabled>Cancel Changes</button>
                    <button id="agBtnSaveChanges" class="ag-btn" disabled>Save Changes</button>
                </div>
            </div>
            
            <div class="ag-grid-container locked" id="agGridContainer">
                <div class="ag-loading-overlay" id="agLoadingOverlay">
                    <div class="ag-spinner"></div>
                </div>
                <table class="ag-table">
                    <thead>
                        <tr id="agDateHeaders">
                            <th>Student Name</th>
                        </tr>
                    </thead>
                    <tbody id="agGridBody">
                        <tr><td class="ag-empty-state" colspan="100%">No data loaded.</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Custom Modal -->
            <div class="ag-modal-overlay" id="agCustomModal">
                <div class="ag-modal-content">
                    <h3 class="ag-modal-title" id="agModalTitle">Confirm Action</h3>
                    <p class="ag-modal-message" id="agModalMessage">Are you sure you want to proceed?</p>
                    <div class="ag-modal-actions">
                        <button class="ag-btn ag-btn-cancel" id="agModalBtnCancel">Cancel</button>
                        <button class="ag-btn" id="agModalBtnConfirm">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        if (this.role === 'cfo') return; // CFO has no edit rights
        
        const btnEnable = this.container.querySelector('#agBtnEnableEdit');
        const btnCancel = this.container.querySelector('#agBtnCancelChanges');
        const btnSave = this.container.querySelector('#agBtnSaveChanges');
        const indicator = this.container.querySelector('#agEditModeIndicator');
        const gridContainer = this.container.querySelector('#agGridContainer');
        
        // Modal bindings
        const modal = this.container.querySelector('#agCustomModal');
        const modalBtnCancel = this.container.querySelector('#agModalBtnCancel');
        const modalBtnConfirm = this.container.querySelector('#agModalBtnConfirm');
        
        modalBtnCancel.addEventListener('click', () => modal.classList.remove('active'));
        modalBtnConfirm.addEventListener('click', () => {
            modal.classList.remove('active');
            if (this.modalConfirmCallback) this.modalConfirmCallback();
        });

        btnEnable.addEventListener('click', () => {
            if (this.isEditMode) return;
            this.showModal(
                "Enable Edit Mode", 
                "Are you sure you want to unlock the grid for editing? This will allow you to make changes to student attendance.", 
                () => {
                    this.enableEditMode(true);
                }
            );
        });

        btnCancel.addEventListener('click', () => {
            if (!this.isEditMode) return;
            this.showModal(
                "Discard Changes", 
                "Are you sure you want to discard all changes made during this edit session?", 
                () => {
                    this.disableEditMode(true);
                }
            );
        });

        btnSave.addEventListener('click', () => {
            this.showModal(
                "Save Changes", 
                "Are you sure you want to save all changes to the database?", 
                () => {
                    this.saveChanges();
                }
            );
        });
    }

    enableEditMode(skipModal = false) {
        if (this.isEditMode) return;
        this.isEditMode = true;
        this.backupState = JSON.stringify(this.attendanceState);
        this.container.querySelector('#agGridContainer').classList.remove('locked');
        
        const btnEnable = this.container.querySelector('#agBtnEnableEdit');
        const indicator = this.container.querySelector('#agEditModeIndicator');
        const btnSave = this.container.querySelector('#agBtnSaveChanges');
        const btnCancel = this.container.querySelector('#agBtnCancelChanges');
        
        if (btnEnable) btnEnable.style.display = 'none';
        if (indicator) indicator.style.display = 'flex';
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) {
            btnCancel.disabled = false;
            btnCancel.style.display = 'inline-block';
        }
        
        if (this.container) {
            this.container.dispatchEvent(new CustomEvent('editModeChanged', { detail: { isEditMode: true } }));
        }
    }

    disableEditMode(discardChanges = false) {
        if (!this.isEditMode) return;
        if (discardChanges && this.backupState) {
            this.attendanceState = JSON.parse(this.backupState);
            this.renderGrid();
        }
        this.isEditMode = false;
        this.backupState = null;
        this.container.querySelector('#agGridContainer').classList.add('locked');
        
        const btnEnable = this.container.querySelector('#agBtnEnableEdit');
        const indicator = this.container.querySelector('#agEditModeIndicator');
        const btnSave = this.container.querySelector('#agBtnSaveChanges');
        const btnCancel = this.container.querySelector('#agBtnCancelChanges');
        
        if (btnEnable) btnEnable.style.display = 'inline-block';
        if (indicator) indicator.style.display = 'none';
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) {
            btnCancel.disabled = true;
            btnCancel.style.display = 'none';
        }
        
        if (this.container) {
            this.container.dispatchEvent(new CustomEvent('editModeChanged', { detail: { isEditMode: false } }));
        }
    }

    showModal(title, message, onConfirm) {
        this.container.querySelector('#agModalTitle').innerText = title;
        this.container.querySelector('#agModalMessage').innerHTML = message;
        this.modalConfirmCallback = onConfirm;
        this.container.querySelector('#agCustomModal').classList.add('active');
    }

    /**
     * Load new data into the grid
     * @param {Array} students [{ id, first_name, last_name, ... }]
     * @param {Array} sessions [{ date, status }] - list of all days to display
     * @param {Array} logs [{ student_id, date, status }] - explicit logs
     */
    loadData(students, sessions, logs) {
        this.students = students || [];
        this.sessions = sessions || [];
        this.logs = logs || [];
        this.sessionUpdates = []; // Initialize empty sessionUpdates
        this.attendanceState = {};
        this.originalState = {};
        
        // Initialize state matrix: students x sessions
        this.students.forEach(s => {
            this.attendanceState[s.id] = {};
            this.originalState[s.id] = {};
            this.sessions.forEach(sess => {
                const dateKey = sess.date.split('T')[0];
                const emptyState = this.stateTypes.find(st => st.type === 'empty');
                this.attendanceState[s.id][dateKey] = { ...emptyState };
                this.originalState[s.id][dateKey] = { ...emptyState };
            });
        });

        // Apply logs
        (logs || []).forEach(log => {
            const dateKey = log.date.split('T')[0];
            const stateObj = this.stateTypes.find(st => st.type === log.status) || this.stateTypes.find(st => st.type === 'empty');
            if (this.attendanceState[log.student_id] && this.attendanceState[log.student_id][dateKey]) {
                this.attendanceState[log.student_id][dateKey] = { ...stateObj };
                this.originalState[log.student_id][dateKey] = { ...stateObj };
            }
        });

        // Override with 'canceled' if the master session status is 'canceled'
        this.sessions.forEach(sess => {
            if (sess.status === 'canceled') {
                const dateKey = sess.date.split('T')[0];
                const canceledState = this.stateTypes.find(st => st.type === 'canceled');
                this.students.forEach(s => {
                    if (this.attendanceState[s.id] && this.attendanceState[s.id][dateKey]) {
                        this.attendanceState[s.id][dateKey] = { ...canceledState };
                        this.originalState[s.id][dateKey] = { ...canceledState };
                    }
                });
            }
        });

        this.renderGrid();
    }

    calculateTotals(studentId) {
        let present = 0;
        let absent = 0;
        Object.values(this.attendanceState[studentId]).forEach(day => {
            if(day.type === 'present') present++;
            if(day.type === 'absent') absent++;
        });
        return { present, absent };
    }

    renderGrid() {
        const trHeaders = this.container.querySelector('#agDateHeaders');
        const tbody = this.container.querySelector('#agGridBody');
        
        trHeaders.innerHTML = '<th>Student Name</th>';
        
        if (this.students.length === 0 || this.sessions.length === 0) {
            tbody.innerHTML = '<tr><td class="ag-empty-state" colspan="100%">No data loaded.</td></tr>';
            return;
        }

        // Render Date Headers
        this.sessions.forEach(sess => {
            const dateKey = sess.date.split('T')[0];
            const dateObj = new Date(dateKey);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const parts = dateStr.split(', ');
            
            const th = document.createElement('th');
            th.innerHTML = `
                <div>${parts[0]}<br>${parts[1]}</div>
                <button class="ag-cancel-day-btn" data-date="${dateKey}">Cancel Day</button>
            `;
            trHeaders.appendChild(th);
        });

        // Append Sticky Totals Headers
        const thTotalP = document.createElement('th');
        thTotalP.innerText = 'Σ ✔';
        thTotalP.className = 'ag-sticky-right-1';
        
        const thTotalA = document.createElement('th');
        thTotalA.innerText = 'Σ ✘';
        thTotalA.className = 'ag-sticky-right-2';

        trHeaders.appendChild(thTotalP);
        trHeaders.appendChild(thTotalA);

        // Render Students
        tbody.innerHTML = '';
        this.students.forEach(student => {
            const tr = document.createElement('tr');
            
            const tdName = document.createElement('td');
            tdName.innerText = `${student.first_name} ${student.last_name || ''}`.trim();
            tr.appendChild(tdName);

            this.sessions.forEach(sess => {
                const dateKey = sess.date.split('T')[0];
                const dayState = this.attendanceState[student.id][dateKey];

                const td = document.createElement('td');
                const btn = document.createElement('button');
                btn.className = `ag-toggle-btn ${dayState.class}`;
                btn.innerText = dayState.icon;
                
                // Click handler
                btn.addEventListener('click', () => {
                    if (!this.isEditMode) return;
                    
                    let currentState = this.attendanceState[student.id][dateKey];
                    // Cycle logic: Empty -> Present -> Absent -> Canceled -> Empty (Null)
                    let nextState;
                    if(currentState.type === 'empty') nextState = this.stateTypes.find(s => s.type === 'present');
                    else if(currentState.type === 'present') nextState = this.stateTypes.find(s => s.type === 'absent');
                    else if(currentState.type === 'absent') nextState = this.stateTypes.find(s => s.type === 'canceled');
                    else nextState = this.stateTypes.find(s => s.type === 'empty');
                    
                    const applyChange = () => {
                        this.attendanceState[student.id][dateKey] = nextState;
                        btn.className = `ag-toggle-btn ${nextState.class}`;
                        btn.innerText = nextState.icon;
                        this.updateTotalsUI(student.id, tr);
                    };

                    if (this.role === 'admin') {
                        this.showModal(
                            "Confirm Status Change", 
                            `Change attendance status for <strong>${student.first_name}</strong> on <strong>${dateKey}</strong> to <strong>${nextState.label}</strong>?`, 
                            applyChange
                        );
                    } else {
                        applyChange(); // Instant toggle for teachers
                    }
                });

                td.appendChild(btn);
                tr.appendChild(td);
            });

            // Sticky Totals
            const totals = this.calculateTotals(student.id);
            const tdTotalP = document.createElement('td');
            tdTotalP.className = 'ag-sticky-right-1 ag-total-present-cell';
            tdTotalP.innerText = totals.present;
            
            const tdTotalA = document.createElement('td');
            tdTotalA.className = 'ag-sticky-right-2 ag-total-absent-cell';
            tdTotalA.innerText = totals.absent;

            tr.appendChild(tdTotalP);
            tr.appendChild(tdTotalA);
            
            tbody.appendChild(tr);
        });

        // Cancel Day Events
        this.container.querySelectorAll('.ag-cancel-day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isEditMode) return;
                const dateKey = e.target.dataset.date;
                
                this.showModal(
                    "Cancel Entire Class", 
                    `Are you sure you want to mark the entire class as <strong>Canceled</strong> for ${dateKey}?<br><br>This will update all ${this.students.length} students simultaneously.`, 
                    () => {
                        // Update students
                        const canceledState = this.stateTypes.find(s => s.type === 'canceled');
                        this.students.forEach(s => {
                            this.attendanceState[s.id][dateKey] = canceledState;
                        });

                        // Update session
                        const session = this.sessions.find(s => s.date.startsWith(dateKey));
                        if (session) {
                            session.status = 'canceled';
                        } else {
                            this.sessions.push({ id: null, date: dateKey + 'T00:00:00.000Z', status: 'canceled' });
                        }
                        
                        // Track session update
                        const existingUpdate = this.sessionUpdates.find(s => s.date === dateKey);
                        if (existingUpdate) {
                            existingUpdate.status = 'canceled';
                        } else {
                            this.sessionUpdates.push({ date: dateKey, status: 'canceled' });
                        }

                        this.renderGrid();
                    }
                );
            });
        });
    }

    updateTotalsUI(studentId, trElement) {
        const totals = this.calculateTotals(studentId);
        trElement.querySelector('.ag-total-present-cell').innerText = totals.present;
        trElement.querySelector('.ag-total-absent-cell').innerText = totals.absent;
    }

    async saveChanges() {
        if (!this.onSaveCallback) {
            this.disableEditMode();
            return;
        }

        const payload = this.getSavePayload();
        
        this.disableEditMode();
        
        await this.onSaveCallback(payload);
        
        // Apply to original state to represent saved reality
        this.students.forEach(s => {
            this.sessions.forEach(sess => {
                const dateKey = sess.date.split('T')[0];
                this.originalState[s.id][dateKey] = { ...this.attendanceState[s.id][dateKey] };
            });
        });
        this.sessionUpdates = [];
    }

    getSavePayload() {
        const records = [];
        const deletedRecords = [];
        const implicitSessions = new Set(); // Track dates where attendance is actively marked

        this.students.forEach(s => {
            this.sessions.forEach(sess => {
                const dateKey = sess.date.split('T')[0];
                const original = this.originalState[s.id]?.[dateKey];
                const current = this.attendanceState[s.id]?.[dateKey];
                
                // If a student is marked present or absent, it implies the class was held
                if (current && (current.type === 'present' || current.type === 'absent')) {
                    implicitSessions.add(dateKey);
                }

                if (original && current && original.type !== current.type) {
                    if (current.type === 'empty' || current.type === 'canceled') {
                        deletedRecords.push({ studentId: s.id, date: dateKey });
                    } else {
                        records.push({ studentId: s.id, date: dateKey, status: current.type });
                    }
                }
            });
        });

        // Auto-mark sessions as 'held' if students were marked, assuming the session isn't explicitly updated
        implicitSessions.forEach(dateKey => {
            const existingUpdate = this.sessionUpdates.find(s => s.date === dateKey);
            if (!existingUpdate) {
                this.sessionUpdates.push({ date: dateKey, status: 'held' });
            }
        });

        return {
            records,
            deletedRecords,
            sessionUpdates: this.sessionUpdates
        };
    }

    showLoading() {
        const overlay = this.container.querySelector('#agLoadingOverlay');
        if (overlay) overlay.classList.add('active');
    }

    hideLoading() {
        const overlay = this.container.querySelector('#agLoadingOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    clearGrid() {
        this.students = [];
        this.sessions = [];
        this.attendanceState = {};
        this.originalState = {};
        this.renderGrid();
    }

    hasUnsavedChanges() {
        if (!this.isEditMode) return false;
        if (this.sessionUpdates.length > 0) return true;

        const records = [];
        const deletedRecords = [];
        this.students.forEach(s => {
            this.sessions.forEach(sess => {
                const dateKey = sess.date.split('T')[0];
                const original = this.originalState[s.id]?.[dateKey];
                const current = this.attendanceState[s.id]?.[dateKey];
                if (original && current && original.type !== current.type) {
                    if (current.type === 'empty') deletedRecords.push({ studentId: s.id, date: dateKey });
                    else records.push({ studentId: s.id, date: dateKey, status: current.type });
                }
            });
        });
        return records.length > 0 || deletedRecords.length > 0;
    }
}
