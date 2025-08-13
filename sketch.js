let activeSound = null;
let activePlayBtn = null;

let isModulating = false;
let isFilterOn = false;
let isTimeStretchOn = false;
let isDelayOn = false;
let isReverbOn = false;

let angle = 0;
let freqSlider, filterSlider, timeStretchSlider, masterGainSlider;
let delayTimeSlider, delayFeedbackSlider, delayFilterSlider;
let reverbWetSlider;

let filter;
let delay;
let delayFilter;
let reverb;

let dryGain, delayWetGain, reverbWetGain;
let delaySendGain, reverbSendGain;

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

  reverb = new p5.Reverb();

  const audioCtx = getAudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(audioCtx.destination);

  dryGain = audioCtx.createGain();
  dryGain.gain.value = 1;

  delayWetGain = audioCtx.createGain();
  delayWetGain.gain.value = 0;

  reverbWetGain = audioCtx.createGain();
  reverbWetGain.gain.value = 0;

  delaySendGain = audioCtx.createGain();
  delaySendGain.gain.value = 0; // start off (bypass)

  reverbSendGain = audioCtx.createGain();
  reverbSendGain.gain.value = 0; // start off (bypass)

  // Connect delay chain
  delaySendGain.connect(delay);
  delay.connect(delayFilter);
  delayFilter.connect(delayWetGain);
  delayWetGain.connect(masterGain);

  // Connect reverb chain
  reverbSendGain.connect(reverb);
  reverb.connect(reverbWetGain);
  reverbWetGain.connect(masterGain);

  // Button click toggles for effects
  document.querySelectorAll('.effects-console button[data-effect]').forEach(button => {
    button.addEventListener('click', function () {
      this.classList.toggle('active');
      const effect = this.dataset.effect;
      toggleEffect(effect, this.classList.contains('active'));
    });
  });

  // Sliders auto-activate effects when changed
  const sliderEffectMap = {
    'freq-slider': 'modulation',
    'filter-slider': 'filter',
    'time-stretch-slider': 'time-stretch',
    'delay-time-slider': 'delay-time',
    'delay-feedback-slider': 'delay-feedback',
    'delay-filter-slider': 'delay-filter',
    'reverb-wet-slider': 'reverb'
  };

  Object.entries(sliderEffectMap).forEach(([sliderId, effect]) => {
    const slider = document.getElementById(sliderId);
    const button = document.querySelector(`button[data-effect="${effect}"]`);

    if (slider && button) {
      slider.addEventListener('input', () => {
        if (!button.classList.contains('active')) {
          button.classList.add('active');
          toggleEffect(effect, true);
        }
      });
    }
  });

  // Get slider references
  freqSlider = select('#freq-slider');
  filterSlider = select('#filter-slider');
  timeStretchSlider = select('#time-stretch-slider');
  masterGainSlider = select('#master-gain-slider');
  delayTimeSlider = select('#delay-time-slider');
  delayFeedbackSlider = select('#delay-feedback-slider');
  delayFilterSlider = select('#delay-filter-slider');
  reverbWetSlider = select('#reverb-wet-slider');

  if (masterGainSlider) {
    masterGainSlider.input(() => {
      masterGain.gain.value = masterGainSlider.value();
    });
  }

  if (freqSlider) {
    freqSlider.input(() => { isModulating = freqSlider.value() > 0; });
  }

  if (filterSlider) {
    filterSlider.input(() => { isFilterOn = filterSlider.value() > 0; updateFilter(); });
  }

  if (timeStretchSlider) {
    timeStretchSlider.input(() => { isTimeStretchOn = timeStretchSlider.value() != 0; updateTimeStretch(); });
  }

  if (delayTimeSlider) delayTimeSlider.input(() => updateDelay());
  if (delayFeedbackSlider) delayFeedbackSlider.input(() => updateDelay());
  if (delayFilterSlider) delayFilterSlider.input(() => updateDelay());
  if (reverbWetSlider) reverbWetSlider.input(() => updateReverb());

  // Sound loading for each container and play button setup
  const containers = selectAll('.canvas-container');
  containers.forEach(container => {
    const audioFile = container.elt.dataset.audio;
    let soundInstance = null;
    const playBtn = createButton('').parent(container);

    // Add a CSS class instead of inline styles
    playBtn.addClass('my-play-button paused'); // start with paused state

    playBtn.mousePressed(async () => {
      await userStartAudio();

      if (activeSound && activeSound.isPlaying() && activeSound !== soundInstance) {
        activeSound.stop();
        if (activePlayBtn) {
          activePlayBtn.removeClass('playing').addClass('paused');
        }
      }

      if (!soundInstance) {
        soundInstance = loadSound(audioFile, () => {
          startSound(soundInstance, playBtn);
        }, err => console.error('Failed to load sound:', err));
      } else {
        if (soundInstance.isPlaying()) {
          soundInstance.stop();
          playBtn.removeClass('playing').addClass('paused');
          activeSound = null;
          activePlayBtn = null;
        } else {
          startSound(soundInstance, playBtn);
        }
      }
    });
  });

  // Recording button
  const recordBtn = select('#record-btn');
  if (recordBtn) {
    recordBtn.mousePressed(() => {
      if (!mediaRecorder) setupRecorder();
      if (mediaRecorder.state === 'inactive') {
        recordedChunks = [];
        mediaRecorder.start();
        recordBtn.html('Stop Recording');
      } else {
        mediaRecorder.stop();
        recordBtn.html('Start Recording');
      }
    });
  }
}

