/**
 * SCS Manifest Manager Controller
 * Focus: Curriculum DB Operations & Safety Rails
 */

document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const viewSections = document.querySelectorAll('.view-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            viewSections.forEach(v => v.classList.add('hidden'));

            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');

            // If switching to manifest, load data if empty
            if (targetId === 'view-manifest' && !manifestCache) {
                loadManifestData();
            }
        });
    });

    // Manifest Logic
    const levelSelect = document.getElementById('manifest-level-select');
    const bookSelect = document.getElementById('manifest-book-select');
    const manifestEditor = document.getElementById('manifest-editor');
    const manifestListBody = document.getElementById('manifest-list-body');
    const saveManifestBtn = document.getElementById('save-manifest-btn');
    const addUnitBtn = document.getElementById('add-unit-btn');

    let manifestCache = null; // Full DB rows
    window.scsManifestCache = null; // Global reference for admin.js
    let currentManifest = null; // The currently edited row
    let currentUnits = {}; // Working copy of units

    // EXPOSE GLOBALLY FOR ADMIN.JS
    window.loadManifestData = async function() {
        const key = sessionStorage.getItem('sea_erp_token');
        if (!key) return;

        try {
            const deviceId = await SCSSecurity.getFingerprint();
            const response = await fetch('/.netlify/functions/scs-manifest-api', {
                headers: { 
                    'x-admin-key': key,
                    'x-device-id': deviceId
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                manifestCache = data.manifest;
                window.scsManifestCache = manifestCache;
                console.log("SCS Manifest Cache Loaded.");
            } else {
                console.error("Failed to load manifest");
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Auto-load if already authenticated
    if (sessionStorage.getItem('sea_erp_token')) {
        window.loadManifestData();
    }

    levelSelect.addEventListener('change', () => {
        const selectedLevel = levelSelect.value;
        if (!selectedLevel) {
            bookSelect.disabled = true;
            bookSelect.value = '';
            manifestEditor.classList.add('hidden');
            return;
        }

        bookSelect.disabled = false;
        bookSelect.value = ''; // Reset
        manifestEditor.classList.add('hidden');
        
        // Disable options that don't exist in DB
        const availableBooks = manifestCache
            .filter(r => r.level_id === selectedLevel)
            .map(r => r.book_type);
            
        Array.from(bookSelect.options).forEach(opt => {
            if (opt.value === '') return;
            opt.disabled = !availableBooks.includes(opt.value);
        });
    });

    bookSelect.addEventListener('change', () => {
        if (!bookSelect.value) {
            manifestEditor.classList.add('hidden');
            return;
        }

        currentManifest = manifestCache.find(r => 
            r.level_id === levelSelect.value && 
            r.book_type === bookSelect.value
        );

        if (currentManifest) {
            // Deep copy to working object
            currentUnits = JSON.parse(JSON.stringify(currentManifest.units || {}));
            renderManifestGrid();
            manifestEditor.classList.remove('hidden');
        }
    });

    function renderManifestGrid() {
        manifestListBody.innerHTML = '';
        
        const sortedUnits = Object.keys(currentUnits).sort((a,b) => parseInt(a) - parseInt(b));

        if (sortedUnits.length === 0) {
            manifestListBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No units defined. Click Add Unit.</td></tr>`;
            return;
        }

        sortedUnits.forEach(unitNum => {
            const range = currentUnits[unitNum];
            const tr = document.createElement('tr');
            tr.className = 'unit-row';
            tr.dataset.unit = unitNum;
            
            tr.innerHTML = `
                <td><strong>Unit ${unitNum}</strong></td>
                <td>
                    <input type="number" class="start-page-input" value="${range[0]}" min="1">
                </td>
                <td>
                    <input type="number" class="end-page-input" value="${range[1]}" min="1">
                </td>
                <td>
                    <button class="btn-ghost delete-unit-btn" data-unit="${unitNum}">Delete</button>
                    <span class="error-message"></span>
                </td>
            `;
            manifestListBody.appendChild(tr);
        });
    }

    // Delegation for dynamic grid
    manifestListBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-unit-btn')) {
            const unit = e.target.getAttribute('data-unit');
            if (confirm(`Remove Unit ${unit}?`)) {
                delete currentUnits[unit];
                renderManifestGrid();
            }
        }
    });

    addUnitBtn.addEventListener('click', () => {
        const existingKeys = Object.keys(currentUnits).map(Number);
        const nextUnit = existingKeys.length > 0 ? Math.max(...existingKeys) + 1 : 1;
        
        // Default range based on previous if exists
        let newStart = 1;
        if (existingKeys.length > 0) {
            const lastUnit = Math.max(...existingKeys);
            newStart = currentUnits[lastUnit][1] + 1;
        }
        
        currentUnits[nextUnit] = [newStart, newStart + 9];
        renderManifestGrid();
    });

    // 🛑 SAFETY RAILS (Validation) 🛑
    function validateManifest() {
        let isValid = true;
        const rows = document.querySelectorAll('.unit-row');
        let previousEnd = 0;

        // Reset errors
        rows.forEach(r => {
            r.classList.remove('error-row');
            r.querySelector('.start-page-input').classList.remove('error');
            r.querySelector('.end-page-input').classList.remove('error');
            r.querySelector('.error-message').textContent = '';
        });

        const newUnitsData = {};

        rows.forEach(row => {
            const unitNum = row.dataset.unit;
            const startInput = row.querySelector('.start-page-input');
            const endInput = row.querySelector('.end-page-input');
            const errorSpan = row.querySelector('.error-message');
            
            const start = parseInt(startInput.value);
            const end = parseInt(endInput.value);

            if (isNaN(start) || isNaN(end)) {
                showRowError(row, startInput, endInput, errorSpan, "Pages cannot be empty");
                isValid = false;
                return;
            }

            if (start >= end) {
                showRowError(row, startInput, endInput, errorSpan, "Start must be less than End");
                isValid = false;
                return;
            }

            if (start <= previousEnd) {
                showRowError(row, startInput, null, errorSpan, "Overlaps with previous unit");
                isValid = false;
                return;
            }

            previousEnd = end;
            newUnitsData[unitNum] = [start, end];
        });

        if (isValid) {
            currentUnits = newUnitsData; // Sync DOM values to memory
        }

        return isValid;
    }

    function showRowError(row, input1, input2, span, msg) {
        row.classList.add('error-row');
        if (input1) input1.classList.add('error');
        if (input2) input2.classList.add('error');
        span.textContent = msg;
    }

    // Save Action
    saveManifestBtn.addEventListener('click', async () => {
        if (!validateManifest()) {
            return; // Safety rail blocked it
        }

        const originalBtnText = saveManifestBtn.textContent;
        saveManifestBtn.textContent = 'Saving...';
        saveManifestBtn.disabled = true;

        try {
            const key = sessionStorage.getItem('sea_erp_token');
            const deviceId = await SCSSecurity.getFingerprint();
            
            const response = await fetch('/.netlify/functions/scs-manifest-api', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-admin-key': key,
                    'x-device-id': deviceId
                },
                body: JSON.stringify({ 
                    action: 'UPDATE_MANIFEST', 
                    payload: { id: currentManifest.id, units: currentUnits } 
                })
            });

            if (response.ok) {
                // Update local cache
                const index = manifestCache.findIndex(r => r.id === currentManifest.id);
                if (index !== -1) {
                    manifestCache[index].units = JSON.parse(JSON.stringify(currentUnits));
                }
                
                saveManifestBtn.textContent = '✅ Saved';
                setTimeout(() => {
                    saveManifestBtn.textContent = originalBtnText;
                    saveManifestBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error("API returned failure");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to save manifest.");
            saveManifestBtn.textContent = originalBtnText;
            saveManifestBtn.disabled = false;
        }
    });

});
