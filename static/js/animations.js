const ScrollAnimations = (function () {
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .zoom-in');

  function init() {
    if (!('IntersectionObserver' in window)) {
      revealElements.forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, parseInt(delay));
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    revealElements.forEach((el) => observer.observe(el));
  }

  return { init };
})();

const ParallaxBg = (function () {
  const bg = document.querySelector('.parallax-bg');

  function init() {
    if (!bg) return;
    window.addEventListener('scroll', () => {
      const scrollY = window.pageYOffset;
      bg.style.transform = `translateY(${scrollY * 0.3}px)`;
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  ScrollAnimations.init();
  ParallaxBg.init();
});
