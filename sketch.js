let sound;
let isModulating = false;
let isReverbOn = false;
let isFilterOn = false;
let isPitchOn = false;

let angle = 0;
let freqSlider, reverbSlider, filterSlider, pitchSlider;
let reverb, filter;

let mediaRecorder;
let recordedChunks = [];

function preload() {
  soundFormats('mp3', 'ogg');
  try {
    sound = loadSound('fieldrecording1.mp3');
  } catch (e) {
    console.error('⚠️ Failed to load sound:', e);
  }
}

function setup() {
  const container = document.getElementById('canvas-container');
  const canvasWidth = Math.min(container.offsetWidth * 0.9, 400);
  createCanvas(canvasWidth, 200).parent('canvas-container');
  background(200);
  fill(0);
  textAlign(CENTER, CENTER);
  text('Click "Play Sound" to begin', width / 2, height / 2);

  // Play button
  const playBtn = createButton('Play Sound');
  playBtn.parent('canvas-container').style('margin-top', '10px');
  playBtn.mousePressed(async () => {
    await userStartAudio();
    if (getAudioContext().state !== 'running') {
      await getAudioContext().resume();
    }

    if (sound.isPlaying()) {
      sound.stop();
      playBtn.html('Play Sound');
    } else {
      sound.loop();
      playBtn.html('Stop Sound');
    }
  });

  // Modulation
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
  reverb.process(sound, 30, 20);
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

  const filterButton = createButton('Toggle Filter');
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

  // 🔊 Pitch Shift Button + Slider (Updated for more intensity)
  const pitchButton = createButton('Toggle Pitch Shift');
  pitchButton.parent('canvas-container').style('margin-top', '10px');
  pitchButton.mousePressed(() => {
    isPitchOn = !isPitchOn;
    if (isPitchOn) {
      let intenseRate = pitchSlider.value() * 2;
      intenseRate = constrain(intenseRate, 0.1, 4);
      sound.rate(intenseRate);
    } else {
      sound.rate(1); // reset to normal rate
    }
  });

  pitchSlider = createSlider(0.25, 3.0, 1, 0.01);
  pitchSlider.parent('canvas-container').style('width', '100%').style('margin-bottom', '15px');
  pitchSlider.input(() => {
    if (isPitchOn) {
      let intenseRate = pitchSlider.value() * 2;
      intenseRate = constrain(intenseRate, 0.1, 4);
      sound.rate(intenseRate);
    }
  });

  // Recording setup
  const audioCtx = getAudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  reverb.output.connect(dest);

  let options = { mimeType: 'audio/mp4' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.warn('⚠️ audio/mp4 not supported. Falling back to default format.');
    options = {};
  }

  mediaRecorder = new MediaRecorder(dest.stream, options);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const mimeType = mediaRecorder.mimeType || 'audio/webm';
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(recordedChunks, { type: mimeType });
    recordedChunks = [];

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `recorded_output.${extension}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  };

  const recordBtn = createButton('Start Recording');
  recordBtn.parent('canvas-container').style('margin-top', '15px');
  recordBtn.mousePressed(() => {
    if (mediaRecorder.state === 'inactive') {
      mediaRecorder.start();
      recordBtn.html('Stop Recording');
      console.log('🎙️ Recording started');
    } else if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      recordBtn.html('Start Recording');
      console.log('Recording stopped');
    }
  });
}

function draw() {
  clear();
  if (isModulating && sound.isPlaying()) {
    angle += freqSlider.value() * 0.05;
    const volume = map(sin(angle), -1, 1, 0, 1);
    sound.setVolume(volume);
  }
}

function windowResized() {
  const container = document.getElementById('canvas-container');
  const newWidth = Math.min(container.offsetWidth * 0.9, 400);
  resizeCanvas(newWidth, 200);
}
