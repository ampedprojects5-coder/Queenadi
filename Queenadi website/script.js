/**
 * Queenadi Medical - Website Scripts
 * Infrastructure: ready state, scroll offset, nav, stats, reveal, 3D tilt
 * Error handling: global errors, offline, unhandled rejection
 * Booking form: validation, Formspree submit
 */

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ========== Global error handling ========== */
const TOAST_ID = 'global-error-toast';
const TOAST_SHOW_MS = 8000;

function getToast() {
    return document.getElementById(TOAST_ID);
}

function showToast(message, isError = true) {
    const toast = getToast();
    if (!toast) return;
    toast.textContent = message;
    toast.setAttribute('hidden', 'false');
    toast.classList.add('visible');
    const t = setTimeout(() => {
        hideToast();
        clearTimeout(t);
    }, TOAST_SHOW_MS);
}

function hideToast() {
    const toast = getToast();
    if (!toast) return;
    toast.classList.remove('visible');
    toast.setAttribute('hidden', '');
}

function onGlobalError(msg, url, line, col, err) {
    try {
        showToast('Something went wrong. Please refresh the page or try again later.');
    } catch (e) {}
    return false;
}

function onUnhandledRejection(event) {
    try {
        showToast('Something went wrong. Please try again.');
        event.preventDefault();
    } catch (e) {}
}

window.onerror = onGlobalError;
window.addEventListener('unhandledrejection', onUnhandledRejection);

window.addEventListener('online', () => {
    const toast = getToast();
    if (toast && toast.textContent && toast.textContent.toLowerCase().includes('offline')) hideToast();
});

