// Global variables
let activeSound = null;
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

  // Setup effects
  reverb = new p5.Reverb();
  filter = new p5.LowPass();
  filter.freq(22050);
  filter.res(10);

  // Select sliders and buttons from the HTML effects console
  freqSlider = select('#freq-slider');
  reverbSlider = select('#reverb-slider');
  filterSlider = select('#filter-slider');
  pitchSlider = select('#pitch-slider');

  const modButton = select('#modulation-btn');
  const reverbButton = select('#reverb-btn');
  const filterButton = select('#filter-btn');
  const pitchButton = select('#pitch-btn');
  const recordButton = select('#record-btn');

  // Modulation toggle
  modButton.mousePressed(() => {
    isModulating = !isModulating;
    if (!isModulating && activeSound) activeSound.setVolume(1);
  });

  // Reverb toggle
  reverbButton.mousePressed(() => {
    isReverbOn = !isReverbOn;
    if (!activeSound) return;
    if (isReverbOn) {
      const val = pow(reverbSlider.value(), 2);
      reverb.process(activeSound, 30, 20); // Your longer reverb time & decay
      reverb.drywet(val);
      activeSound.amp(1 - 0.6 * val);
    } else {
      reverb.drywet(0);
      activeSound.amp(1);
    }
  });
  reverbSlider.input(() => {
    if (!activeSound || !isReverbOn) return;
    const val = pow(reverbSlider.value(), 2);
    reverb.drywet(val);
    activeSound.amp(1 - 0.6 * val);
  });

  // Filter toggle
  filterButton.mousePressed(() => {
    isFilterOn = !isFilterOn;
    if (!activeSound) return;
    const mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
    filter.freq(isFilterOn ? mappedFreq : 22050);
  });
  filterSlider.input(() => {
    if (!activeSound || !isFilterOn) return;
    const mappedFreq = map(filterSlider.value(), 0, 1, 22050, 100);
    filter.freq(mappedFreq);
  });

  // Pitch Shift toggle
  pitchButton.mousePressed(() => {
    isPitchOn = !isPitchOn;
    if (!activeSound) return;
    if (isPitchOn) {
      let rate = pitchSlider.value() * 2;
      rate = constrain(rate, 0.1, 4);
      activeSound.rate(rate);
    } else {
      activeSound.rate(1);
    }
  });
  pitchSlider.input(() => {
    if (!activeSound || !isPitchOn) return;
    let rate = pitchSlider.value() * 2;
    rate = constrain(rate, 0.1, 4);
    activeSound.rate(rate);
  });

  // Setup play buttons under each .canvas-container
  document.querySelectorAll('.canvas-container').forEach(container => {
    const audioFile = container.dataset.audio;

    let playBtn = container.querySelector('button.play-sound-btn');
    if (!playBtn) {
      playBtn = createButton('Play Sound').class('play-sound-btn').parent(container);
    }

    playBtn.mousePressed(async () => {
      await userStartAudio();

      if (activeSound && activeSound.isPlaying()) {
        activeSound.stop();
        playBtn.html('Play Sound');
        return;
      }

      if (activeSound) {
        activeSound.stop();
        document.querySelectorAll('.play-sound-btn').forEach(btn => btn.html('Play Sound'));
      }

      activeSound = loadSound(audioFile, () => {
        activeSound.disconnect();
        activeSound.connect(filter);
        filter.connect(reverb);
        reverb.process(activeSound, 30, 20); // Apply your reverb time here

        activeSound.loop();
        playBtn.html('Stop Sound');

        // Reset effect states on new sound
        if (!isReverbOn) reverb.drywet(0);
        if (!isFilterOn) filter.freq(22050);
        if (!isPitchOn) activeSound.rate(1);
        activeSound.amp(1);
      }, err => console.error('Failed to load:', err));
    });
  });

  // Setup mediaRecorder for recording from reverb output
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

  recordButton.mousePressed(() => {
    if (mediaRecorder.state === 'inactive') {
      mediaRecorder.start();
      recordButton.html('Stop Recording');
      console.log('🎙️ Recording started');
    } else if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      recordButton.html('Start Recording');
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
