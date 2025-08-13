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

  const repeatedText = text + '   ' + text;
  marqueeSpan.textContent = repeatedText;

  const marqueeContainer = document.querySelector('.announcement-bar .marquee');
  const containerWidth = marqueeContainer.offsetWidth;
  const textWidth = marqueeSpan.scrollWidth;

  
  const speed = 100; 
  const duration = textWidth / speed; 


  marqueeSpan.style.animation = `marquee ${duration}s linear infinite`;
}


window.addEventListener('load', makeMarquee);

//pop up help

document.addEventListener('DOMContentLoaded', () => {
  const toggleControlsBtn = document.getElementById('toggle-controls');
  const effectsPanel = document.querySelector('.effects-panel');
  const helpIcon = document.querySelector('.help-icon');
  const helpPopup = document.getElementById('help-popup');
  const helpCloseBtn = document.querySelector('.help-popup-close');

  // Toggle effects
  toggleControlsBtn.addEventListener('click', () => {
    effectsPanel.classList.toggle('hidden');
  });

  //  help popup when clicking thek icon
  helpIcon.addEventListener('click', () => {
    helpPopup.classList.remove('hidden');
  });

  // Close help popup
  helpCloseBtn.addEventListener('click', () => {
    helpPopup.classList.add('hidden');
  });

  helpPopup.addEventListener('click', (e) => {
    if (e.target === helpPopup) {
      helpPopup.classList.add('hidden');
    }
  });
});