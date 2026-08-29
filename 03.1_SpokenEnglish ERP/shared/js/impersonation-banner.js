// Impersonation Banner Logic
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('sea_is_impersonation') === 'true') {
        const banner = document.createElement('div');
        banner.id = 'impersonation-warning-banner';
        banner.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            background-color: #EE2C36; /* SpokenEnglish Vibrant Red */
            color: white; 
            text-align: center; 
            padding: 8px 15px; 
            font-weight: 700; 
            font-size: 0.9rem;
            z-index: 999999; 
            box-shadow: 0 2px 10px rgba(238, 44, 54, 0.4); 
            font-family: 'Outfit', 'Inter', sans-serif;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
        `;
        banner.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>MASTER DNA IMPERSONATION ACTIVE: You have full Read/Write access. Actions are logged.</span>
        `;
        document.body.prepend(banner);
        
        // Adjust padding so we don't cover the top nav
        const currentPadding = window.getComputedStyle(document.body).paddingTop;
        const paddingVal = parseInt(currentPadding, 10) || 0;
        document.body.style.paddingTop = (paddingVal + 40) + 'px';
    }
});
