document.addEventListener('alpine:init', () => {
    Alpine.data('studentHubInit', () => ({
        isLoading: false,
        students: [],
        availableClasses: [],
        locations: {},
        
        // Filtering
        filters: {
            search: '',
            city: '',
            branch: '',
            studyMode: '',
            level: '',
            teacher: '',
            group: ''
        },

        // Modal State
        showAddModal: false,
        showEditModal: false,
        showContactOptions: false,
        
        formData: {
            id: '',
            firstName: '',
            middleName: '',
            lastName: '',
            email: '',
            phone: '',
            hybridPreference: 'in-person',
            classId: ''
        },

        async init() {
            // Load students when tab becomes active
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.target.classList.contains('active') && mutation.target.id === 'view-students') {
                        if (this.students.length === 0) {
                            this.loadStudents();
                        }
                    }
                });
            });
            
            const viewStudents = document.getElementById('view-students');
            if (viewStudents) {
                observer.observe(viewStudents, { attributes: true, attributeFilter: ['class'] });
            }
            this.loadLocations();
        },

        async loadStudents() {
            this.isLoading = true;
            const token = sessionStorage.getItem('sea_erp_token');
            const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';
            try {
                // Fetch Master Student List
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
                    this.students = data.students || [];
                    this.availableClasses = data.classes || [];
                } else {
                    console.error("Failed to load students:", data.error);
                    alert("Failed to load global student hub: " + (data.error || 'Unknown error'));
                }
            } catch (err) {
                console.error("Error loading students:", err);
                alert("Network error loading students.");
            } finally {
                this.isLoading = false;
            }
        },

        async loadLocations() {
            const token = sessionStorage.getItem('sea_erp_token');
            if (!token) return;
            try {
                const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';
                const res = await fetch(`/.netlify/functions/erp-api?action=get_locations&_t=${Date.now()}`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`, 
                        'Cache-Control': 'no-cache',
                        'x-device-id': deviceId
                    }
                });
                const data = await res.json();
                if (data.success && data.locations) {
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

        get uniqueCities() {
            return Object.keys(this.locations).sort();
        },

        get uniqueBranches() {
            if (this.filters.city && this.locations[this.filters.city]) {
                return [...this.locations[this.filters.city]].sort();
            }
            const allBranches = new Set();
            Object.values(this.locations).forEach(branches => {
                branches.forEach(b => allBranches.add(b));
            });
            return [...allBranches].sort();
        },
        
        get uniqueLevels() {
            return [...new Set(this.students.map(s => s.class_level).filter(Boolean))].sort((a,b) => a - b);
        },

        get uniqueTeachers() {
            return [...new Set(this.students.map(s => s.teacher_name).filter(Boolean))].sort();
        },

        get filteredGroups() {
            let filtered = this.students;
            if (this.filters.teacher) {
                filtered = filtered.filter(s => s.teacher_name === this.filters.teacher);
            }
            return [...new Set(filtered.map(s => s.class_name).filter(Boolean))].sort();
        },

        get filteredStudents() {
            return this.students.filter(s => {
                // Text Search
                if (this.filters.search) {
                    const searchLower = this.filters.search.toLowerCase();
                    const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
                    const matchesSearch = fullName.includes(searchLower) || 
                                          (s.email && s.email.toLowerCase().includes(searchLower)) ||
                                          (s.phone && s.phone.toLowerCase().includes(searchLower));
                    if (!matchesSearch) return false;
                }

                // Dropdown Filters
                if (this.filters.city && s.city !== this.filters.city) return false;
                if (this.filters.branch && s.branch_name !== this.filters.branch) return false;
                if (this.filters.studyMode && s.study_mode !== this.filters.studyMode && !(this.filters.studyMode === 'offline' && !s.study_mode)) return false;
                if (this.filters.level && String(s.class_level) !== String(this.filters.level)) return false;
                if (this.filters.teacher && s.teacher_name !== this.filters.teacher) return false;
                if (this.filters.group && s.class_name !== this.filters.group) return false;

                return true;
            });
        },

        getSelectedClass() {
            return this.availableClasses.find(c => c.id === this.formData.classId);
        },

        openEditModal(student) {
            this.formData = {
                id: student.student_id,
                firstName: student.first_name,
                middleName: student.middle_name || '',
                lastName: student.last_name,
                email: student.email || '',
                phone: student.phone || '',
                hybridPreference: student.hybrid_preference || 'in-person',
                classId: student.class_id || ''
            };
            this.showContactOptions = !!(student.email || student.phone);
            this.showEditModal = true;
        },

        closeModals() {
            this.showAddModal = false;
            this.showEditModal = false;
            this.showContactOptions = false;
            this.formData = {
                id: '',
                firstName: '',
                middleName: '',
                lastName: '',
                email: '',
                phone: '',
                hybridPreference: 'in-person',
                classId: ''
            };
        },

        async submitAdd() {
            const token = sessionStorage.getItem('sea_erp_token');
            const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';
            try {
                const res = await fetch('/.netlify/functions/scs-admin-api', {
                    method: 'POST',
                    headers: { 
                        'x-admin-key': token,
                        'x-device-id': deviceId,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'DIRECT_ADD_STUDENT',
                        payload: {
                            firstName: this.formData.firstName,
                            middleName: this.formData.middleName,
                            lastName: this.formData.lastName,
                            email: this.formData.email,
                            phone: this.formData.phone,
                            hybridPreference: this.formData.hybridPreference,
                            classId: this.formData.classId
                        }
                    })
                });
                const data = await res.json();
                if (data.success) {
                    this.closeModals();
                    this.loadStudents();
                } else {
                    alert("Error: " + data.error);
                }
            } catch (err) {
                console.error("Error adding student:", err);
                alert("Network error.");
            }
        },

        async submitEdit() {
            const token = sessionStorage.getItem('sea_erp_token');
            const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';
            try {
                const res = await fetch('/.netlify/functions/scs-admin-api', {
                    method: 'POST',
                    headers: { 
                        'x-admin-key': token,
                        'x-device-id': deviceId,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'DIRECT_EDIT_STUDENT',
                        payload: {
                            studentId: this.formData.id,
                            firstName: this.formData.firstName,
                            middleName: this.formData.middleName,
                            lastName: this.formData.lastName,
                            email: this.formData.email,
                            phone: this.formData.phone,
                            hybridPreference: this.formData.hybridPreference,
                            classId: this.formData.classId
                        }
                    })
                });
                const data = await res.json();
                if (data.success) {
                    this.closeModals();
                    this.loadStudents();
                } else {
                    alert("Error: " + data.error);
                }
            } catch (err) {
                console.error("Error editing student:", err);
                alert("Network error.");
            }
        },

        async confirmSoftDelete(student) {
            if (confirm(`Are you sure you want to remove ${student.first_name} ${student.last_name} from the active roster?\n\nTheir historical attendance and payments will be preserved in the archive.`)) {
                const token = sessionStorage.getItem('sea_erp_token');
                const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';
                try {
                    const res = await fetch('/.netlify/functions/scs-admin-api', {
                        method: 'POST',
                        headers: { 
                            'x-admin-key': token,
                            'x-device-id': deviceId,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'SOFT_DELETE_STUDENT',
                            payload: {
                                studentId: student.id || student.student_id
                            }
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        this.loadStudents();
                    } else {
                        alert("Error: " + data.error);
                    }
                } catch (err) {
                    console.error("Error removing student:", err);
                    alert("Network error.");
                }
            }
        }
    }));
});

// Global Broadcast Notification Function
window.sendBroadcast = async function(message) {
    if (!message) return;
    try {
        const token = sessionStorage.getItem('sea_erp_token');
        const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';
        const response = await fetch('/.netlify/functions/scs-push-api', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': 'Bearer ' + token,
                'x-device-id': deviceId
            },
            body: JSON.stringify({ action: 'BROADCAST_NOTIFICATION', payload: { title: 'Broadcast from Admin', body: message } })
        });
        const result = await response.json();
        if(result.success) {
            alert('Broadcast Sent! ' + result.sent + ' delivered, ' + result.failed + ' failed.');
        } else {
            alert('Broadcast Error: ' + result.error);
        }
    } catch(err) {
        alert('Failed to send broadcast: ' + err.message);
    }
};
