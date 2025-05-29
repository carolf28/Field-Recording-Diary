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
  // Responsive canvas width: 90% of container or max 400px
  const container = document.getElementById('canvas-container');
  const canvasWidth = Math.min(container.offsetWidth * 0.9, 400);
  createCanvas(canvasWidth, 200).parent('canvas-container');

  // Play Button from HTML
  const playBtn = document.getElementById('play-sound-btn');
  playBtn.addEventListener('click', async () => {
    await userStartAudio(); // Unlock audio context on first interaction

    if (sound.isPlaying()) {
      sound.stop();
      playBtn.textContent = 'Play / Stop Field Recording';
    } else {
      sound.loop();
      playBtn.textContent = 'Stop Field Recording';
    }
  });

  // Create modulation button & slider
  const modButton = createButton('Modulation');
  modButton.parent('canvas-container');
  modButton.style('margin-top', '10px');
  modButton.mousePressed(() => {
    isModulating = !isModulating;
    if (!isModulating) {
      sound.setVolume(1);
    }
  });

  freqSlider = createSlider(0.1, 10, 1, 0.1);
  freqSlider.parent('canvas-container');
  freqSlider.style('width', '100%');
  freqSlider.style('margin-bottom', '15px');

  // Setup reverb effect
  reverb = new p5.Reverb();
  reverb.process(sound, 15, 10);
  reverb.amp(2);

  // Setup filter effect
  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

  // Chain: sound → filter → reverb → output
  sound.disconnect();
  sound.connect(filter);
  filter.connect(reverb);

  // Reverb button & slider
  const reverbButton = createButton('Reverb');
  reverbButton.parent('canvas-container');
  reverbButton.style('margin-top', '10px');
  reverbButton.mousePressed(() => {
    isReverbOn = !isReverbOn;
    let dryWetVal = isReverbOn ? pow(reverbSlider.value(), 2) : 0;
    reverb.drywet(dryWetVal);
    sound.amp(isReverbOn ? 0.4 : 1);
  });

  reverbSlider = createSlider(0, 1, 0, 0.01);
  reverbSlider.parent('canvas-container');
  reverbSlider.style('width', '100%');
  reverbSlider.style('margin-bottom', '15px');
  reverbSlider.input(() => {
    if (isReverbOn) {
      let intensity = pow(reverbSlider.value(), 2);
      reverb.drywet(intensity);
      sound.amp(1 - 0.6 * intensity);
    }
  });

  // Filter button & slider
  const filterButton = createButton('Filter');
  filterButton.parent('canvas-container');
  filterButton.style('margin-top', '10px');
  filterButton.mousePressed(() => {
    isFilterOn = !isFilterOn;
    if (isFilterOn) {
      let mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
      filter.freq(mappedFreq);
    } else {
      filter.freq(22050);
    }
  });

  filterSlider = createSlider(0, 1, 0, 0.01);
  filterSlider.parent('canvas-container');
  filterSlider.style('width', '100%');
  filterSlider.style('margin-bottom', '15px');
  filterSlider.input(() => {
    if (isFilterOn) {
      let mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
      filter.freq(mappedFreq);
    }
  });

  // Optional: log audio context state to debug
  setInterval(() => {
    console.log('AudioContext state:', getAudioContext().state);
  }, 5000);
}

function draw() {
  clear(); // clear background to transparent

  if (isModulating && sound.isPlaying()) {
    angle += freqSlider.value() * 0.05;
    let volume = map(sin(angle), -1, 1, 0, 1);
    sound.setVolume(volume);
  }
}

// Responsive canvas on window resize
function windowResized() {
  const container = document.getElementById('canvas-container');
  const newWidth = Math.min(container.offsetWidth * 0.9, 400);
  resizeCanvas(newWidth, 200);
}
