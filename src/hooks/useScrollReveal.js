import { useEffect, useRef } from 'react';

/**
 * Hook para ativar animações ao elemento entrar na viewport
 * Uso: const ref = useScrollReveal(); <div ref={ref} className="scroll-reveal">
 */
export function useScrollReveal() {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Opcional: parar de observar após aparecer
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1, // Dispara quando 10% do elemento está visível
        rootMargin: '0px 0px -50px 0px', // Dispara um pouco antes de entrar completamente
      }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return ref;
}

/**
 * Hook para observar múltiplos elementos com stagger
 * Uso: useScrollRevealMultiple(containerRef, '.item')
 */
export function useScrollRevealMultiple(containerRef, selector) {
  useEffect(() => {
    if (!containerRef.current) return;

    const items = containerRef.current.querySelectorAll(selector);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            // Adiciona delay progressivo (stagger effect)
            setTimeout(() => {
              entry.target.classList.add('visible');
            }, index * 100); // 100ms de delay entre cada item
            
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    items.forEach((item) => observer.observe(item));

    return () => {
      items.forEach((item) => observer.unobserve(item));
    };
  }, [containerRef, selector]);
}

/**
 * Hook para parallax scroll
 * Uso: const ref = useParallax(0.5); // 0.5 = move 50% da velocidade do scroll
 */
export function useParallax(speed = 0.5) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const offset = scrollPosition * speed;
      element.style.transform = `translateY(${offset}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return ref;
}
