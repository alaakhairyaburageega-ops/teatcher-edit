import re
import os

files = [
    '03.1_SpokenEnglish ERP/admin/index.html',
    '03.1_SpokenEnglish ERP/teacher/index.html'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add RTL and lang attributes
    content = content.replace('<html lang="en">', '<html lang="ar" dir="rtl">')

    # Update Google Fonts to include Cairo
    if 'Cairo' not in content:
        content = content.replace('family=Outfit:wght@300;400;600;800', 'family=Outfit:wght@300;400;600;800&family=Cairo:wght@400;600;800')
        content = content.replace('family=Outfit:wght@500;700;800', 'family=Outfit:wght@500;700;800&family=Cairo:wght@400;600;700;800')

    # Add mobile-menu-btn to admin-header logo-area
    if 'mobile-menu-btn' not in content:
        content = content.replace('<div class="logo-area">', 
            '<div class="logo-area">\n                    <button id="mobile-menu-btn" class="mobile-menu-btn">☰</button>')

    # Basic translations for admin sidebar
    if 'admin' in file:
        translations = {
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
            'Teacher Forensic Profiles': 'ملفات المعلمين الشاملة'
        }
        for k, v in translations.items():
            content = content.replace(f">{k}<", f">{v}<")
            content = content.replace(f'"{k}"', f'"{v}"')
            content = content.replace(f'>{k} <', f'>{v} <')

    if 'teacher' in file:
        translations = {
            'SCS Teacher': 'بوابة المعلم',
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
        }
        for k, v in translations.items():
            content = content.replace(f">{k}<", f">{v}<")
            content = content.replace(f'"{k}"', f'"{v}"')
            content = content.replace(f'>{k} <', f'>{v} <')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("HTML processing complete.")