function draw() {
  if (isModulating && activeSound && activeSound.isPlaying()) {
    angle += freqSlider ? freqSlider.value() * 0.05 : 0.05;
    const volume = map(sin(angle), -1, 1, 0.3, 1);
    activeSound.setVolume(volume);
  } else if (activeSound && activeSound.isPlaying()) {
    activeSound.setVolume(1);
  }
}

function toggleEffect(effect, isActive) {
  switch (effect) {
    case 'modulation':
      isModulating = isActive;
      break;
    case 'filter':
      isFilterOn = isActive;
      updateFilter();
      break;
    case 'time-stretch':
      isTimeStretchOn = isActive;
      updateTimeStretch();
      break;
    case 'delay-time':
    case 'delay-feedback':
    case 'delay-filter':
      isDelayOn = isActive;
      updateDelay();
      break;
    case 'reverb':
      isReverbOn = isActive;
      updateReverb();
      break;
  }
}

function startSound(soundInstance, playBtn) {
  if (!soundInstance) return;
  soundInstance.disconnect();

  // Connect the sound source to filter
  soundInstance.connect(filter);

  filter.disconnect();

  // Connect filter output to dryGain AND send gains for delay and reverb
  filter.connect(dryGain);

  filter.connect(delaySendGain);  // signal goes to delay only if send gain > 0
  filter.connect(reverbSendGain); // signal goes to reverb only if send gain > 0

  dryGain.connect(masterGain);

  soundInstance.loop();
  soundInstance.setVolume(1);

  playBtn.removeClass('paused').addClass('playing');
  activeSound = soundInstance;
  activePlayBtn = playBtn;

  updateFilter();
  updateTimeStretch();
  updateDelay();
  updateReverb();
}

function updateFilter() {
  if (!activeSound) return;
  const mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
  filter.freq(isFilterOn ? mappedFreq : 22050);
}

function updateTimeStretch() {
  if (!activeSound) return;
  let val = timeStretchSlider.value();
  let rate = val != 0 ? map(val, -1, 1, 0.5, 2) : 1;
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

  const delayActive = delayTimeSlider.value() > 0 || delayFeedbackSlider.value() > 0 || delayFilterSlider.value() > 0;

  delaySendGain.gain.value = delayActive ? 1 : 0;
  delayWetGain.gain.value = delayActive ? 0.5 : 0;

  dryGain.gain.value = 1 - delayWetGain.gain.value - reverbWetGain.gain.value;
}

function updateReverb() {
  if (!activeSound) return;
  const wetVal = reverbWetSlider.value();
  isReverbOn = wetVal > 0;

  reverbSendGain.gain.value = isReverbOn ? 1 : 0;
  reverbWetGain.gain.value = wetVal;

  dryGain.gain.value = 1 - wetVal - delayWetGain.gain.value;
  reverb.set(wetVal * 5, 1.2);
}

function setupRecorder() {
  if (!activeSound) return;
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
    a.download = `recording_${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };
}

window.setup = setup;
window.draw = draw;
