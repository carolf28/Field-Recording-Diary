let activeSound = null;
let activePlayBtn = null;

let isModulating = false;
let isFilterOn = false;
let isTimeStretchOn = false;
let isDelayOn = false;

let angle = 0;
let freqSlider, filterSlider, timeStretchSlider, masterGainSlider;
let delayTimeSlider, delayFeedbackSlider, delayFilterSlider;

let filter;       // Dry filter
let delay;
let delayFilter;  // Filter for delayed signal

let wetGain, dryGain;  // Gains for delay wet/dry mix

let mediaRecorder = null;
let recordedChunks = [];
let dest = null;

let masterGain;

function setup() {
  noCanvas();

  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

  delay = new p5.Delay();

  delayFilter = new p5.LowPass();
  delayFilter.freq(22050);
  delayFilter.res(10);

  const audioCtx = getAudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(audioCtx.destination);

  // Create wet/dry gain nodes for delay effect
  wetGain = audioCtx.createGain();
  dryGain = audioCtx.createGain();
  wetGain.gain.value = 0;
  dryGain.gain.value = 1;

  // Connect delay chain
  delay.connect(delayFilter);
  delayFilter.connect(wetGain);
  wetGain.connect(masterGain);

  // Sliders
  freqSlider = select('#freq-slider');
  filterSlider = select('#filter-slider');
  timeStretchSlider = select('#time-stretch-slider');
  masterGainSlider = select('#master-gain-slider');
  delayTimeSlider = select('#delay-time-slider');
  delayFeedbackSlider = select('#delay-feedback-slider');
  delayFilterSlider = select('#delay-filter-slider');

  if (masterGainSlider) {
    masterGainSlider.input(() => {
      masterGain.gain.value = masterGainSlider.value();
    });
  }

  if (freqSlider) {
    freqSlider.input(() => {
      isModulating = freqSlider.value() > 0;
    });
  }

  if (filterSlider) {
    filterSlider.input(() => {
      // Cutoff filter off at default (slider at 0)
      isFilterOn = filterSlider.value() > 0;
      updateFilter();
    });
  }

  if (timeStretchSlider) {
    timeStretchSlider.input(() => {
      isTimeStretchOn = timeStretchSlider.value() != 0;
      updateTimeStretch();
    });
  }

  if (delayTimeSlider) {
    delayTimeSlider.input(() => {
      isDelayOn = delayTimeSlider.value() > 0 || delayFeedbackSlider.value() > 0 || delayFilterSlider.value() > 0;
      updateDelay();
    });
  }
  if (delayFeedbackSlider) {
    delayFeedbackSlider.input(() => {
      isDelayOn = delayTimeSlider.value() > 0 || delayFeedbackSlider.value() > 0 || delayFilterSlider.value() > 0;
      updateDelay();
    });
  }
  if (delayFilterSlider) {
    delayFilterSlider.input(() => {
      isDelayOn = delayTimeSlider.value() > 0 || delayFeedbackSlider.value() > 0 || delayFilterSlider.value() > 0;
      updateDelay();
    });
  }

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

  const recordBtn = select('#record-btn');
  if (recordBtn) {
    recordBtn.mousePressed(() => {
      if (!mediaRecorder) setupRecorder();

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
}

function draw() {
  if (isModulating && activeSound && activeSound.isPlaying()) {
    angle += freqSlider ? freqSlider.value() * 0.05 : 0.05;
    // Clamp volume between 0.3 and 1 to avoid full silence
    const volume = map(sin(angle), -1, 1, 0.3, 1);
    activeSound.setVolume(volume);
  } else if (activeSound && activeSound.isPlaying()) {
    activeSound.setVolume(1); // Reset volume to full when modulation off
  }
}

function startSound(soundInstance, playBtn) {
  if (!soundInstance) return;

  soundInstance.disconnect();

  // Connect soundInstance to filter
  soundInstance.connect(filter);

  // Disconnect previous connections on filter
  filter.disconnect();

  // Split filter output to dryGain and delay input
  filter.connect(dryGain);
  filter.connect(delay);

  dryGain.connect(masterGain);

  soundInstance.loop();
  soundInstance.setVolume(1);  // Ensure starting volume is full

  playBtn.html('Stop Sound');
  activeSound = soundInstance;
  activePlayBtn = playBtn;

  updateFilter();
  updateTimeStretch();
  updateDelay();
}

function updateFilter() {
  if (!activeSound) return;
  const mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
  filter.freq(isFilterOn ? mappedFreq : 22050);
}

function updateTimeStretch() {
  if (!activeSound) return;
  let val = timeStretchSlider.value();
  let rate = isTimeStretchOn ? map(val, -1, 1, 0.5, 2) : 1;
  rate = constrain(rate, 0.5, 2);
  activeSound.rate(rate);
}

function updateDelay() {
  if (!activeSound) return;

  const audioCtx = getAudioContext();

  const delayTimeTarget = map(delayTimeSlider.value(), 0, 1, 0, 1.5);
  if (delay.delayTime.setTargetAtTime) {
    delay.delayTime.setTargetAtTime(delayTimeTarget, audioCtx.currentTime, 0.05);
  } else {
    delay.delayTime(delayTimeTarget);
  }

  const feedback = constrain(delayFeedbackSlider.value(), 0.01, 0.7);
  const filterFreq = map(delayFilterSlider.value(), 0, 1, 100, 10000);

  delay.feedback(feedback);
  delay.filter(filterFreq);

  if (isDelayOn) {
    wetGain.gain.value = 0.5;
    dryGain.gain.value = 0.5;
  } else {
    wetGain.gain.value = 0;
    dryGain.gain.value = 1;
  }
}

function setupRecorder() {
  if (!activeSound) {
    console.warn('No active sound to record');
    return;
  }

  const audioCtx = getAudioContext();
  if (dest) dest.disconnect();
  dest = audioCtx.createMediaStreamDestination();

  masterGain.disconnect();
  masterGain.connect(audioCtx.destination);
  masterGain.connect(dest);

  let options = { mimeType: 'audio/mp4' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
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

    // Trigger download
    a.click();

    // Remove the anchor after a short delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };
}
