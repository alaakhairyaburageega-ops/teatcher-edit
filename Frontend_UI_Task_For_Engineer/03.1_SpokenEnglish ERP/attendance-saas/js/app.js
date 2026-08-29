document.addEventListener('alpine:init', () => {
    Alpine.data('attendanceApp', () => ({
        darkMode: false,
        sidebarCollapsed: false,
        currentView: 'dashboard',
        todayDate: new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()),
        
        // Mock Data for Attendance Table
        searchQuery: '',
        filterDept: '',
        filterStatus: '',
        filterDate: '',
        
        employees: [
            { id: 'EMP-001', name: 'أحمد محمود', dept: 'تقنية المعلومات', checkIn: '08:00 AM', checkOut: '04:00 PM', hours: '8h', status: 'present', statusAr: 'حاضر', delay: '-' },
            { id: 'EMP-002', name: 'سارة خالد', dept: 'الموارد البشرية', checkIn: '08:15 AM', checkOut: '04:00 PM', hours: '7h 45m', status: 'late', statusAr: 'متأخر', delay: '15m' },
            { id: 'EMP-003', name: 'محمد علي', dept: 'المالية', checkIn: '-', checkOut: '-', hours: '0h', status: 'absent', statusAr: 'غائب', delay: '-' },
            { id: 'EMP-004', name: 'فاطمة عمر', dept: 'تقنية المعلومات', checkIn: '07:55 AM', checkOut: '04:10 PM', hours: '8h 15m', status: 'present', statusAr: 'حاضر', delay: '-' },
            { id: 'EMP-005', name: 'عمر زيد', dept: 'المالية', checkIn: '08:30 AM', checkOut: '05:00 PM', hours: '8h 30m', status: 'late', statusAr: 'متأخر', delay: '30m' },
        ],

        get filteredEmployees() {
            return this.employees.filter(emp => {
                const matchesSearch = emp.name.includes(this.searchQuery) || emp.id.includes(this.searchQuery);
                const matchesDept = this.filterDept === '' || emp.dept === (this.filterDept === 'IT' ? 'تقنية المعلومات' : this.filterDept === 'HR' ? 'الموارد البشرية' : 'المالية');
                const matchesStatus = this.filterStatus === '' || emp.status === this.filterStatus;
                return matchesSearch && matchesDept && matchesStatus;
            });
        },

        init() {
            // Watch for Dark Mode changes to update charts
            this.$watch('darkMode', (val) => {
                if(this.currentView === 'dashboard') {
                    setTimeout(() => this.initCharts(), 100);
                }
            });

            // Initialize charts if starting on dashboard
            if (this.currentView === 'dashboard') {
                setTimeout(() => {
                    this.initCharts();
                    this.renderHeatmap();
                }, 100);
            }
        },

        switchView(view) {
            this.currentView = view;
            if (view === 'dashboard') {
                setTimeout(() => {
                    this.initCharts();
                    this.renderHeatmap();
                }, 100);
            }
        },

        chartInstances: {},

        initCharts() {
            // Chart Styling based on Theme
            const textColor = this.darkMode ? '#94a3b8' : '#64748b';
            const gridColor = this.darkMode ? '#334155' : '#e2e8f0';
            
            // Destroy existing charts
            Object.values(this.chartInstances).forEach(chart => chart.destroy());

            // 1. Trend Chart (Line)
            const trendCtx = document.getElementById('trendChart');
            if (trendCtx) {
                let gradient = trendCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
                gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

                this.chartInstances.trend = new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
                        datasets: [{
                            label: 'نسبة الحضور %',
                            data: [85, 90, 88, 95, 92, 89],
                            borderColor: '#3b82f6',
                            backgroundColor: gradient,
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#ffffff',
                            pointBorderColor: '#3b82f6',
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: gridColor }, ticks: { color: textColor }, min: 50, max: 100 },
                            x: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Cairo' } } }
                        }
                    }
                });
            }

            // 2. Distribution Chart (Donut)
            const distCtx = document.getElementById('distChart');
            if (distCtx) {
                this.chartInstances.dist = new Chart(distCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['حاضر', 'غائب', 'متأخر', 'إجازة'],
                        datasets: [{
                            data: [112, 8, 4, 0],
                            backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#94a3b8'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Cairo' } } }
                        },
                        cutout: '75%'
                    }
                });
            }

            // 3. Department Chart (Bar)
            const deptCtx = document.getElementById('deptChart');
            if (deptCtx) {
                this.chartInstances.dept = new Chart(deptCtx, {
                    type: 'bar',
                    data: {
                        labels: ['تقنية المعلومات', 'الموارد البشرية', 'المالية', 'المبيعات', 'التسويق'],
                        datasets: [{
                            label: 'نسبة الحضور',
                            data: [98, 85, 92, 88, 75],
                            backgroundColor: '#3b82f6',
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: gridColor }, ticks: { color: textColor }, max: 100 },
                            x: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Cairo' } } }
                        }
                    }
                });
            }
        },

        renderHeatmap() {
            const grid = document.getElementById('heatmapGrid');
            if (!grid) return;
            grid.innerHTML = '';
            // Generate 84 mock cells (12 weeks * 7 days)
            for (let i = 0; i < 84; i++) {
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';
                // Random intensity 0 to 4 (bias towards higher presence)
                let level = Math.random() > 0.3 ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 2);
                cell.setAttribute('data-level', level);
                
                // Tooltip
                cell.title = `نشاط الحضور: مستوى ${level}`;
                
                grid.appendChild(cell);
            }
        }
    }));
});
