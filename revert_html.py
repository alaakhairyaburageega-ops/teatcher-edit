import re

admin_map = {
    'نظام الإدارة': 'SCS Admin',
    'ملفات المعلمين': 'Teacher Profiles',
    'مصفوفة الصلاحيات': 'Access Matrix',
    'نظام كرونوس': 'Chronos Command',
    'مؤشر الأمان': 'Security Dial',
    'إدارة المناهج': 'Manifest Manager',
    'إدارة الشروحات': 'Tutorials Manager',
    'طلبات المعلمين': 'Teacher Requests',
    'إدارة المجموعات': 'Global Groups Hub',
    'إدارة الطلاب': 'Global Student Hub',
    'سجل الحضور العام': 'Master Attendance',
    'أرشيف الطلاب': 'Student Archive',
    'قفل الطوارئ': 'EMERGENCY LOCK',
    'لوحة المراقبة': 'The Auditor',
    'إجمالي المعلمين': 'Total Teachers',
    'الجلسات النشطة': 'Active Sessions',
    'مخالفات الأجهزة': 'Device Violations',
    'البحث بالاسم أو البريد الإلكتروني...': 'Search by name or email...',
    'ملفات المعلمين الشاملة': 'Teacher Forensic Profiles'
}

teacher_map = {
    'بوابة المعلم': 'Teacher Portal',
    'سجل الحضور': 'Attendance Tracker',
    'اختر مجموعة واضغط على الطلاب الغائبين لتسجيل الغياب.': 'Select a class and tap absent students to record.',
    'المجموعة': 'Class Group',
    'تاريخ الحصة': 'Class Date',
    'الإدخال اليومي': 'Daily Input',
    'عرض المصفوفة': 'Matrix View',
    'تحديد الكل حاضر': 'Mark All Present',
    'تسجيل الخروج': 'Logout'
}

def process_file(file_path, t_map):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Revert HTML attributes
    content = content.replace('<html lang="ar" dir="rtl">', '<html lang="en" dir="ltr">')

    # Add Translate button and script link
    # We will inject the button near the theme toggle
    if 'id="lang-toggle"' not in content:
        content = content.replace('id="theme-toggle"', 'id="lang-toggle" class="btn-secondary" style="margin-inline-end: 10px;">🌐 AR</button>\n                    <button id="theme-toggle"')

    if 'translations.js' not in content:
        content = content.replace('</body>', '    <script src="../admin/js/translations.js"></script>\n</body>')
        content = content.replace('src="../admin/js/translations.js"', 'src="./js/translations.js"') if 'admin' in file_path else content

    # Revert translations and add data-i18n
    for ar, en in t_map.items():
        # Handle placeholder
        content = content.replace(f'placeholder="{ar}"', f'data-i18n-placeholder="{en}" placeholder="{en}"')
        
        # Handle regular tags with no space
        content = content.replace(f'>{ar}<', f' data-i18n="{en}">{en}<')
        
        # Handle regular tags with spaces
        content = content.replace(f'>{ar} <', f' data-i18n="{en}">{en} <')

    # Clean up double data-i18n if it happens
    content = re.sub(r'(data-i18n="[^"]*"\s*)+data-i18n="', 'data-i18n="', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('03.1_SpokenEnglish ERP/admin/index.html', admin_map)
process_file('03.1_SpokenEnglish ERP/teacher/index.html', teacher_map)

print("Reverted HTML and added i18n hooks.")
