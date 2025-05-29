let sound;
let isModulating = false;
let isReverbOn = false;
let isFilterOn = false;

let angle = 0;
let freqSlider;
let reverbSlider;
let filterSlider;

let reverb;
let filter;

function preload() {
  sound = loadSound('fieldrecording1.mp3');
}

function setup() {
  createCanvas(400, 200).parent('canvas-container');

  // Native Play button from HTML
  const playBtn = document.getElementById('play-sound-btn');
  playBtn.addEventListener('click', async () => {
    await userStartAudio();

    if (sound.isPlaying()) {
      sound.stop();
      playBtn.textContent = 'Play / Stop Field Recording';
    } else {
      sound.loop();
      playBtn.textContent = 'Stop Field Recording';
    }
  });

  // Modulation Button (p5.js button)
  const modButton = createButton('Modulation');
  modButton.parent('canvas-container');
  modButton.mousePressed(() => {
    isModulating = !isModulating;
    if (!isModulating) {
      sound.setVolume(1);
    }
  });

  // Modulation Frequency Slider
  freqSlider = createSlider(0.1, 10, 1, 0.1);
  freqSlider.parent('canvas-container');

  // Reverb setup
  reverb = new p5.Reverb();
  reverb.process(sound, 15, 10);
  reverb.amp(2);

  // Filter setup
  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

  // Chain sound → filter → reverb → output
  sound.disconnect();
  sound.connect(filter);
  filter.connect(reverb);

  // Reverb Button
  const reverbButton = createButton('Reverb');
  reverbButton.parent('canvas-container');
  reverbButton.mousePressed(() => {
    isReverbOn = !isReverbOn;
    let dryWetVal = isReverbOn ? pow(reverbSlider.value(), 2) : 0;
    reverb.drywet(dryWetVal);
    sound.amp(isReverbOn ? 0.4 : 1);
  });

  // Reverb Slider
  reverbSlider = createSlider(0, 1, 0, 0.01);
  reverbSlider.parent('canvas-container');
  reverbSlider.input(() => {
    if (isReverbOn) {
      let intensity = pow(reverbSlider.value(), 2);
      reverb.drywet(intensity);
      sound.amp(1 - 0.6 * intensity);
    }
  });

  // Filter Toggle Button
  const filterButton = createButton('Filter');
  filterButton.parent('canvas-container');
  filterButton.mousePressed(() => {
    isFilterOn = !isFilterOn;
    if (isFilterOn) {
      let mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
      filter.freq(mappedFreq);
    } else {
      filter.freq(22050);
    }
  });

  // Filter Slider
  filterSlider = createSlider(0, 1, 0, 0.01);
  filterSlider.parent('canvas-container');
  filterSlider.input(() => {
    if (isFilterOn) {
      let mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
      filter.freq(mappedFreq);
    }
  });

  // Optional: debug audio context state
  setInterval(() => {
    console.log('AudioContext state:', getAudioContext().state);
  }, 5000);
}

function draw() {
  // No background clearing here, so canvas stays transparent

  if (isModulating && sound.isPlaying()) {
    angle += freqSlider.value() * 0.05;
    let volume = map(sin(angle), -1, 1, 0, 1);
    sound.setVolume(volume);
  }
}
