let activeSound = null;
let activePlayBtn = null;

let isModulating = false;
let isFilterOn = false;
let isTimeStretchOn = false;
let isDelayOn = false;

let angle = 0;
let freqSlider, filterSlider, timeStretchSlider, masterGainSlider;
let delayTimeSlider, delayFeedbackSlider, delayFilterSlider;

let filter;
let delay;
let mediaRecorder = null;
let recordedChunks = [];
let dest = null;

let masterGain;

function setup() {
  noCanvas();

  // Effects setup
  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

  delay = new p5.Delay();

  // Master gain setup
  const audioCtx = getAudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(audioCtx.destination);

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

  // Modulation (can remove or keep if you want)
  select('#modulation-btn').mousePressed(() => {
    isModulating = !isModulating;
    if (!isModulating && activeSound) activeSound.setVolume(1);
  });

  // Filter
  select('#filter-btn').mousePressed(() => {
    isFilterOn = !isFilterOn;
    updateFilter();
  });
  filterSlider.input(() => {
    if (isFilterOn) updateFilter();
  });

  // Time stretch
  select('#time-stretch-btn').mousePressed(() => {
    isTimeStretchOn = !isTimeStretchOn;
    updateTimeStretch();
  });
  timeStretchSlider.input(() => {
    if (isTimeStretchOn) updateTimeStretch();
  });

  // Delay
  select('#delay-btn').mousePressed(() => {
    isDelayOn = !isDelayOn;
    updateDelay();
  });
  delayTimeSlider.input(() => {
    if (isDelayOn) updateDelay();
  });
  delayFeedbackSlider.input(() => {
    if (isDelayOn) updateDelay();
  });
  delayFilterSlider.input(() => {
    if (isDelayOn) updateDelay();
  });

  // Play buttons
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

  // Recording
  const recordBtn = select('#record-btn');
  recordBtn.mousePressed(() => {
    if (!mediaRecorder) {
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
  if (!soundInstance) return;

  soundInstance.disconnect();
  filter.disconnect();
  delay.disconnect();
  masterGain.disconnect();

  soundInstance.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(getAudioContext().destination);

  soundInstance.loop();
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

  if (isTimeStretchOn) {
    let sliderVal = parseFloat(timeStretchSlider.value()); // Expected -1 to 1 but here 0.5 to 2 in UI
    // Adjusting for 0.5 to 2 range, remap to -1 to 1
    let normalizedVal = map(sliderVal, 0.5, 2, -1, 1);
    let rate = 1;
    if (normalizedVal < 0) {
      rate = map(normalizedVal, -1, 0, 0.5, 1);
    } else {
      rate = map(normalizedVal, 0, 1, 1, 2);
    }
    rate = constrain(rate, 0.5, 2);
    activeSound.rate(rate);
  } else {
    activeSound.rate(1);
  }
}

function updateDelay() {
  if (!activeSound) return;

  if (isDelayOn) {
    let sliderVal = parseFloat(delayTimeSlider.value()); // 0 to 2, center 1

    const maxDelay = 3; // max delay in seconds
    let delayTime = 0;

    if (sliderVal < 1) {
      // Left side: maxDelay to 0
      delayTime = map(sliderVal, 0, 1, maxDelay, 0);
    } else {
      // Right side: 0 to maxDelay
      delayTime = map(sliderVal, 1, 2, 0, maxDelay);
    }

    const feedback = constrain(delayFeedbackSlider.value(), 0, 0.9);
    const filterFreq = map(delayFilterSlider.value(), 0, 1, 100, 5000);

    delay.delayTime(delayTime);
    delay.feedback(feedback);
    delay.filter(filterFreq);

    // Connect delay after filter and before masterGain
    activeSound.disconnect();
    activeSound.connect(filter);
    filter.disconnect();
    filter.connect(delay);
    delay.disconnect();
    delay.connect(masterGain);

  } else {
    // Bypass delay
    activeSound.disconnect();
    activeSound.connect(filter);
    filter.disconnect();
    filter.connect(masterGain);
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
    a.click();
    URL.revokeObjectURL(url);
  };
}
