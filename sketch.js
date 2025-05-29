let sound;
let mic, recorder, soundFile;

let state = 0; // 0 = ready to record, 1 = recording, 2 = stopped recording (ready to play/save)

let isModulating = false;
let isReverbOn = false;
let isFilterOn = false;

let angle = 0;
let freqSlider, reverbSlider, filterSlider;
let reverb, filter;

function preload() {
  soundFormats('mp3', 'ogg');
  sound = loadSound('fieldrecording1.mp3'); // Your audio file
}

function setup() {
  const container = document.getElementById('canvas-container');
  const canvasWidth = Math.min(container.offsetWidth * 0.9, 400);
  createCanvas(canvasWidth, 200).parent('canvas-container');
  background(200);
  fill(0);
  textAlign(CENTER, CENTER);
  text('Click "Start Recording" to begin', width/2, height/2);

  // MIC & recorder setup
  mic = new p5.AudioIn();
  mic.start();

  recorder = new p5.SoundRecorder();
  recorder.setInput(mic);

  soundFile = new p5.SoundFile();

  // Play Button
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

  // Modulation button
  const modButton = createButton('Modulation');
  modButton.parent('canvas-container').style('margin-top', '10px');
  modButton.mousePressed(() => {
    isModulating = !isModulating;
    if (!isModulating) sound.setVolume(1);
  });

  freqSlider = createSlider(0.1, 10, 1, 0.1);
  freqSlider.parent('canvas-container').style('width', '100%').style('margin-bottom', '15px');

  // Reverb
  reverb = new p5.Reverb();
  reverb.process(sound, 15, 10);
  reverb.amp(2);

  // Filter
  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

  sound.disconnect();
  sound.connect(filter);
  filter.connect(reverb);

  const reverbButton = createButton('Reverb');
  reverbButton.parent('canvas-container').style('margin-top', '10px');
  reverbButton.mousePressed(() => {
    isReverbOn = !isReverbOn;
    const val = isReverbOn ? pow(reverbSlider.value(), 2) : 0;
    reverb.drywet(val);
    sound.amp(isReverbOn ? 0.4 : 1);
  });

  reverbSlider = createSlider(0, 1, 0, 0.01);
  reverbSlider.parent('canvas-container').style('width', '100%').style('margin-bottom', '15px');
  reverbSlider.input(() => {
    if (isReverbOn) {
      const intensity = pow(reverbSlider.value(), 2);
      reverb.drywet(intensity);
      sound.amp(1 - 0.6 * intensity);
    }
  });

  const filterButton = createButton('Filter');
  filterButton.parent('canvas-container').style('margin-top', '10px');
  filterButton.mousePressed(() => {
    isFilterOn = !isFilterOn;
    const mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
    filter.freq(isFilterOn ? mappedFreq : 22050);
  });

  filterSlider = createSlider(0, 1, 0, 0.01);
  filterSlider.parent('canvas-container').style('width', '100%').style('margin-bottom', '15px');
  filterSlider.input(() => {
    if (isFilterOn) {
      const mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
      filter.freq(mappedFreq);
    }
  });

  // RECORDING BUTTON (uses the 3-step state logic you want)
  const recordBtn = createButton('Start Recording');
  recordBtn.parent('canvas-container').style('margin-top', '15px');
  recordBtn.mousePressed(async () => {
    await userStartAudio();

    if (state === 0 && mic.enabled) {
      // Start recording
      soundFile = new p5.SoundFile(); // reset soundFile
      recorder.record(soundFile);
      state = 1;
      recordBtn.html('Recording... Click to stop');
      background(255, 0, 0);
      clearText();
      fill(255);
      text('Recording now! Click to stop.', width / 2, height / 2);
      console.log('🎙️ Recording started');
    } else if (state === 1) {
      // Stop recording
      recorder.stop();
      state = 2;
      recordBtn.html('Click to Play & Save');
      background(0, 255, 0);
      clearText();
      fill(0);
      text('Recording stopped. Click to play & save', width / 2, height / 2);
      console.log('💾 Recording stopped');
    } else if (state === 2) {
      // Play and save
      soundFile.play();
      saveSound(soundFile, 'myRecording.wav');
      state = 0;
      recordBtn.html('Start Recording');
      background(200);
      clearText();
      fill(0);
      text('Click "Start Recording" to begin', width / 2, height / 2);
      console.log('▶️ Played and saved recording');
    }
  });
}

function draw() {
  // Clear text area on canvas without clearing background color:
  // (We only update text on record button click, so no text in draw)
  clear();

  if (isModulating && sound.isPlaying()) {
    angle += freqSlider.value() * 0.05;
    const volume = map(sin(angle), -1, 1, 0, 1);
    sound.setVolume(volume);
  }
}

function clearText() {
  // Helper: clear text area rectangle on canvas, leaving background color intact
  fill(backgroundColor());
  noStroke();
  rect(0, 0, width, height);
}

function backgroundColor() {
  // Return current background color, you can customize if you want
  return color(200);
}

function windowResized() {
  const container = document.getElementById('canvas-container');
  const newWidth = Math.min(container.offsetWidth * 0.9, 400);
  resizeCanvas(newWidth, 200);
}
