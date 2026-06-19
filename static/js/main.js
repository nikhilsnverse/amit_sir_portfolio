(function () {
  'use strict';

  const preloader = document.getElementById('loader');
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const mobileOverlay = document.querySelector('.mobile-overlay');
  const mobileMenu = document.querySelector('.mobile-menu');
  const links = document.querySelectorAll('.nav-links a, .mobile-links a');
  const scrollProgress = document.getElementById('scroll-progress');
  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');

  /* ---- PRELOADER ---- */
  window.addEventListener('load', () => {
    setTimeout(() => {
      preloader.classList.add('hidden');
      HeroScene.show();
      typeText();
    }, 800);
  });

  /* ---- TYPING ANIMATION ---- */
  function typeText() {
    const el = document.getElementById('typing-text');
    const text = 'सर्वे भवन्तु सुखिनः, सर्वे सन्तु निरामयाः।';
    let i = 0;
    function type() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(type, 80);
      }
    }
    type();
  }

  /* ---- NAVBAR SCROLL ---- */
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
    updateActiveLink();
    updateScrollProgress();
  });

  /* ---- ACTIVE NAV LINK ---- */
  function updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    let current = '';

    sections.forEach((section) => {
      const top = section.offsetTop - 120;
      const bottom = top + section.offsetHeight;

      if (window.pageYOffset >= top && window.pageYOffset < bottom) {
        current = section.getAttribute('id');
      }
    });

    links.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  /* ---- SCROLL PROGRESS ---- */
  function updateScrollProgress() {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    scrollProgress.style.width = `${progress}%`;
  }

  /* ---- MOBILE HAMBURGER (shadcn sheet style) ---- */
  function toggleMobile() {
    hamburger.classList.toggle('active');
    mobileOverlay.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  }

  hamburger.addEventListener('click', toggleMobile);
  mobileOverlay.addEventListener('click', toggleMobile);

  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileMenu.classList.contains('open')) toggleMobile();
    });
  });

  /* ---- COUNTER ANIMATION ---- */
  function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');

    counters.forEach((counter) => {
      const target = parseFloat(counter.dataset.target);
      const steps = 60;
      const step = target / steps;
      let current = 0;

      const updateCounter = () => {
        current += step;
        if (current < target) {
          counter.textContent = Number.isInteger(target) ? Math.floor(current) : current.toFixed(2);
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = Number.isInteger(target) ? target : target.toFixed(2);
        }
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              updateCounter();
              observer.unobserve(entry);
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(counter);
    });
  }

  animateCounters();

  /* ---- SERVICE CARD GLOW ---- */
  document.querySelectorAll('.service-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', x + '%');
      card.style.setProperty('--mouse-y', y + '%');
    });
  });

  /* ---- CONTACT FORM ---- */
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('.submit-btn');
      const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        message: document.getElementById('message').value.trim(),
      };

      if (!formData.name || !formData.message) {
        showFormMessage('Please fill in name and message.', 'error');
        return;
      }

      submitBtn.classList.add('loading');

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
          showFormMessage(result.message, 'success');
          contactForm.reset();
        } else {
          showFormMessage(result.error || 'Something went wrong.', 'error');
        }
      } catch {
        showFormMessage('Unable to send message. Please try again.', 'error');
      } finally {
        submitBtn.classList.remove('loading');
      }
    });
  }

  function showFormMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        formMessage.style.display = 'none';
      }, 5000);
    }
  }
})();