window.addEventListener('offline', () => {
    showToast('You are offline. Some features may not work until you reconnect.');
});

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.remove('no-js');
    document.body.classList.add('js-ready');

    if (!('scrollPaddingTop' in document.documentElement.style)) {
        document.documentElement.style.scrollPaddingTop = '72px';
    }
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    // Mobile nav toggle
    navToggle?.addEventListener('click', () => {
        const isOpen = navLinks?.classList.toggle('active');
        navToggle?.classList.toggle('active', isOpen);
        navToggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    navLinks?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle?.classList.remove('active');
            navLinks?.classList.remove('active');
            navToggle?.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });

    // Header scroll effect
    const header = document.querySelector('.header');
    const handleScroll = () => {
        if (window.scrollY > 50) header?.classList.add('scrolled');
        else header?.classList.remove('scrolled');
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Stats counter (only if not reduced motion)
    const statsValue = document.querySelector('.stats-value[data-count]');
    if (statsValue && !prefersReducedMotion()) {
        const target = parseInt(statsValue.getAttribute('data-count'), 10);
        const duration = 1500;
        const start = performance.now();
        const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 2);
            statsValue.textContent = Math.round(easeOut * target);
            if (progress < 1) requestAnimationFrame(step);
        };
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        requestAnimationFrame(step);
                        observer.disconnect();
                    }
                });
            },
            { threshold: 0.3 }
        );
        observer.observe(statsValue.closest('.stats-bar'));
    } else if (statsValue) {
        statsValue.textContent = statsValue.getAttribute('data-count') || '6';
    }

    // Section reveal with optional stagger
    const observerOptions = {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
    };

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const section = entry.target;
                section.classList.add('is-visible');
                if (!prefersReducedMotion() && section.querySelector('.feature-card')) {
                    section.querySelectorAll('.feature-card').forEach((card, i) => {
                        card.style.transitionDelay = `${i * 0.05}s`;
                    });
                }
            });
        },
        observerOptions
    );

    document.querySelectorAll('.section').forEach((section) => {
        section.classList.add('reveal-on-scroll');
        observer.observe(section);
    });

    // 3D mouse-follow tilt on hero (only if motion allowed)
    if (!prefersReducedMotion()) {
        const heroContent = document.querySelector('.hero-content[data-tilt]');
        const hero = document.querySelector('.hero');

        if (heroContent && hero) {
            const tiltAmount = 8;
            let targetX = 0, targetY = 0;
            let currentX = 0, currentY = 0;

            hero.addEventListener('mousemove', (e) => {
                const rect = hero.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                targetX = -y * tiltAmount;
                targetY = x * tiltAmount;
            });

            hero.addEventListener('mouseleave', () => {
                targetX = 0;
                targetY = 0;
            });

            function animateTilt() {
                currentX += (targetX - currentX) * 0.08;
                currentY += (targetY - currentY) * 0.08;
                heroContent.style.transform = `perspective(1000px) rotateX(${currentX}deg) rotateY(${currentY}deg)`;
                requestAnimationFrame(animateTilt);
            }
            animateTilt();
        }

        // 3D tilt on feature cards (mouse relative to card)
        document.querySelectorAll('.feature-card').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                const rotateX = -y * 4;
                const rotateY = x * 4;
                card.style.transform = `translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    /* ========== Booking form (Formspree + validation + error handling) ========== */
    const form = document.getElementById('booking-form');
    const formStatus = document.getElementById('booking-form-status');
    const submitBtn = document.getElementById('booking-submit');
    const FORMSPREE_URL = 'https://formspree.io/f/mrbljknd';

    if (form && submitBtn) {
        const nameInput = document.getElementById('booking-name');
        const emailInput = document.getElementById('booking-email');
        const messageInput = document.getElementById('booking-message');

        function setFieldError(errorElId, message) {
            const errorEl = document.getElementById(errorElId);
            const inputId = errorElId.replace('-error', '');
            const input = document.getElementById(inputId);
            if (errorEl) errorEl.textContent = message || '';
            if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
        }

        function clearAllErrors() {
            form.querySelectorAll('.form-error').forEach(el => { el.textContent = ''; });
            form.querySelectorAll('[aria-invalid]').forEach(el => { el.setAttribute('aria-invalid', 'false'); });
        }

        function setFormStatus(text, type) {
            if (!formStatus) return;
            formStatus.textContent = text || '';
            formStatus.className = 'form-status ' + (type || '');
        }

        function validate() {
            let valid = true;
            clearAllErrors();

            const name = nameInput?.value?.trim();
            if (!name) {
                setFieldError('booking-name-error', 'Please enter your name.');
                valid = false;
            }

            const email = emailInput?.value?.trim();
            if (!email) {
                setFieldError('booking-email-error', 'Please enter your email.');
                valid = false;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFieldError('booking-email-error', 'Please enter a valid email address.');
                valid = false;
            }

            const message = messageInput?.value?.trim();
            if (!message) {
                setFieldError('booking-message-error', 'Please enter your message.');
                valid = false;
            }

            return valid;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAllErrors();
            setFormStatus('');

            if (!validate()) {
                const firstError = form.querySelector('[aria-invalid="true"]');
                if (firstError) {
                    firstError.focus();
                }
                return;
            }

            const originalLabel = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending…';
            form.classList.add('loading');

            try {
                const formData = new FormData(form);
                const response = await fetch(FORMSPREE_URL, {
                    method: 'POST',
                    body: formData,
                    headers: { Accept: 'application/json' }
                });

                const data = await response.json().catch(() => ({}));

                if (response.ok && (data.ok === true || response.status === 200)) {
                    setFormStatus('Thank you. Your request has been sent. We\'ll be in touch soon.', 'success');
                    form.reset();
                    nameInput?.focus();
                } else {
                    const msg = (data.error || data.errors?.[0]?.message) || 'Something went wrong. Please try again or contact us by phone.';
                    setFormStatus(msg, 'error');
                }
            } catch (err) {
                if (err.name === 'TypeError' && (err.message || '').includes('fetch')) {
                    setFormStatus('Network error. Please check your connection and try again.', 'error');
                } else {
                    setFormStatus('Something went wrong. Please try again or contact us by phone.', 'error');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalLabel;
                form.classList.remove('loading');
            }
        });
    }
});
