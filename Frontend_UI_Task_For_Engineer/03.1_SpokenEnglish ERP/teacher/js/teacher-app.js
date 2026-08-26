let tacticalGridInstance = null;
let currentMatrixAbort = null;

document.addEventListener('alpine:init', () => {
    Alpine.data('teacherApp', () => ({
        // User State
        teacherName: 'Loading...',
        viewMode: 'analytics',
        isImpersonation: false,
        isLightMode: false,
        
        // Anti-Rigidity State
        selectedDate: new Date().toISOString().split('T')[0],
        selectedClass: 'class_1',
        isSavingAttendance: false,
        classStatus: null, // null (unconfirmed), 'held', 'canceled'

        // Analytics State
        attendanceChart: null,
        sttChart: null,
        
        // Mock Classes (Context)
        classes: [
            { id: 'class_1', name: 'Level 2 - Group A', time: 'Mon/Wed 4:00 PM' },
            { id: 'class_2', name: 'Level 2 - Group B', time: 'Mon/Wed 6:00 PM' },
            { id: 'class_3', name: 'Level 3 - Group A', time: 'Tue/Thu 4:00 PM' }
        ],

        // Mock Students (Action-First: default all present)
        // We simulate a fetch based on selected class
        students: [],
        
        // Auto-save state
        autoSaveTimer: null,
        autoSaveStatus: '', // '', 'saving', 'saved'
        
        // Toast State
        toastVisible: false,
        toastMessage: '',

        // Modals state
        showAddGroupModal: false,
        showAddStudentModal: false,
        
        locations: {
            'الخمس': ['سبل النجاح', 'صرح العلم', 'الفاروق', 'سنابل الغد(الساحل)', 'سنابل الغد (كعام)'],
            'طرابلس': ['سانشاين'],
            'زليتن': ['مجموعة المعرفة']
        },
        
        showContactOptions: false,
        newGroup: { name: '', level: '2', schedule: '', city: '', branch: '', customCity: '', customBranch: '', studyMode: 'offline' },
        newStudent: { firstName: '', middleName: '', lastName: '', email: '', phone: '', countryCode: '+218', customCountryCode: '', hybridPreference: 'in-person' },

        showEditGroupModal: false,
        showEditStudentModal: false,
        editGroupData: { class_id: '', name: '', level: '', schedule: '', city: '', branch: '', customCity: '', customBranch: '', studyMode: 'offline' },
        editStudentData: { student_id: '', firstName: '', middleName: '', lastName: '', email: '', phone: '', countryCode: '+218', customCountryCode: '', hybridPreference: 'in-person' },

        showNotesModal: false,
        notesStudentId: '',
        notesStudentName: '',
        attendanceNotes: '',

        // Mock Database for saved states
        savedRecords: {},

        // Removed push notification state and functions

        // Initialization
        init() {
            // Protect Route
            const token = sessionStorage.getItem('sea_erp_token');
            const role = sessionStorage.getItem('sea_user_role');
            
            if (!token || role !== 'teacher') {
                // If not logged in or not a teacher, kick back to hub or login
                window.location.href = '../launchpad/index.html';
                return;
            }

            // Set mock teacher name
            this.teacherName = sessionStorage.getItem('sea_user_name') || 'Teacher';
            this.isImpersonation = sessionStorage.getItem('sea_is_impersonation') === 'true';
            
            // Load initial roster and locations
            this.loadRoster();
            this.loadLocations();
            
            if (this.viewMode === 'analytics') {
                this.initAnalytics();
            }

            // Watch for class changes to reload roster
            this.$watch('selectedClass', () => {
                this.loadRoster();
                if (this.viewMode === 'matrix') this.loadMatrixData();
            });

            // Watch for date changes to reload roster
            this.$watch('selectedDate', () => {
                this.loadRoster();
                if (this.viewMode === 'matrix') this.loadMatrixData();
            });
            
            this.$watch('viewMode', (newVal) => {
                if (newVal === 'matrix') {
                    this.loadMatrixData();
                } else if (newVal === 'daily') {
                    this.loadRoster();
                } else if (newVal === 'analytics') {
                    this.initAnalytics();
                }
            });

            this.$watch('isLightMode', (newVal) => {
                if (this.viewMode === 'analytics') {
                    this.initAnalytics();
                }
            });

            // Warn user if navigating away while a save is pending
            window.addEventListener('beforeunload', (e) => {
                if (this.autoSaveTimer) {
                    e.preventDefault();
                    e.returnValue = 'You have unsaved attendance changes. Are you sure you want to leave?';
                }
            });
        },

        openNotesModal(student) {
            this.notesStudentId = student.id;
            this.notesStudentName = `${student.firstName} ${student.lastName}`;
            this.attendanceNotes = student.notes || '';
            this.showNotesModal = true;
        },

        initAnalytics() {
            setTimeout(() => {
                const attCtx = document.getElementById('attendanceChart');
                const sttCtx = document.getElementById('sttChart');

                if (!attCtx || !sttCtx) return;

                if (this.attendanceChart) this.attendanceChart.destroy();
                if (this.sttChart) this.sttChart.destroy();

                const dates = Array.from({length: 7}, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i) * 2);
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                });
                
                const totalStudents = this.students.length || 15;
                const attendanceData = dates.map(() => Math.floor(totalStudents * (0.6 + Math.random() * 0.4)));

                const gridColor = this.isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 243, 255, 0.1)';
                const textColor = this.isLightMode ? '#64748b' : '#8b9bb4';
                const primaryColor = this.isLightMode ? '#3b82f6' : '#00f3ff';
                const secondaryColor = this.isLightMode ? '#ec4899' : '#b100e8';

                let gradientAtt = attCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
                if (this.isLightMode) {
                    gradientAtt.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
                    gradientAtt.addColorStop(1, 'rgba(236, 72, 153, 0.05)');
                } else {
                    gradientAtt.addColorStop(0, 'rgba(0, 243, 255, 0.5)');
                    gradientAtt.addColorStop(1, 'rgba(177, 0, 232, 0.05)');
                }

                this.attendanceChart = new Chart(attCtx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Present Students',
                            data: attendanceData,
                            borderColor: primaryColor,
                            backgroundColor: gradientAtt,
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: secondaryColor,
                            pointBorderColor: primaryColor,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { 
                            y: { 
                                beginAtZero: true, 
                                max: totalStudents + 2,
                                grid: { color: gridColor },
                                ticks: { color: textColor }
                            },
                            x: {
                                grid: { color: gridColor },
                                ticks: { color: textColor }
                            }
                        }
                    }
                });

                this.sttChart = new Chart(sttCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Student Talking', 'Teacher Talking', 'Activities'],
                        datasets: [{
                            data: [65, 25, 10],
                            backgroundColor: this.isLightMode ? ['#3b82f6', '#ec4899', '#8b5cf6'] : ['#00f3ff', '#ff007f', '#b100e8'],
                            borderColor: this.isLightMode ? '#ffffff' : '#0a0b10',
                            borderWidth: 2,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { 
                            legend: { 
                                position: 'bottom',
                                labels: { color: textColor }
                            } 
                        },
                        cutout: '75%'
                    }
                });
            }, 100);
        },

        async loadLocations() {
            const token = sessionStorage.getItem('sea_erp_token');
            if (!token) return;
            try {
                const res = await fetch(`/.netlify/functions/erp-api?action=get_locations&_t=${Date.now()}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' }
                });
                const data = await res.json();
                if (data.success && data.locations) {
                    // Group locations by city
                    const locMap = {};
                    for (let row of data.locations) {
                        if (!locMap[row.city]) locMap[row.city] = [];
                        if (row.branch && !locMap[row.city].includes(row.branch)) {
                            locMap[row.city].push(row.branch);
                        }
                    }
                    this.locations = locMap;
                }
            } catch (err) {
                console.error("Failed to load locations:", err);
            }
        },

        saveNotes() {
            const student = this.students.find(s => s.id === this.notesStudentId);
            if (student) {
                student.notes = this.attendanceNotes;
            }
            this.showNotesModal = false;
        },

        // Real data fetcher
        async loadRoster() {
            const token = sessionStorage.getItem('sea_erp_token');
            if (!token) return;

            try {
                const res = await fetch(`/.netlify/functions/erp-api?action=get_teacher_dashboard&date=${this.selectedDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                
                if (data.success) {
                    this.classes = data.classes || [];
                    const pendingRequests = data.pendingRequests || [];
                    
                    // Optimistic UI: Merge pending requests
                    pendingRequests.forEach(req => {
                        if (req.action_type === 'add_group') {
                            this.classes.push({
                                id: 'pending-class-' + req.id, // We'll need to know this ID to map students to it
                                name: req.payload.name + ' (Pending)',
                                schedule: req.payload.schedule,
                                study_mode: req.payload.study_mode,
                                isPending: true
                            });
                        }
                    });

                    // If no class is selected yet, or selected class is not in list, pick first
                    if (this.classes.length > 0 && (!this.selectedClass || !this.classes.find(c => c.id === this.selectedClass))) {
                        this.selectedClass = this.classes[0].id;
                    }

                    // Check if class session is already recorded
                    const sessionInfo = (data.classSessions || []).find(s => s.class_id === this.selectedClass && s.date === this.selectedDate);
                    this.classStatus = sessionInfo ? sessionInfo.status : null;

                    // Filter students for the currently selected class
                    let classStudents = (data.students || []).filter(s => s.class_id === this.selectedClass && s.status !== 'inactive');
                    
                    pendingRequests.forEach(req => {
                        if (req.action_type === 'add_student') {
                            // Match class ID, also map pending class IDs if they were just created
                            if (req.payload.class_id === this.selectedClass || 'pending-class-' + req.payload.class_id === this.selectedClass) {
                                classStudents.push({
                                    id: 'pending-' + req.id,
                                    first_name: req.payload.first_name,
                                    middle_name: req.payload.middle_name,
                                    last_name: req.payload.last_name,
                                    class_id: req.payload.class_id,
                                    isPending: true,
                                    pendingAttendance: req.payload.attendance || []
                                });
                            }
                        } else if (req.action_type === 'remove_student') {
                            const sIdx = classStudents.findIndex(s => s.id === req.payload.student_id);
                            if (sIdx >= 0) {
                                classStudents[sIdx].pendingRemoval = true;
                            }
                        } else if (req.action_type === 'edit_student') {
                            const sIdx = classStudents.findIndex(s => s.id === req.payload.student_id);
                            if (sIdx >= 0) {
                                classStudents[sIdx].first_name = req.payload.firstName;
                                classStudents[sIdx].middle_name = req.payload.middleName;
                                classStudents[sIdx].last_name = req.payload.lastName;
                                classStudents[sIdx].email = req.payload.email;
                                classStudents[sIdx].phone = req.payload.phone;
                                classStudents[sIdx].hybrid_preference = req.payload.hybrid_preference;
                                classStudents[sIdx].isPendingEdit = true;
                            }
                        }
                    });
                    
                    // Merge with attendance logs
                    this.students = classStudents.map(student => {
                        let status = null; // Default to null (unmarked)
                        let notes = '';
                        if (student.isPending) {
                            const pLog = student.pendingAttendance.find(a => a.date === this.selectedDate);
                            if (pLog) {
                                status = pLog.status;
                                notes = pLog.notes || '';
                            }
                        } else {
                            const log = data.attendanceLogs.find(l => l.student_id === student.id);
                            if (log) {
                                status = log.status;
                                notes = log.notes || '';
                            }
                        }

                        return {
                            id: student.id,
                            firstName: student.first_name,
                            middleName: student.middle_name || '',
                            lastName: student.last_name,
                            email: student.email || '',
                            phone: student.phone || '',
                            hybridPreference: student.hybrid_preference || 'in-person',
                            status: status, 
                            notes: notes,
                            isPending: student.isPending,
                            isPendingEdit: student.isPendingEdit,
                            pendingRemoval: student.pendingRemoval
                        };
                    });

                    // Auto-infer class status if logs exist but session wasn't properly synced
                    if (!this.classStatus) {
                        // If ANY student has an attendance log, the class MUST have been held or canceled
                        const hasMarks = this.students.some(s => s.status === 'present' || s.status === 'absent' || s.status === 'canceled');
                        if (hasMarks) {
                            this.classStatus = 'held'; 
                            // We do NOT call this.saveAttendance(true) here anymore to prevent race conditions. 
                            // The UI will simply unlock.
                        }
                    }
                } else {
                    console.error("Failed to load roster:", data.error);
                }
            } catch (err) {
                console.error("Error loading roster:", err);
            }
        },

        async loadMatrixData() {
            const token = sessionStorage.getItem('sea_erp_token');
            if (!token || !this.selectedClass) return;

            if (currentMatrixAbort) {
                currentMatrixAbort.abort();
            }
            currentMatrixAbort = new AbortController();
            const signal = currentMatrixAbort.signal;

            const gridContainer = document.getElementById('tactical-grid-container');
            if (tacticalGridInstance && document.getElementById('agGridContainer')) {
                tacticalGridInstance.showLoading();
            } else if (gridContainer) {
                tacticalGridInstance = null; // Force recreation since DOM is being overwritten
                gridContainer.innerHTML = `<div class="glass-card" style="text-align: center; padding: 40px; color: var(--text-muted);"><div class="ag-spinner" style="margin: 0 auto 20px auto; width: 40px; height: 40px; border: 4px solid rgba(48,69,135,0.2); border-left-color: var(--primary-blue, #304587); border-radius: 50%; animation: ag-spin 1s linear infinite;"></div>Loading Matrix...</div>`;
            }

            const d = new Date(this.selectedDate);
            const endD = new Date(d);
            const endDate = endD.toISOString().split('T')[0];
            const startD = new Date(d);
            startD.setDate(startD.getDate() - 6); // Look back 6 days (7 days total)
            const startDate = startD.toISOString().split('T')[0];

            let data;
            try {
                const res = await fetch('/.netlify/functions/erp-api', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'GET_ATTENDANCE_MATRIX',
                        classId: this.selectedClass,
                        startDate: startDate,
                        endDate: endDate
                    }),
                    signal
                });
                data = await res.json();
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.warn("API not available, falling back to mock data for UI testing.", err);
                data = {
                    success: true,
                    students: this.students && this.students.length > 0 ? this.students : [
                        { id: '1', firstName: 'John', lastName: 'Doe', hybridPreference: 'in-person' },
                        { id: '2', firstName: 'Jane', lastName: 'Smith', hybridPreference: 'remote' }
                    ],
                    sessions: [
                        { id: 's1', date: startDate + 'T00:00:00.000Z', status: 'held' }
                    ],
                    logs: []
                };
            }
            
            if (data && data.success) {
                    // Generate all dates in the selected range to ensure the grid always has columns
                    const allDates = [];
                    let [sYear, sMonth, sDay] = startDate.split('-');
                    let [eYear, eMonth, eDay] = endDate.split('-');
                    let currD = new Date(Date.UTC(sYear, sMonth - 1, sDay));
                    const endD = new Date(Date.UTC(eYear, eMonth - 1, eDay));
                    
                    const localNow = new Date();
                    const todayUTC = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate()));
                    const effectiveEndD = endD > todayUTC ? todayUTC : endD;
                    
                    while (currD <= effectiveEndD) {
                        allDates.push(currD.toISOString().split('T')[0]);
                        currD.setUTCDate(currD.getUTCDate() + 1);
                    }

                    // Merge API sessions with continuous dates
                    const apiSessions = data.sessions || [];
                    const mergedSessions = allDates.map(dateStr => {
                        const existing = apiSessions.find(s => s.date.startsWith(dateStr));
                        if (existing) return existing;
                        // Provide a mock session object for the grid to render
                        return { id: null, date: dateStr + 'T00:00:00.000Z', status: 'pending' };
                    });

                    if (!tacticalGridInstance) {
                        gridContainer.innerHTML = '';
                        tacticalGridInstance = new AttendanceGrid({
                            containerId: 'tactical-grid-container',
                            role: 'teacher',
                            onSave: async ({ records, deletedRecords, sessionUpdates }) => {
                                try {
                                    const saveRes = await fetch('/.netlify/functions/erp-api', {
                                        method: 'POST',
                                        headers: { 
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            action: 'UPSERT_ATTENDANCE_MATRIX',
                                            classId: this.selectedClass,
                                            records: records,
                                            deletedRecords: deletedRecords,
                                            sessions: sessionUpdates
                                        })
                                    });
                                    const saveData = await saveRes.json();
                                    if (!saveData.success) {
                                        throw new Error(saveData.error || 'Failed to save');
                                    }
                                    
                                    this.toastMessage = 'Matrix saved successfully!';
                                    this.toastVisible = true;
                                    setTimeout(() => this.toastVisible = false, 3000);
                                    
                                    this.autoSaveStatus = 'saved';
                                    setTimeout(() => { if (this.autoSaveStatus === 'saved') this.autoSaveStatus = ''; }, 3000);
                                    
                                    this.loadRoster();
                                } catch (err) {
                                    console.error('Matrix save error:', err);
                                    alert('Failed to save matrix updates: ' + err.message);
                                    throw err;
                                }
                            }
                        });
                    }

                    if (tacticalGridInstance) {
                        tacticalGridInstance.disableEditMode(false); 
                        tacticalGridInstance.loadData(data.students, mergedSessions, data.logs);
                        tacticalGridInstance.hideLoading();
                    }
                } else {
                    if (gridContainer) gridContainer.innerHTML = `<div style="padding: 20px; color: var(--danger); text-align: center;">Error loading matrix: ${data.error}</div>`;
                }

        },

        // Toggle student attendance status
        toggleStatus(studentId) {
            if (this.classStatus !== 'held') return; // Only toggle if class was held
            
            const student = this.students.find(s => s.id === studentId);
            if (student) {
                // Toggle logic: null -> present -> absent -> present
                if (student.status === null || student.status === undefined) {
                    student.status = 'present';
                } else if (student.status === 'present') {
                    student.status = 'absent';
                } else {
                    student.status = 'present';
                }
                this.triggerAutoSave();
            }
        },

        markAllPresent() {
            if (this.classStatus !== 'held') return;
            this.students.forEach(s => {
                if (s.status === null || s.status === undefined) {
                    s.status = 'present';
                }
            });
            this.triggerAutoSave();
        },

        triggerAutoSave() {
            this.autoSaveStatus = 'saving';
            if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => {
                this.saveAttendance(true); // true = silent save
            }, 3000); // 3-second debounce
        },

        setClassStatus(status) {
            this.classStatus = status;
            this.saveAttendance(true); // Instantly save status
        },

        async undoCancel() {
            this.classStatus = 'unmarked';
            await this.saveAttendance(true);
            this.classStatus = null; // Revert to null for UI to show confirm bar
        },

        exportCSV() {
            if (!tacticalGridInstance || !tacticalGridInstance.students.length) {
                alert("No data to export.");
                return;
            }
            let csvContent = "data:text/csv;charset=utf-8,";
            let header = ["Student Name"];
            tacticalGridInstance.sessions.forEach(s => header.push(s.date.split('T')[0]));
            header.push("Present", "Absent");
            csvContent += header.join(",") + "\r\n";
            
            tacticalGridInstance.students.forEach(student => {
                const firstName = student.first_name || student.firstName || 'Student';
                const lastName = student.last_name || student.lastName || '';
                let row = [`"${firstName} ${lastName}".trim()`];
                tacticalGridInstance.sessions.forEach(sess => {
                    const dateKey = sess.date.split('T')[0];
                    const dayState = tacticalGridInstance.attendanceState[student.id][dateKey];
                    row.push(dayState.label);
                });
                let totals = tacticalGridInstance.calculateTotals(student.id);
                row.push(totals.present, totals.absent);
                csvContent += row.join(",") + "\r\n";
            });
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        exportPDF() {
            if (!tacticalGridInstance || !tacticalGridInstance.students.length) {
                alert("No data to export.");
                return;
            }
            const element = document.getElementById('tactical-grid-container');
            const opt = {
              margin:       0.5,
              filename:     `attendance_export_${new Date().toISOString().split('T')[0]}.pdf`,
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true },
              jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
            };
            
            if (window.html2pdf) {
                element.classList.remove('locked'); // Temporarily unlock to ensure styles are clean
                window.html2pdf().set(opt).from(element).save().then(() => {
                    if (!tacticalGridInstance.isEditMode) element.classList.add('locked');
                });
            } else {
                alert("PDF export library failed to load.");
            }
        },

        // Compute summary for the action bar
        get summary() {
            const total = this.students.length;
            const present = this.students.filter(s => s.status === 'present').length;
            return `${present} / ${total} Present`;
        },

        // Save logic
        async saveAttendance(isSilent = false) {
            if (this.isSavingAttendance) return;
            
            // Prevent future dates (Security Constraint)
            // Use local timezone offset to avoid "day-shift" bugs
            const localNow = new Date();
            const today = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            if (this.selectedDate > today) {
                if (!isSilent) this.showToast('Error: Cannot log attendance for future dates.', true);
                this.autoSaveStatus = '';
                return;
            }

            const token = sessionStorage.getItem('sea_erp_token');
            if (!token) return;

            this.isSavingAttendance = true;

            const attendancePayload = this.students
                .filter(s => s.status !== null) // Only send explicitly marked students
                .map(s => ({
                    id: s.id,
                    status: s.status,
                    notes: s.notes || null
                }));

            try {
                const res = await fetch('/.netlify/functions/erp-api?action=save_attendance', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        classId: this.selectedClass,
                        date: this.selectedDate,
                        classStatus: this.classStatus,
                        attendance: attendancePayload
                    }),
                    keepalive: true
                });
                const data = await res.json();
                
                if (data.success) {
                    if (!isSilent) this.showToast('Attendance successfully recorded!');
                    this.autoSaveStatus = 'saved';
                    setTimeout(() => { if (this.autoSaveStatus === 'saved') this.autoSaveStatus = ''; }, 3000);
                } else {
                    if (!isSilent) this.showToast('Failed to save: ' + (data.error || 'Unknown error'), true);
                    this.autoSaveStatus = '';
                }
            } catch (err) {
                if (!isSilent) this.showToast('Network error while saving.', true);
                this.autoSaveStatus = '';
            } finally {
                this.isSavingAttendance = false;
            }
        },

        // Toast logic
        showToast(msg, isError = false) {
            this.toastMessage = msg;
            this.toastVisible = true;
            
            // Auto hide
            setTimeout(() => {
                this.toastVisible = false;
            }, 3000);
        },

        async submitRequest(actionType, payload) {
            const token = sessionStorage.getItem('sea_erp_token');
            if (!token) return;

            try {
                const res = await fetch('/.netlify/functions/erp-api?action=submit_pending_request', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ actionType, payload })
                });
                const data = await res.json();
                
                if (data.success) {
                    this.showToast('Request submitted for approval.');
                    this.loadRoster(); // Reload to see optimistic UI
                    if (actionType === 'add_group' || actionType === 'edit_class') {
                        this.loadLocations(); // Refresh locations to immediately show new custom cities/branches
                    }
                } else {
                    this.showToast('Error: ' + (data.error || 'Unknown error'), true);
                }
            } catch (err) {
                this.showToast('Network error while submitting request.', true);
            }
        },

        addGroup() {
            Logger.trace('addGroup workflow initiated', this.newGroup);

            if (!this.newGroup.name || !this.newGroup.schedule) {
                Logger.error('addGroup validation failed', 'Missing group info');
                this.showToast('Error: Missing group info', true);
                return;
            }
            if (this.newGroup.studyMode !== 'online') {
                if (this.newGroup.city === 'other' && (!this.newGroup.customCity || !this.newGroup.customBranch)) {
                    Logger.error('addGroup validation failed', 'Missing custom city and branch for offline group');
                    this.showToast('Error: Please specify both custom city and branch', true);
                    return;
                }
                if (this.newGroup.branch === 'other' && !this.newGroup.customBranch) {
                    Logger.error('addGroup validation failed', 'Missing custom branch for offline group');
                    this.showToast('Error: Please specify the custom branch', true);
                    return;
                }
            }

            const finalCity = this.newGroup.city === 'other' ? this.newGroup.customCity : this.newGroup.city;
            const finalBranch = (this.newGroup.branch === 'other' || this.newGroup.city === 'other') ? this.newGroup.customBranch : this.newGroup.branch;

            const payload = {
                name: this.newGroup.name,
                level: this.newGroup.level,
                schedule: this.newGroup.schedule,
                city: finalCity,
                branch: finalBranch,
                study_mode: this.newGroup.studyMode
            };

            Logger.success('addGroup validation passed, submitting request', payload);

            this.submitRequest('add_group', payload);
            this.showAddGroupModal = false;
            // Reset
            this.newGroup = { name: '', level: '2', schedule: '', city: '', branch: '', customCity: '', customBranch: '', studyMode: 'offline' };
        },

        addStudent() {
            if (!this.newStudent.firstName || !this.newStudent.lastName) {
                this.showToast('Error: Missing student name', true);
                return;
            }

            // Format phone to E.164
            let formattedPhone = '';
            if (this.newStudent.phone) {
                const code = this.newStudent.countryCode === 'other' ? this.newStudent.customCountryCode : this.newStudent.countryCode;
                formattedPhone = code + this.newStudent.phone.replace(/\D/g, '');
            }

            this.submitRequest('add_student', { 
                first_name: this.newStudent.firstName, 
                middle_name: this.newStudent.middleName,
                last_name: this.newStudent.lastName,
                email: this.newStudent.email,
                phone: formattedPhone,
                hybrid_preference: this.newStudent.hybridPreference,
                class_id: this.selectedClass
            });
            this.showAddStudentModal = false;
            this.showContactOptions = false;
            this.newStudent = { firstName: '', middleName: '', lastName: '', email: '', phone: '', countryCode: '+218', customCountryCode: '', hybridPreference: 'in-person' };
        },

        removeStudent(student) {
            if (confirm(`Are you sure you want to request removal for ${student.firstName} ${student.lastName}?`)) {
                this.submitRequest('remove_student', { 
                    student_id: student.id,
                    first_name: student.firstName,
                    last_name: student.lastName
                });
            }
        },

        openEditGroupModal() {
            const cls = this.classes.find(c => c.id === this.selectedClass);
            if (cls) {
                Logger.trace('openEditGroupModal workflow initiated', { cls: cls });
                // remove ' (Level X)' from name string to edit original name
                let name = cls.name;
                const levelMatch = name.match(/ \(Level (.*?)\)/);
                let level = '2';
                if (levelMatch) {
                    level = levelMatch[1];
                    name = name.replace(levelMatch[0], '');
                }
                
                let city = cls.city || '';
                let branch = cls.branch || '';
                let customCity = '';
                let customBranch = '';
                
                if (city && !Object.keys(this.locations).includes(city)) {
                    customCity = city;
                    city = 'other';
                }
                
                if (branch && city !== 'other' && (!this.locations[city] || !this.locations[city].includes(branch))) {
                    customBranch = branch;
                    branch = 'other';
                }
                
                if (city === 'other') {
                    customBranch = cls.branch || ''; 
                    branch = 'other'; 
                }

                this.editGroupData = {
                    class_id: cls.id,
                    name: name,
                    level: level,
                    schedule: cls.schedule || '',
                    city: city,
                    branch: branch,
                    customCity: customCity,
                    customBranch: customBranch,
                    studyMode: cls.study_mode || 'offline'
                };
                Logger.success('openEditGroupModal state bound successfully', { editGroupData: this.editGroupData });
                this.showEditGroupModal = true;
            } else {
                Logger.error('openEditGroupModal failed', 'Selected class not found in classes array', { selectedClass: this.selectedClass });
            }
        },

        submitEditGroup() {
            if (this.editGroupData.studyMode !== 'online') {
                if (this.editGroupData.city === 'other' && (!this.editGroupData.customCity || !this.editGroupData.customBranch)) {
                    this.showToast('Error: Please specify both custom city and branch', true);
                    return;
                }
                if (this.editGroupData.branch === 'other' && !this.editGroupData.customBranch) {
                    this.showToast('Error: Please specify the custom branch', true);
                    return;
                }
            }

            const payload = {
                class_id: this.editGroupData.class_id,
                name: this.editGroupData.name,
                level: this.editGroupData.level,
                schedule: this.editGroupData.schedule,
                study_mode: this.editGroupData.studyMode
            };

            const finalCity = this.editGroupData.city === 'other' ? this.editGroupData.customCity : this.editGroupData.city;
            const finalBranch = (this.editGroupData.branch === 'other' || this.editGroupData.city === 'other') ? this.editGroupData.customBranch : this.editGroupData.branch;

            if (finalCity && finalBranch) {
                payload.city = finalCity;
                payload.branch = finalBranch;
            }

            this.submitRequest('edit_class', payload);
            this.showEditGroupModal = false;
        },

        openEditStudentModal(student) {
            Logger.trace('openEditStudentModal workflow initiated', { student: student });
            // Parse E.164 phone to separate code and number
            let code = '+218';
            let number = '';
            let customCode = '';
            
            if (student.phone) {
                const commonCodes = ['+218', '+20', '+971', '+966'];
                let foundCode = commonCodes.find(c => student.phone.startsWith(c));
                if (foundCode) {
                    code = foundCode;
                    number = student.phone.substring(code.length);
                } else {
                    code = 'other';
                    const match = student.phone.match(/^(\+\d{1,4})(.*)$/);
                    if (match) {
                        customCode = match[1];
                        number = match[2];
                    } else {
                        number = student.phone; // Fallback
                    }
                }
            }

            this.editStudentData = {
                student_id: student.id,
                firstName: student.firstName,
                middleName: student.middleName,
                lastName: student.lastName,
                email: student.email,
                phone: number,
                countryCode: code,
                customCountryCode: customCode,
                hybridPreference: student.hybrid_preference || student.hybridPreference || 'in-person'
            };
            this.showContactOptions = !!(student.email || student.phone);
            Logger.success('openEditStudentModal state bound successfully', { editStudentData: this.editStudentData });
            this.showEditStudentModal = true;
        },

        submitEditStudent() {
            console.log('TELEMETRY (submitEditStudent): triggered', { editStudentData: this.editStudentData });

            if (!this.editStudentData.firstName || !this.editStudentData.lastName) {
                console.error('TELEMETRY (submitEditStudent): validation failed', 'First and Last name are required');
                this.showToast('Error: First and Last name are required', true);
                return;
            }
            
            // Format phone to E.164
            let formattedPhone = '';
            if (this.editStudentData.phone) {
                const code = this.editStudentData.countryCode === 'other' ? this.editStudentData.customCountryCode : this.editStudentData.countryCode;
                formattedPhone = code + this.editStudentData.phone.replace(/\D/g, '');
            }

            const payload = { 
                student_id: this.editStudentData.student_id,
                firstName: this.editStudentData.firstName,
                middleName: this.editStudentData.middleName,
                lastName: this.editStudentData.lastName,
                email: this.editStudentData.email,
                phone: formattedPhone,
                hybrid_preference: this.editStudentData.hybridPreference
            };

            console.log('TELEMETRY (submitEditStudent): dispatching payload to API', payload);

            this.submitRequest('edit_student', payload);
            this.showEditStudentModal = false;
        },

        logout() {
            sessionStorage.removeItem('sea_erp_token');
            sessionStorage.removeItem('sea_erp_role');
            window.location.href = '../launchpad/index.html';
        }
    }));
});
