# Changelog

سجل بالتعديلات التي تمت على المشروع. يجب تحديث هذا الملف بعد كل عملية تعديل ناجحة.

## قالب التسجيل:

```markdown
## YYYY-MM-DD — عنوان التعديل

### السبب
لماذا تم إجراء التعديل.

### التغييرات
- التغيير الأول.
- التغيير الثاني.

### الملفات المتأثرة
- `path/to/file`
- `path/to/file`

### الاختبارات
- Test/build/lint الذي تم تشغيله.
- النتيجة.

### ملاحظات
أي معلومات مهمة.
```

## 2026-08-26 — إعادة تصميم واجهة الداش بورد (Cyberpunk/Neon Dark Mode)

### السبب
بناءً على طلب المستخدم، تم إعادة تصميم لوحة تحكم المعلم لتشبه النمط المستقبلي والمتقدم (Neon Dark Mode / Cyberpunk) المرفق في الصورة، مع ألوان نيون ومؤثرات بصرية متقدمة.

### التغييرات
- تغيير الألوان الأساسية والمتغيرات في `teacher.css` لتشمل ألوان النيون (سماوي، وردي، بنفسجي، أخضر نيون).
- إضافة تأثيرات التوهج (Glow effects و Box Shadows) للبطاقات، الأزرار، والحواف.
- تحديث تصميم بطاقات الطلاب (Student Cards) لتصبح أشبه بواجهات الاستشعار المتقدمة (Sci-Fi panels).
- تحديث إعدادات `Chart.js` في ملف `teacher-app.js` لاستخدام تدرجات لونية (Gradients) تناسب التصميم الجديد، وإضافة خطوط شبكة (Grid) نيون خفيفة.
- إضافة خلفية بنمط شبكي (Grid Pattern) باستخدام التدرجات في CSS.

### الملفات المتأثرة
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/teacher/css/teacher.css`
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/teacher/js/teacher-app.js`

### الاختبارات
- Manual verification: تم التحقق بصرياً من التنسيقات وتطبيق التصميم المتقدم بنجاح بدون أخطاء في العرض أو كسر لوظائف سابقة.
- النتيجة: التصميم متجاوب ومتوافق تماماً مع المطلوب.

### ملاحظات
هذا التعديل بصري بامتياز وتم الحفاظ على نفس بنية HTML لضمان عدم حدوث أي انهيار وظيفي، محققاً قاعدة "Minimal Change Required" لترقية التصميم.

## 2026-08-26 — إنشاء نظام الحضور والانصراف السحابي (Attendance SaaS)

### السبب
طلب المستخدم بناء واجهة ويب احترافية ومتقدمة (SaaS-level) لنظام إدارة الحضور والانصراف باللغة العربية (RTL) بشكل كامل مع رسوم بيانية وتصميم عصري متقدم.

### التغييرات
- إنشاء مجلد مستقل `attendance-saas` لضمان عدم تعارض الميزات الجديدة مع النظام القديم.
- بناء واجهة `index.html` بتصميم RTL حديث (Sidebar, Navbar, Dashboard, Attendance Table).
- إنشاء `css/style.css` يضم متغيرات الألوان (CSS Variables)، ونظام Dark/Light mode متكامل، واعتماد خط Cairo للغة العربية.
- تطوير `js/app.js` باستخدام `Alpine.js` للتبديل بين الصفحات (SPA)، و`Chart.js` لإنشاء رسوم بيانية متقدمة (Line, Bar, Donut) وخريطة حرارية (Heatmap).
- بناء جدول حضور متقدم يحتوي على بحث، فلاتر حالة وقسم، وأيقونات حالة.

### الملفات المتأثرة
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/attendance-saas/index.html` (NEW)
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/attendance-saas/css/style.css` (NEW)
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/attendance-saas/js/app.js` (NEW)

### الاختبارات
- Manual verification: تم اختبار الوضع الليلي والنهاري، تبديل الصفحات، فلاتر الجدول، تفاعل الرسوم البيانية. كل شيء يعمل بشكل سليم بصرياً ووظيفياً.
- النتيجة: التصميم متجاوب ويعمل بشكل ممتاز كمنتج SaaS احترافي.

### ملاحظات
الواجهة صُممت كمنتج جاهز للإنتاج (Production-ready) مع دعم Skeleton/Empty states. تم تحقيق قاعدة Minimal Change Required عن طريق فصل هذا المشروع في مجلد منفصل لعدم المساس بالبورتال الحالي.

## 2026-08-26 — تحسينات لوحة تحكم المعلم (Teacher Dashboard UI Tweaks)

### السبب
إضافة زر تبديل الوضع (Light Mode / Dark Mode) باللغة الإنجليزية، إدراج شعار المنظمة في القائمة الجانبية، وجعل شاشة الإحصائيات (Analytics) هي الشاشة الافتراضية للمعلم بناءً على طلب المستخدم.

### التغييرات
- إضافة زر `☀️ Light Mode` و `🌙 Dark Mode` في أعلى لوحة تحكم المعلم.
- إضافة كلاس `.light-mode` في ملف `teacher.css` وربطه بالزر (Toggle) لعكس ألوان النيون الداكنة إلى وضع فاتح مريح (تم إصلاح عدم استجابة الزر عن طريق ربط الـ class بشكل مباشر باستخدام Alpine.js).
- تم إصلاح مشكلة انقسام اسم المعلم لسطرين، وتصغير حجم خط زر الوضع الفاتح ليبقى في سطر واحد.
- إضافة صورة الشعار الأصلية للمنظمة (Logo) المرفقة من قبل المستخدم بنجاح في القائمة الجانبية (`.sidebar-brand`) باستخدام المسار `../shared/img/logo.jpg`.
- تم إعادة بناء التصميم الخاص بـ (Matrix View Grid) في ملف `attendance-grid.js` ليدعم متغيرات الثيم الديناميكية (CSS Variables) للعمل بسلاسة مع الوضع الداكن.
- تم إصلاح مشكلة قراءة الأسماء من كائنات الطلاب (firstName/first_name) مما أدى إلى حل مشكلة ظهور `undefined` في لوحة (Matrix).
- إنشاء ملفات التوثيق الرسمية للمشروع: `UI_UX_GUIDE.md` لشرح الواجهات وتجربة المستخدم، و `CODE_ARCHITECTURE.md` لشرح البنية البرمجية والباك إند.

### الملفات المتأثرة
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/teacher/index.html`
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/teacher/css/teacher.css`
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/teacher/js/teacher-app.js`
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/shared/js/attendance-grid.js`
- `Frontend_UI_Task_For_Engineer/03.1_SpokenEnglish ERP/shared/img/logo.jpg` (تم نسخ الصورة)
- `Frontend_UI_Task_For_Engineer/UI_UX_GUIDE.md` [NEW]
- `Frontend_UI_Task_For_Engineer/CODE_ARCHITECTURE.md` [NEW]

### الاختبارات
- Manual verification: تم التأكد من عمل زر تبديل الثيم وظهور المخططات بشكل مباشر فور فتح لوحة المعلم، وظهور الشعار واسم المعلم بشكل سليم، وتوليد البيانات الوهمية بنجاح.
