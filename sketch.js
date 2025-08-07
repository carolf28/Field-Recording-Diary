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

  select('#modulation-btn').mousePressed(() => {
    isModulating = !isModulating;
    if (!isModulating && activeSound) activeSound.setVolume(1);
  });

  select('#filter-btn').mousePressed(() => {
    isFilterOn = !isFilterOn;
    updateFilter();
  });

  if (filterSlider) {
    filterSlider.input(() => {
      if (isFilterOn) updateFilter();
    });
  }

  select('#time-stretch-btn').mousePressed(() => {
    isTimeStretchOn = !isTimeStretchOn;
    updateTimeStretch();
  });

  if (timeStretchSlider) {
    timeStretchSlider.input(() => {
      if (isTimeStretchOn) updateTimeStretch();
    });
  }

  // Delay toggle button (optional: add one if you want delay on/off)
  // Uncomment below if you want to control delay on/off with a button:
  // select('#delay-btn').mousePressed(() => {
  //   isDelayOn = !isDelayOn;
  //   updateDelay();
  // });

  // Instead, here delay is always applied when sliders move and isDelayOn is true:
  // Let's turn delay ON always for testing:
  isDelayOn = true;

  if (delayTimeSlider) delayTimeSlider.input(() => updateDelay());
  if (delayFeedbackSlider) delayFeedbackSlider.input(() => updateDelay());
  if (delayFilterSlider) delayFilterSlider.input(() => updateDelay());

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
    const volume = map(sin(angle), -1, 1, 0, 1);
    activeSound.setVolume(volume);
  }
}

function startSound(soundInstance, playBtn) {
  if (!soundInstance) return;

  soundInstance.disconnect();
  filter.disconnect();
  delay.disconnect();
  delayFilter.disconnect();
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

  if (!isTimeStretchOn) {
    activeSound.rate(1);
    return;
  }

  const val = parseFloat(timeStretchSlider.value());
  let rate = val < 0 ? map(val, -1, 0, 0.5, 1) : map(val, 0, 1, 1, 2);
  rate = constrain(rate, 0.5, 2);
  activeSound.rate(rate);
}

function updateDelay() {
  if (!activeSound) return;

  activeSound.disconnect();
  filter.disconnect();
  delay.disconnect();
  delayFilter.disconnect();
  masterGain.disconnect();

  const delayTime = map(delayTimeSlider.value(), 0, 1, 0, 1.5);
  const feedback = constrain(delayFeedbackSlider.value(), 0.1, 0.9);
  const filterFreq = map(delayFilterSlider.value(), 0, 1, 100, 10000);

  delay.delayTime(delayTime);
  delay.feedback(feedback);
  delay.filter(filterFreq);

  if (isDelayOn) {
    activeSound.connect(filter);
    filter.connect(masterGain);

    filter.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(masterGain);
  } else {
    activeSound.connect(filter);
    filter.connect(masterGain);
  }

  masterGain.connect(getAudioContext().destination);
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
    const blob = new Blob(recordedChunks, { type: recordedChunks[0].type });
    const url = URL.createObjectURL(blob);
    const a = createA(url, 'Download Recording');
    a.attribute('download', 'recording.mp4');
    a.parent(document.body);
  };
}
