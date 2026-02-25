/**
 * Advanced Wound Care & Solutions
 * Website JavaScript Functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initSmoothScroll();
    initHeader();
    initFAQAccordion();
    initVideoHandler();
    initContactForm();
});

/**
 * Mobile Navigation Toggle
 */
function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav__link');

    // Open menu
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.add('show-menu');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close menu
    if (navClose) {
        navClose.addEventListener('click', function() {
            navMenu.classList.remove('show-menu');
            document.body.style.overflow = '';
        });
    }

    // Close menu when clicking on nav links
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            navMenu.classList.remove('show-menu');
            document.body.style.overflow = '';
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (navMenu && navMenu.classList.contains('show-menu')) {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('show-menu');
                document.body.style.overflow = '';
            }
        }
    });
}

/**
 * Smooth Scroll for Anchor Links
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    const headerHeight = 80;

    links.forEach(function(link) {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip if it's just "#" or if it's not an internal link
            if (href === '#' || !href.startsWith('#')) return;

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();

                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = targetPosition - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Header Scroll Effect
 */
function initHeader() {
    const header = document.getElementById('header');

    if (!header) return;

    function handleScroll() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    // Initial check
    handleScroll();

    // Throttled scroll listener
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
}

/**
 * FAQ Accordion
 */
function initFAQAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item');

    accordionItems.forEach(function(item) {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');

        if (header && content) {
            header.addEventListener('click', function() {
                const isExpanded = header.getAttribute('aria-expanded') === 'true';

                // Close all other items
                accordionItems.forEach(function(otherItem) {
                    if (otherItem !== item) {
                        const otherHeader = otherItem.querySelector('.accordion-header');
                        otherHeader.setAttribute('aria-expanded', 'false');
                        otherItem.classList.remove('active');
                    }
                });

                // Toggle current item
                header.setAttribute('aria-expanded', !isExpanded);
                item.classList.toggle('active');
            });
        }
    });
}

/**
 * Hero Video Handler
 */
function initVideoHandler() {
    const video = document.getElementById('hero-video');
    const fallback = document.querySelector('.hero__fallback');

    if (!video) return;

    // Function to handle video play
    function playVideo() {
        const playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise.then(function() {
                // Video started playing successfully
                if (fallback) {
                    fallback.style.display = 'none';
                }
            }).catch(function(error) {
                // Auto-play was prevented, show fallback
                console.log('Video autoplay prevented:', error);
                if (fallback) {
                    fallback.style.display = 'block';
                }
            });
        }
    }

    // Check if video can be played
    video.addEventListener('canplay', function() {
        playVideo();
    });

    // Handle video error
    video.addEventListener('error', function() {
        console.log('Video error occurred, showing fallback');
        if (fallback) {
            fallback.style.display = 'block';
        }
    });

    // Ensure video loops properly
    video.addEventListener('ended', function() {
        video.currentTime = 0;
        video.play();
    });

    // Pause video when not in viewport to save resources
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                video.play();
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.25 });

    observer.observe(video);

    // Try to play video immediately if it's ready
    if (video.readyState >= 3) {
        playVideo();
    }
}

/**
 * Contact Form Handler
 */
function initContactForm() {
    const form = document.getElementById('contact-form');

    if (!form) return;

    // Auto-format phone number as (XXX) XXX-XXXX
    var phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            var digits = this.value.replace(/\D/g, '');
            if (digits.length > 10) digits = digits.substring(0, 10);
            var formatted = '';
            if (digits.length > 0) formatted = '(' + digits.substring(0, 3);
            if (digits.length >= 3) formatted += ') ';
            if (digits.length > 3) formatted += digits.substring(3, 6);
            if (digits.length >= 6) formatted += '-';
            if (digits.length > 6) formatted += digits.substring(6, 10);
            this.value = formatted;
        });
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const data = {};
        formData.forEach(function(value, key) {
            data[key] = value;
        });

        // Basic validation
        if (!data.name || !data.email || !data.phone || !data.message) {
            showFormMessage('Please fill in all required fields.', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showFormMessage('Please enter a valid email address.', 'error');
            return;
        }

        // Phone validation - expects (XXX) XXX-XXXX format
        const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
        if (!phoneRegex.test(data.phone)) {
            showFormMessage('Please enter a complete 10-digit phone number.', 'error');
            return;
        }

        // File validation (optional field)
        var fileInput = form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files.length > 0) {
            var file = fileInput.files[0];
            if (file.size > 10 * 1024 * 1024) {
                showFormMessage('Image file must be under 10MB.', 'error');
                return;
            }
            if (!file.type.startsWith('image/')) {
                showFormMessage('Please upload an image file (JPG, PNG, GIF, WebP).', 'error');
                return;
            }
        }

        // Disable submit button while sending
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        // Submit to Netlify Forms
        fetch('/', {
            method: 'POST',
            body: new FormData(form)
        })
        .then(function(response) {
            if (response.ok) {
                showFormMessage('Thank you for your message! We will contact you shortly.', 'success');
                form.reset();
            } else {
                showFormMessage('Something went wrong. Please try again or call us directly.', 'error');
            }
        })
        .catch(function(error) {
            showFormMessage('Something went wrong. Please try again or call us directly at (916) 250-1737.', 'error');
        })
        .finally(function() {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });
}

/**
 * Show Form Message
 */
function showFormMessage(message, type) {
    // Remove existing message if any
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = 'form-message form-message--' + type;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 0.5rem;
        font-weight: 500;
        text-align: center;
        ${type === 'success'
            ? 'background-color: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;'
            : 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;'}
    `;

    // Insert message before form
    const form = document.getElementById('contact-form');
    form.parentNode.insertBefore(messageEl, form);

    // Auto-remove message after 5 seconds
    setTimeout(function() {
        messageEl.style.opacity = '0';
        messageEl.style.transition = 'opacity 0.3s ease';
        setTimeout(function() {
            messageEl.remove();
        }, 300);
    }, 5000);
}

/**
 * Intersection Observer for Animations
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.feature, .setting-card, .services__column, .accordion-item');

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Initialize scroll animations after page load
window.addEventListener('load', initScrollAnimations);

/**
 * Utility: Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = function() {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility: Throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(function() {
                inThrottle = false;
            }, limit);
        }
    };
}
