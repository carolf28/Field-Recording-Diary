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

const helpIcon = document.querySelector('.help-icon');
const helpPopup = document.getElementById('help-popup');
const helpContent = document.querySelector('.help-popup-content');
const closeBtn = document.querySelector('.help-popup-close');

helpIcon.addEventListener('click', (e) => {
  e.stopPropagation();           // prevent bubbling to avoid immediate close
  helpPopup.classList.remove('hidden');
});

closeBtn.addEventListener('click', () => {
  helpPopup.classList.add('hidden');
});

helpPopup.addEventListener('click', (e) => {
  // If the click target is NOT inside helpPopupContent, close popup
  if (!helpContent.contains(e.target)) {
    helpPopup.classList.add('hidden');
  }
});

// Optional: stop clicks inside the popup content from bubbling and closing
helpContent.addEventListener('click', e => {
  e.stopPropagation();
});
