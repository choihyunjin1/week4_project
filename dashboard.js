document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    const iframe = document.getElementById('main-frame');
    const viewTitle = document.getElementById('view-title');
    const loadingOverlay = document.getElementById('loading-overlay');
    const reloadBtn = document.getElementById('reload-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    let waitingForAppReady = false;

    function isDemoLabTarget(src) {
        return typeof src === 'string' && src.includes('demo-lab/index.html');
    }

    function revealFrame() {
        loadingOverlay.classList.remove('active');
        iframe.classList.add('ready');
        waitingForAppReady = false;
    }

    // Handle Iframe Load
    iframe.addEventListener('load', () => {
        if (!waitingForAppReady) {
            revealFrame();
        }
    });

    window.addEventListener('message', (event) => {
        if (event.source !== iframe.contentWindow) {
            return;
        }

        if (event.data && event.data.type === 'demo-lab-ready') {
            revealFrame();
        }
    });

    // Handle Navigation Clicks
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Unset active class
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update Header
            viewTitle.textContent = btn.getAttribute('data-title');

            // Trigger Transition
            iframe.classList.remove('ready');
            loadingOverlay.classList.add('active');
            waitingForAppReady = isDemoLabTarget(btn.getAttribute('data-target'));

            // Small delay to allow fade out before changing src (smoother UX)
            setTimeout(() => {
                iframe.src = btn.getAttribute('data-target');
            }, 300);
        });
    });

    // Reload Button
    reloadBtn.addEventListener('click', () => {
        iframe.classList.remove('ready');
        loadingOverlay.classList.add('active');
        waitingForAppReady = isDemoLabTarget(iframe.src);
        setTimeout(() => {
            iframe.contentWindow.location.reload();
        }, 150);
    });

    // Fullscreen Button
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // Trigger initial load fade-in
    if (iframe.src) {
        waitingForAppReady = isDemoLabTarget(iframe.src);
        if (!waitingForAppReady && iframe.contentDocument?.readyState === 'complete') {
            revealFrame();
        }
    }
});
