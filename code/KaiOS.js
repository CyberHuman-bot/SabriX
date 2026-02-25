(function (app) {
    // ============================
    // Key Handling
    // ============================
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);

    var keyOverlay = document.getElementById('keyOverlay');
    var overlayTimeout;

    function handleKeydown(e) {
        // Show overlay
        keyOverlay.style.display = 'block';
        keyOverlay.innerHTML += '<span>' + e.key + '</span>';
        console.log('Button pressed:', e.key);

        // Clear overlay after 1s
        clearTimeout(overlayTimeout);
        overlayTimeout = setTimeout(function () {
            keyOverlay.innerHTML = '';
            keyOverlay.style.display = 'none';
        }, 1000);

        // Prevent default backspace behavior
        if (e.key === 'Backspace') e.preventDefault();
    }

    function handleKeyup(e) {
        switch (e.key) {
            case 'ArrowUp': case '2': app.keyCallback.dUp(); break;
            case 'ArrowDown': case '8': app.keyCallback.dDown(); break;
            case 'ArrowLeft': case '4': app.keyCallback.dLeft(); break;
            case 'ArrowRight': case '6': app.keyCallback.dRight(); break;
            case 'SoftLeft': case 'Control': app.keyCallback.softLeft(); break;
            case 'SoftRight': case 'Alt': app.keyCallback.softRight(); break;
            case 'Enter': case '5': app.keyCallback.enter(); break;
            case 'ContextMenu': app.keyCallback.menu(); break;
            case 'Backspace': app.keyCallback.back(); break;
            case 'EndCall': app.keyCallback.quit(); break;
            default: app.keyCallback.other(e.key);
        }
    }

    // ============================
    // Ads Setup
    // ============================
// =====================
// KaiAds Responsive Only
// =====================
var fullscreenAd = false; // always false for responsive banners
var testMode = 0;          // set to 0 for real ads

document.addEventListener("DOMContentLoaded", () => {
    var adContainer = document.getElementById('ad-container');
    var adMaxHeight = 60;  // typical banner height
    var adMaxWidth = 224;  // typical banner width
    var adTabIndex = 50;   // navigation order

    try {
        getKaiAd({
            publisher: '795e22ff-9fa3-410f-a2b2-1fcb0762cbd1',
            app: 'SariX',
            test: testMode,
            h: adMaxHeight,
            w: adMaxWidth,
            container: adContainer,
            onerror: err => console.error('KaiAds error:', err),
            onready: ad => {
                ad.call('display', {
                    tabindex: adTabIndex,
                    navClass: 'navItem',
                    display: 'block'
                });

                ad.on('click', () => console.log('Ad clicked'));
                ad.on('close', () => console.log('Ad closed'));
                ad.on('display', () => console.log('Ad displayed'));
            }
        });
    } catch (e) {
        console.log('KaiAds not available:', e);
        adContainer.innerText = 'KaiAds not available';
    }
});

    // ============================
    // Expose app globally
    // ============================
    return app;

})(window.MyKaiOSApp = window.MyKaiOSApp || {});