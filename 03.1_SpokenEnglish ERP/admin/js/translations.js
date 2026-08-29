const arDict = {
    'SCS Admin': 'نظام الإدارة',
    'Teacher Profiles': 'ملفات المعلمين',
    'Access Matrix': 'مصفوفة الصلاحيات',
    'Chronos Command': 'نظام كرونوس',
    'Security Dial': 'مؤشر الأمان',
    'Manifest Manager': 'إدارة المناهج',
    'Tutorials Manager': 'إدارة الشروحات',
    'Teacher Requests': 'طلبات المعلمين',
    'Global Groups Hub': 'إدارة المجموعات',
    'Global Student Hub': 'إدارة الطلاب',
    'Master Attendance': 'سجل الحضور العام',
    'Student Archive': 'أرشيف الطلاب',
    'EMERGENCY LOCK': 'قفل الطوارئ',
    'The Auditor': 'لوحة المراقبة',
    'Total Teachers': 'إجمالي المعلمين',
    'Active Sessions': 'الجلسات النشطة',
    'Device Violations': 'مخالفات الأجهزة',
    'Search by name or email...': 'البحث بالاسم أو البريد الإلكتروني...',
    'Teacher Forensic Profiles': 'ملفات المعلمين الشاملة',
    'Teacher Portal': 'بوابة المعلم',
    'Attendance Tracker': 'سجل الحضور',
    'Select a class and tap absent students to record.': 'اختر مجموعة واضغط على الطلاب الغائبين لتسجيل الغياب.',
    'Class Group': 'المجموعة',
    'Class Date': 'تاريخ الحصة',
    'Daily Input': 'الإدخال اليومي',
    'Matrix View': 'عرض المصفوفة',
    'Mark All Present': 'تحديد الكل حاضر',
    'Logout': 'تسجيل الخروج',
    'LOGOUT': 'تسجيل الخروج'
};

document.addEventListener('DOMContentLoaded', () => {
    const langBtn = document.getElementById('lang-toggle');
    if (!langBtn) return;

    let currentLang = localStorage.getItem('scs_lang') || 'en';

    const setLang = (lang) => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // Update Button Text
        langBtn.textContent = lang === 'ar' ? '🌐 EN' : '🌐 AR';

        // Update Text Elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (lang === 'ar' && arDict[key]) {
                el.textContent = arDict[key];
            } else {
                el.textContent = key;
            }
        });

        // Update Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (lang === 'ar' && arDict[key]) {
                el.placeholder = arDict[key];
            } else {
                el.placeholder = key;
            }
        });
    };

    // Initialize Language on Load
    setLang(currentLang);

    // Toggle Language on Click
    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ar' : 'en';
        localStorage.setItem('scs_lang', currentLang);
        setLang(currentLang);
    });
});
