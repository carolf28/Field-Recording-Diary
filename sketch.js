// Global vars
let activeSound = null;
let activePlayBtn = null;

let isModulating = false;
let isReverbOn = false;
let isFilterOn = false;
let isPitchOn = false;

let angle = 0;
let freqSlider, reverbSlider, filterSlider, pitchSlider;
let reverb, filter;

let mediaRecorder = null;
let recordedChunks = [];
let dest = null; // MediaStreamDestination

function setup() {
  noCanvas();

  // Setup global effects
  reverb = new p5.Reverb();
  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

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

  const containers = selectAll('.canvas-container');
  containers.forEach(container => {
    const audioFile = container.elt.dataset.audio;
    let soundInstance = null;

    const playBtn = createButton('Play Sound').parent(container);
    playBtn.style('margin-top', '10px');

    playBtn.mousePressed(async () => {
      await userStartAudio();

      if (activeSound && activeSound.isPlaying() && activeSound !== soundInstance) {
        activeSound.stop();
        if (activePlayBtn) activePlayBtn.html('Play Sound');
      }

      if (!soundInstance) {
        soundInstance = loadSound(audioFile, () => {
          startSound(soundInstance, playBtn);
        }, err => console.error('Failed to load sound:', err));
      } else {
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

  // Setup recording button
  const recordBtn = select('#record-btn');
  recordBtn.mousePressed(() => {
    if (!mediaRecorder) {
      // Setup MediaRecorder only when first requested
      setupRecorder();
    }

    if (mediaRecorder.state === 'inactive') {
      recordedChunks = [];
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
  if (isModulating && activeSound && activeSound.isPlaying()) {
    angle += freqSlider.value() * 0.05;
    const volume = map(sin(angle), -1, 1, 0, 1);
    activeSound.setVolume(volume);
  }
}

function startSound(soundInstance, playBtn) {
  soundInstance.disconnect();
  soundInstance.connect(filter);
  filter.connect(reverb);
  reverb.process(soundInstance, 3, 2);

  soundInstance.loop();
  playBtn.html('Stop Sound');
  activeSound = soundInstance;
  activePlayBtn = playBtn;

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

function setupRecorder() {
  if (!activeSound) {
    console.warn('No active sound to record');
    return;
  }

  const audioCtx = getAudioContext();

  if (dest) {
    // If already created, disconnect and recreate to avoid duplicates
    dest.disconnect();
  }

  dest = audioCtx.createMediaStreamDestination();

  reverb.output.disconnect();
  reverb.output.connect(dest);

  let options = { mimeType: 'audio/mp4' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.warn('audio/mp4 not supported, falling back');
    options = { mimeType: 'audio/webm' };
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
}
