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
