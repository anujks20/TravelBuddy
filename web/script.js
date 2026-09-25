document.addEventListener('DOMContentLoaded', () => {
    // Apply entrance animation classes to stagger elements
    const h1 = document.querySelector('.stagger-1');
    const p = document.querySelector('.stagger-2');
    const btn = document.querySelector('.stagger-3');

    if (h1) {
        h1.classList.add('animate-entrance', 'delay-0');
    }
    if (p) {
        p.classList.add('animate-entrance', 'delay-200');
    }
    if (btn) {
        btn.classList.add('animate-entrance', 'delay-400');
    }
});
