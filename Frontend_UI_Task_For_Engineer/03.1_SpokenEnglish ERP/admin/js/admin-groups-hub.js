function groupsHubInit() {
    return {
        groups: [],
        teachers: [],
        isLoading: false,
        showReassignModal: false,
        showHistoryModal: false,
        isSubmitting: false,
        selectedHistory: [],
        reassignData: {
            groupId: '',
            groupName: '',
            groupLevel: '',
            oldTeacherId: '',
            oldTeacherName: '',
            newTeacherId: ''
        },

        init() {
            // Load automatically when Alpine initializes this component
            this.loadGroups();
        },

        async loadGroups() {
            this.isLoading = true;
            try {
                const adminKey = sessionStorage.getItem('sea_erp_token');
                if (!adminKey) return;
                
                const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';
                
                const response = await fetch('/.netlify/functions/scs-admin-api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': adminKey,
                        'x-device-id': deviceId
                    },
                    body: JSON.stringify({ action: 'GET_ALL_GROUPS', payload: {} })
                });

                const data = await response.json();
                if (data.success) {
                    this.groups = data.groups || [];
                    this.teachers = data.teachers || [];
                } else {
                    console.error('Failed to load groups:', data.error);
                }
            } catch (err) {
                console.error('Failed to load groups:', err);
                alert('Failed to load groups. Check network or console.');
            } finally {
                this.isLoading = false;
            }
        },

        showHistory(group) {
            if (!group.transfer_history || group.transfer_history.length === 0) return;
            this.selectedHistory = group.transfer_history;
            this.showHistoryModal = true;
        },

        openReassignModal(group) {
            this.reassignData = {
                groupId: group.id,
                groupName: group.name,
                groupLevel: group.level,
                oldTeacherId: group.teacher_id,
                oldTeacherName: group.teacher_name || 'Unassigned',
                newTeacherId: ''
            };
            this.showReassignModal = true;
        },

        closeModal() {
            this.showReassignModal = false;
            this.reassignData = {
                groupId: '', groupName: '', groupLevel: '',
                oldTeacherId: '', oldTeacherName: '', newTeacherId: ''
            };
        },

        async submitReassign() {
            if (!this.reassignData.newTeacherId) {
                alert('Please select a new teacher.');
                return;
            }

            const selectedTeacher = this.teachers.find(t => t.id === this.reassignData.newTeacherId);
            if (!selectedTeacher) return;

            // Optional confirmation for extra safety
            if (!confirm(`Are you sure you want to transfer ${this.reassignData.groupName} to ${selectedTeacher.full_name}?`)) {
                return;
            }

            this.isSubmitting = true;
            try {
                const adminKey = sessionStorage.getItem('sea_erp_token');
                const deviceId = await window.SCSSecurity?.getFingerprint() || 'unknown';
                const response = await fetch('/.netlify/functions/scs-admin-api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': adminKey,
                        'x-device-id': deviceId
                    },
                    body: JSON.stringify({
                        action: 'REASSIGN_GROUP',
                        payload: {
                            groupId: this.reassignData.groupId,
                            newTeacherId: this.reassignData.newTeacherId,
                            oldTeacherName: this.reassignData.oldTeacherName,
                            newTeacherName: selectedTeacher.full_name
                        }
                    })
                });

                const data = await response.json();
                if (data.success) {
                    this.closeModal();
                    await this.loadGroups();
                } else {
                    alert(data.error || 'Failed to reassign group.');
                }
            } catch (err) {
                console.error('Error during transfer:', err);
                alert('An error occurred during transfer. Check console.');
            } finally {
                this.isSubmitting = false;
            }
        }
    };
}
