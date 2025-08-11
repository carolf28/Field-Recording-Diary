  const gridWrapper = document.querySelector('.grid-wrapper');

  window.addEventListener('wheel', (e) => {
    if (!gridWrapper) return;

    // Check if gridWrapper can scroll in the wheel direction
    const canScrollUp = gridWrapper.scrollTop > 0;
    const canScrollDown = gridWrapper.scrollTop + gridWrapper.clientHeight < gridWrapper.scrollHeight;

    if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
      e.preventDefault(); // Prevent the default page scroll (if any)
      gridWrapper.scrollBy({ top: e.deltaY });
    }
  }, { passive: false });

const toggleBtn = document.querySelector('.toggle-controls-button');
const effectsConsole = document.querySelector('.effects-console');
const effectsPanel = document.querySelector('.effects-panel');

toggleBtn.addEventListener('click', () => {
  const isShown = effectsConsole.classList.toggle('show');
  if (isShown) {
    effectsPanel.classList.add('active');
  } else {
    effectsPanel.classList.remove('active');
  }
});



function makeMarquee() {
  const marqueeSpan = document.querySelector('.announcement-bar .marquee span');
  if (!marqueeSpan) return;

  const text = marqueeSpan.textContent.trim();

  // Repeat the text twice so it can scroll seamlessly
  const repeatedText = text + '   ' + text;
  marqueeSpan.textContent = repeatedText;

  // Get widths for animation calculation
  const marqueeContainer = document.querySelector('.announcement-bar .marquee');
  const containerWidth = marqueeContainer.offsetWidth;
  const textWidth = marqueeSpan.scrollWidth;

  // Calculate animation duration based on text width (adjust speed here)
  const speed = 100; // pixels per second
  const duration = textWidth / speed; // seconds

  // Set CSS animation on the span
  marqueeSpan.style.animation = `marquee ${duration}s linear infinite`;
}

// Run it on page load
window.addEventListener('load', makeMarquee);
