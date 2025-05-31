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

let mediaRecorder;
let recordedChunks = [];

function setup() {
  noCanvas();

  // Setup global effects chain
  reverb = new p5.Reverb();
  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

  // Connect filter → reverb → master output
  filter.disconnect();
  filter.connect(reverb);
  reverb.disconnect();
  reverb.connect();

  // Create MediaStreamDestination to record from effects output (reverb)
  const audioCtx = getAudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  reverb.output.connect(dest);

  // Setup MediaRecorder from effects output stream
  mediaRecorder = new MediaRecorder(dest.stream);
  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    recordedChunks = [];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recording.webm';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  // Select sliders and buttons from HTML
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

  // Record button
  select('#record-btn').mousePressed(() => {
    if (mediaRecorder.state === 'inactive') {
      mediaRecorder.start();
      console.log('🎙️ Recording started');
      select('#record-btn').html('Stop Recording');
    } else if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      console.log('Recording stopped');
      select('#record-btn').html('Start Recording');
    }
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

      // Stop currently playing sound if different from this
      if (activeSound && activeSound.isPlaying() && activeSound !== soundInstance) {
        activeSound.stop();
        if (activePlayBtn) activePlayBtn.html('Play Sound');
      }

      // Load sound if not loaded yet
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
}

function draw() {
  if (isModulating && activeSound && activeSound.isPlaying()) {
    angle += freqSlider.value() * 0.05;
    const volume = map(sin(angle), -1, 1, 0, 1);
    activeSound.setVolume(volume);
  }
}

function startSound(soundInstance, playBtn) {
  soundInstance.disconnect();   // Disconnect from default output
  soundInstance.connect(filter); // Connect to filter (effects chain)

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
