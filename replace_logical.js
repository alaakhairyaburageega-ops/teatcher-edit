const fs = require('fs');
const path = require('path');

const filesToProcess = [
    './03.1_SpokenEnglish ERP/admin/css/admin.css',
    './03.1_SpokenEnglish ERP/teacher/css/teacher.css'
];

filesToProcess.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace margin
    content = content.replace(/margin-left:/g, 'margin-inline-start:');
    content = content.replace(/margin-right:/g, 'margin-inline-end:');
    
    // Replace padding
    content = content.replace(/padding-left:/g, 'padding-inline-start:');
    content = content.replace(/padding-right:/g, 'padding-inline-end:');
    
    // Replace borders
    content = content.replace(/border-left:/g, 'border-inline-start:');
    content = content.replace(/border-right:/g, 'border-inline-end:');
    content = content.replace(/border-left-color:/g, 'border-inline-start-color:');
    content = content.replace(/border-right-color:/g, 'border-inline-end-color:');
    
    // Replace positioning
    content = content.replace(/text-align:\s*left/g, 'text-align: start');
    content = content.replace(/text-align:\s*right/g, 'text-align: end');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Processed ${file}`);
});
