/**
 * Master Attendance Matrix Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const viewMasterAttendance = document.getElementById('view-master-attendance');
    let isInitialized = false;
    
    // Matrix Data State
    let studentsData = [];
    let classesData = []; // for mapping groups
    
    let currentMatrix = {
        students: [],
        sessions: [],
        logs: []
    };

    let tacticalGridInstance = null;
    let currentAbortController = null;
    let lastTeacher = "";
    let lastGroup = "";
    let lastStart = "";
    let lastEnd = "";

    // UI Elements
    const teacherSelect = document.getElementById('matrix-teacher-select');
    const groupSelect = document.getElementById('matrix-group-select');
    const startDateInput = document.getElementById('matrix-start-date');
    const endDateInput = document.getElementById('matrix-end-date');
    const loadBtn = document.getElementById('load-matrix-btn');
    const exportBtn = document.getElementById('export-master-attendance-btn');

    if (loadBtn) loadBtn.style.display = 'none';
    
    // Metrics
    const metricHeld = document.getElementById('metric-total-held');
    const metricCanceled = document.getElementById('metric-total-canceled');
    const metricAvg = document.getElementById('metric-avg-attendance');
    const metricsContainer = document.getElementById('matrix-summary-metrics');

    // Set Default Dates (Current Month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    if (startDateInput) {
        startDateInput.value = firstDay.toISOString().split('T')[0];
        lastStart = startDateInput.value;
    }
    if (endDateInput) {
        endDateInput.value = lastDay.toISOString().split('T')[0];
        lastEnd = endDateInput.value;
    }

    function checkUnsavedChangesAsync(onProceed) {
        if (tacticalGridInstance && tacticalGridInstance.hasUnsavedChanges()) {
            tacticalGridInstance.showModal(
                "Unsaved Changes",
                "You have unsaved changes. Changing filters will discard them. Do you want to discard your changes?",
                () => {
                    tacticalGridInstance.disableEditMode(true); // discard
                    onProceed();
                }
            );
        } else {
            onProceed();
        }
    }

    // Detect when the view becomes active
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (!mutation.target.classList.contains('hidden') && mutation.target.id === 'view-master-attendance') {
                    if (!isInitialized) {
                        initMatrixDashboard();
                    }
                }
            }
        });
    });

    if (viewMasterAttendance) {
        observer.observe(viewMasterAttendance, { attributes: true });
    }

    async function initMatrixDashboard() {
        try {
            isInitialized = true;
            // First, load metadata (teachers & classes)
            const token = sessionStorage.getItem('sea_erp_token');
            const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';

            const res = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: { 
                    'x-admin-key': token,
                    'x-device-id': deviceId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'GET_MASTER_STUDENT_LIST' })
            });
            const data = await res.json();
            
            if (data.success) {
                studentsData = data.students || [];
                classesData = data.classes || [];
                populateTeacherDropdown();
            } else {
                alert("Failed to load metadata: " + data.error);
            }
        } catch (error) {
            console.error("Error init matrix dashboard:", error);
            alert("Network error loading dashboard.");
        }
    }

    function populateTeacherDropdown() {
        const teachers = [...new Set(studentsData.map(s => s.teacher_name).filter(Boolean))].sort();
        
        teacherSelect.innerHTML = `<option value="">-- Select Teacher --</option>`;
        teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            teacherSelect.appendChild(opt);
        });

        teacherSelect.addEventListener('change', () => {
            const newValue = teacherSelect.value;
            teacherSelect.value = lastTeacher;
            
            checkUnsavedChangesAsync(() => {
                lastTeacher = newValue;
                teacherSelect.value = newValue;
                populateGroupDropdown(teacherSelect.value);
                
                if (tacticalGridInstance) {
                    tacticalGridInstance.clearGrid();
                } else {
                    const gridContainer = document.getElementById('tactical-grid-container');
                    if (gridContainer) gridContainer.innerHTML = '';
                }
                metricsContainer.style.display = 'none';
            });
        });
    }

    function populateGroupDropdown(teacherName) {
        groupSelect.innerHTML = `<option value="">-- Select Group --</option>`;
        
        if (!teacherName) {
            groupSelect.disabled = true;
            loadBtn.disabled = true;
            return;
        }

        const filteredGroups = [...new Set(
            studentsData
                .filter(s => s.teacher_name === teacherName)
                .map(s => JSON.stringify({ id: s.class_id, name: s.class_name }))
                .filter(s => s !== "{}")
        )].map(s => JSON.parse(s)).sort((a,b) => a.name.localeCompare(b.name));

        filteredGroups.forEach(g => {
            if (!g.id || !g.name) return;
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            groupSelect.appendChild(opt);
        });

        groupSelect.disabled = false;
        
        groupSelect.addEventListener('change', () => {
            const newValue = groupSelect.value;
            groupSelect.value = lastGroup;
            
            checkUnsavedChangesAsync(() => {
                lastGroup = newValue;
                groupSelect.value = newValue;
                
                if (groupSelect.value) {
                    loadMatrixData();
                } else {
                    if (tacticalGridInstance) tacticalGridInstance.clearGrid();
                    metricsContainer.style.display = 'none';
                }
            });
        });
    }

    if (startDateInput) {
        startDateInput.addEventListener('change', () => {
            const newValue = startDateInput.value;
            startDateInput.value = lastStart;
            
            checkUnsavedChangesAsync(() => {
                lastStart = newValue;
                startDateInput.value = newValue;
                if (groupSelect.value) loadMatrixData();
            });
        });
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', () => {
            const newValue = endDateInput.value;
            endDateInput.value = lastEnd;
            
            checkUnsavedChangesAsync(() => {
                lastEnd = newValue;
                endDateInput.value = newValue;
                if (groupSelect.value) loadMatrixData();
            });
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', loadMatrixData);
    }
    const refreshBtn = document.getElementById('refresh-master-attendance-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadMatrixData);
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', exportMatrixCSV);
    }
    
    // Global Edit Toggle
    const masterEditToggle = document.getElementById('master-attendance-edit-toggle');
    if (masterEditToggle) {
        masterEditToggle.addEventListener('change', (e) => {
            if (!tacticalGridInstance) {
                e.target.checked = false;
                alert("Please load a matrix first.");
                return;
            }
            if (e.target.checked) {
                tacticalGridInstance.enableEditMode(true);
            } else {
                if (tacticalGridInstance.hasUnsavedChanges()) {
                    e.target.checked = true; // revert toggle visually
                    tacticalGridInstance.showModal(
                        "Discard Changes",
                        "You have unsaved changes. Discard them to exit edit mode?",
                        () => {
                            tacticalGridInstance.disableEditMode(true);
                            e.target.checked = false;
                        }
                    );
                } else {
                    tacticalGridInstance.disableEditMode(false);
                }
            }
        });
    }

    // Listen for grid's edit mode changes
    const gridContainer = document.getElementById('tactical-grid-container');
    if (gridContainer) {
        gridContainer.addEventListener('editModeChanged', (e) => {
            if (masterEditToggle) {
                masterEditToggle.checked = e.detail.isEditMode;
            }
        });
    }

    async function loadMatrixData() {
        const classId = groupSelect.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!classId || !startDate || !endDate) return;

        if (currentAbortController) {
            currentAbortController.abort();
        }
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        const gridContainer = document.getElementById('tactical-grid-container');
        if (tacticalGridInstance && document.getElementById('agGridContainer')) {
            tacticalGridInstance.showLoading();
        } else if (gridContainer) {
            gridContainer.innerHTML = `<div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);"><div class="ag-spinner" style="margin: 0 auto 20px auto; width: 40px; height: 40px; border: 4px solid rgba(48,69,135,0.2); border-left-color: var(--primary-blue, #304587); border-radius: 50%; animation: ag-spin 1s linear infinite;"></div>Loading Matrix...</div>`;
        }
        exportBtn.disabled = true;

        try {
            const token = sessionStorage.getItem('sea_erp_token');
            const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';

            const res = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: { 
                    'x-admin-key': token,
                    'x-device-id': deviceId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'GET_ATTENDANCE_MATRIX',
                    payload: { classId, startDate, endDate }
                }),
                signal
            });
            const data = await res.json();
            
            if (data.success) {
                // Generate all dates in the selected range to ensure the grid always has columns
                const allDates = [];
                let [sYear, sMonth, sDay] = startDate.split('-');
                let [eYear, eMonth, eDay] = endDate.split('-');
                let d = new Date(Date.UTC(sYear, sMonth - 1, sDay));
                const endD = new Date(Date.UTC(eYear, eMonth - 1, eDay));
                
                const localNow = new Date();
                const todayUTC = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate()));
                const effectiveEndD = endD > todayUTC ? todayUTC : endD;
                
                while (d <= effectiveEndD) {
                    allDates.push(d.toISOString().split('T')[0]);
                    d.setUTCDate(d.getUTCDate() + 1);
                }

                // Merge API sessions with continuous dates
                const apiSessions = data.sessions || [];
                const mergedSessions = allDates.map(dateStr => {
                    const existing = apiSessions.find(s => s.date.startsWith(dateStr));
                    if (existing) return existing;
                    // Provide a mock session object for the grid to render
                    return { id: null, date: dateStr + 'T00:00:00.000Z', status: 'pending' };
                });

                currentMatrix = {
                    students: data.students || [],
                    sessions: mergedSessions,
                    logs: data.logs || []
                };
                renderMatrix();
                if (tacticalGridInstance && document.getElementById('agGridContainer')) tacticalGridInstance.hideLoading();
                exportBtn.disabled = false;
            } else {
                if (tacticalGridInstance && document.getElementById('agGridContainer')) tacticalGridInstance.hideLoading();
                else if (gridContainer) gridContainer.innerHTML = `<div class="glass-card" style="text-align:center; padding: 40px; color: var(--brand-red);">Error: ${data.error}</div>`;
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error("Error loading matrix:", error);
            if (tacticalGridInstance && document.getElementById('agGridContainer')) tacticalGridInstance.hideLoading();
            else if (gridContainer) gridContainer.innerHTML = `<div class="glass-card" style="text-align:center; padding: 40px; color: var(--brand-red);">Network error loading matrix data.</div>`;
        }
    }

    function renderMatrix() {
        const { students, sessions, logs } = currentMatrix;

        // Metrics Computation
        const totalHeld = sessions.filter(s => s.status === 'held').length;
        const totalCanceled = sessions.filter(s => s.status === 'canceled').length;
        
        metricHeld.textContent = totalHeld;
        metricCanceled.textContent = totalCanceled;
        if (totalCanceled > 0) {
            metricCanceled.style.color = "var(--brand-red)";
            metricCanceled.style.fontWeight = "bold";
        } else {
            metricCanceled.style.color = "";
            metricCanceled.style.fontWeight = "normal";
        }

        if (students.length === 0) {
            document.getElementById('tactical-grid-container').innerHTML = `<div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-muted);">No active students found in this group.</div>`;
            metricsContainer.style.display = 'none';
            return;
        }

        metricsContainer.style.display = 'flex';

        if (!tacticalGridInstance) {
            tacticalGridInstance = new AttendanceGrid({
                containerId: 'tactical-grid-container',
                role: 'admin',
                onSave: async ({ records, deletedRecords }) => {
                    await handleSaveGridChanges(records, deletedRecords);
                }
            });
        }
        
        tacticalGridInstance.loadData(students, sessions, logs);
    }

    async function handleSaveGridChanges(records, deletedRecords) {
        if (records.length === 0 && deletedRecords.length === 0) {
            alert('No changes to save.');
            return;
        }

        try {
            const token = sessionStorage.getItem('sea_erp_token');
            const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';

            const payload = {
                classId: groupSelect.value,
                upserts: records,
                deletes: deletedRecords
            };

            const res = await fetch('/.netlify/functions/scs-admin-api', {
                method: 'POST',
                headers: { 
                    'x-admin-key': token,
                    'x-device-id': deviceId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'UPSERT_ATTENDANCE_MATRIX',
                    payload: payload
                })
            });
            const data = await res.json();
            
            if (data.success) {
                // Refresh matrix data to ensure sync with server
                await loadMatrixData();
                alert('Attendance changes saved successfully!');
                if (masterEditToggle) masterEditToggle.checked = false;
            } else {
                alert('Error saving changes: ' + data.error);
                // Revert grid state by reloading
                await loadMatrixData();
            }
        } catch (err) {
            console.error(err);
            alert('Network error while saving attendance.');
            await loadMatrixData();
        }
    }

    function exportMatrixCSV() {
        if (!currentMatrix.students.length) return;

        const { students, sessions, logs } = currentMatrix;
        
        let headers = ['Student Name', 'Overall Present', 'Total Possible', 'Total Hours'];
        sessions.forEach(session => {
            const dateObj = new Date(session.date);
            headers.push(`${dateObj.getMonth()+1}/${dateObj.getDate()} (${session.status})`);
        });

        let csvRows = [headers.join(',')];

        students.forEach(student => {
            const studentLogs = logs.filter(l => l.student_id === student.id);
            const studentCreatedAtDate = new Date(student.created_at).getTime();

            let presentCount = 0;
            let possibleCount = 0;
            let rowData = [];

            sessions.forEach(session => {
                const sessionTime = new Date(session.date).getTime();
                const isApplicable = (sessionTime >= studentCreatedAtDate) && (session.status === 'held');
                if (isApplicable) possibleCount++;

                const log = studentLogs.find(l => {
                    const lDate = new Date(l.date).toISOString().split('T')[0];
                    const sDate = new Date(session.date).toISOString().split('T')[0];
                    return lDate === sDate;
                });

                if (log) {
                    rowData.push(log.status);
                    if (log.status === 'present' && isApplicable) presentCount++;
                } else {
                    rowData.push(isApplicable ? 'unmarked' : 'N/A');
                }
            });

            const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ').replace(/"/g, '""');
            const totalHours = presentCount * 2;

            const csvRow = [
                `"${fullName}"`,
                presentCount,
                possibleCount,
                totalHours,
                ...rowData
            ];
            
            csvRows.push(csvRow.join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        const groupName = groupSelect.options[groupSelect.selectedIndex].text.replace(/\s+/g, '_');
        link.setAttribute('download', `Matrix_${groupName}_${startDateInput.value}_to_${endDateInput.value}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
