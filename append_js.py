import os

js_code = """
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
"""

files = [
    '03.1_SpokenEnglish ERP/admin/js/admin-auditor.js',
    '03.1_SpokenEnglish ERP/teacher/js/teacher-app.js'
]

for file in files:
    with open(file, 'a', encoding='utf-8') as f:
        f.write("\n" + js_code)

print("JS appended.")
