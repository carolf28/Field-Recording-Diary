// Global vars
let activeSound = null;        // Currently playing p5.SoundFile
let activePlayBtn = null;      // Currently active play button

let isModulating = false;
let isReverbOn = false;
let isFilterOn = false;
let isPitchOn = false;

let angle = 0;
let freqSlider, reverbSlider, filterSlider, pitchSlider;
let reverb, filter;

function setup() {
  noCanvas();

  // Setup global effects
  reverb = new p5.Reverb();
  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

  // Effects console buttons and sliders (assume these exist in your HTML)
  freqSlider = select('#freq-slider');
  reverbSlider = select('#reverb-slider');
  filterSlider = select('#filter-slider');
  pitchSlider = select('#pitch-slider');

  select('#modulation-btn').mousePressed(() => {
    isModulating = !isModulating;
    if (!isModulating && activeSound) activeSound.setVolume(1);
  });

  select('#reverb-btn').mousePressed(() => {
    isReverbOn = !isReverbOn;
    updateReverb();
  });
  reverbSlider.input(() => {
    if (isReverbOn) updateReverb();
  });

  select('#filter-btn').mousePressed(() => {
    isFilterOn = !isFilterOn;
    updateFilter();
  });
  filterSlider.input(() => {
    if (isFilterOn) updateFilter();
  });

  select('#pitch-btn').mousePressed(() => {
    isPitchOn = !isPitchOn;
    updatePitch();
  });
  pitchSlider.input(() => {
    if (isPitchOn) updatePitch();
  });

  // Setup play buttons for each sound container
  const containers = selectAll('.canvas-container');
  containers.forEach(container => {
    const audioFile = container.elt.dataset.audio;
    let soundInstance = null;

    // Create play button inside container
    const playBtn = createButton('Play Sound').parent(container);
    playBtn.style('margin-top', '10px');

    playBtn.mousePressed(async () => {
      await userStartAudio();

      // If currently active sound is playing and different from this, stop it
      if (activeSound && activeSound.isPlaying() && activeSound !== soundInstance) {
        activeSound.stop();
        if (activePlayBtn) activePlayBtn.html('Play Sound');
      }

      // If soundInstance not loaded, load it now
      if (!soundInstance) {
        soundInstance = loadSound(audioFile, () => {
          startSound(soundInstance, playBtn);
        }, err => console.error('Failed to load sound:', err));
      } else {
        // Toggle play/stop for this sound
        if (soundInstance.isPlaying()) {
          soundInstance.stop();
          playBtn.html('Play Sound');
          activeSound = null;
          activePlayBtn = null;
        } else {
          startSound(soundInstance, playBtn);
        }
      }
    });
  });
}

function draw() {
  if (isModulating && activeSound && activeSound.isPlaying()) {
    angle += freqSlider.value() * 0.05;
    const volume = map(sin(angle), -1, 1, 0, 1);
    activeSound.setVolume(volume);
  }
}

function startSound(soundInstance, playBtn) {
  // Connect effects chain for this sound
  soundInstance.disconnect();
  soundInstance.connect(filter);
  filter.connect(reverb);
  reverb.process(soundInstance, 3, 2);

  soundInstance.loop();
  playBtn.html('Stop Sound');
  activeSound = soundInstance;
  activePlayBtn = playBtn;

  // Update effects to current settings
  updateReverb();
  updateFilter();
  updatePitch();
}

function updateReverb() {
  if (!activeSound) return;
  const val = isReverbOn ? pow(reverbSlider.value(), 2) : 0;
  reverb.drywet(val);
  activeSound.amp(isReverbOn ? 0.4 : 1);
}

function updateFilter() {
  if (!activeSound) return;
  const mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
  filter.freq(isFilterOn ? mappedFreq : 22050);
}

function updatePitch() {
  if (!activeSound) return;
  if (isPitchOn) {
    let rate = pitchSlider.value() * 2;
    rate = constrain(rate, 0.1, 4);
    activeSound.rate(rate);
  } else {
    activeSound.rate(1);
  }
}
