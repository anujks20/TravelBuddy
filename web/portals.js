/**
 * TravelBuddy Portals & Ecosystem Dropdown Navigation
 * Provides quick SIH 2026 evaluator access to:
 * - Police Command Center
 * - Hotel Partner Portal
 * - Android App (APK download & GitHub release)
 */
(function() {
    function initPortalsDropdown() {
        const container = document.getElementById('portals-container');
        const button = document.getElementById('portals-dropdown-btn');
        const menu = document.getElementById('portals-dropdown-menu');

        if (!container || !button || !menu) return;

        function openDropdown() {
            container.classList.add('is-open');
            button.setAttribute('aria-expanded', 'true');
        }

        function closeDropdown() {
            container.classList.remove('is-open');
            button.setAttribute('aria-expanded', 'false');
        }

        button.addEventListener('click', function(e) {
            e.stopPropagation();
            if (container.classList.contains('is-open')) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });

        // Close on outside click
        document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
                closeDropdown();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && container.classList.contains('is-open')) {
                closeDropdown();
                button.focus();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPortalsDropdown);
    } else {
        initPortalsDropdown();
    }
})();
