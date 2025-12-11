// ---------- CONFIG ----------
// 15 s adaptation, 20 s test
const ADAPTATION_MS = 15000;
const TEST_MS = 20000;

// Colors (tune these):
const GRAY_BG = "#808080";                 // neutral gray
const MAGENTA = "rgb(255, 0, 255)";        // purple inducer (adjust)
<!-- const GULLY_GREEN = "rgb(1,254,205)";  	   // example; replace with gully green -->
const GULLY_GREEN = "rgb(0,255,140)";  	   // gully green


// ---------- STATE ----------
const participant = {
id: "p_" + Date.now(),
demographics: {},
trials: []
};

// Randomize trial order: A = gray test, B = green test
let trialOrder = ["A", "B"];
if (Math.random() < 0.5) trialOrder = ["B", "A"];
let currentTrialIndex = 0;

const screenDiv = document.getElementById("screen");

// ---------- UTILITIES ----------
function clearScreen() {
screenDiv.innerHTML = "";
}

function showWelcome() {
clearScreen();
const div = document.createElement("div");
div.innerHTML = `
  <h1>Afterimage Experiment</h1>
  <p>This study investigates how colors appear after staring at an image.</p>
  <p>It will take about 5–7 minutes. Please participate only if you feel comfortable.</p>
  <label>
	<input type="checkbox" id="consent">
	I consent to participate in this study.
  </label>
`;
const btn = document.createElement("button");
btn.textContent = "Continue";
btn.onclick = () => {
  const consent = document.getElementById("consent").checked;
  if (!consent) {
	alert("Please provide consent to continue.");
	return;
  }
  showDemographics();
};
div.appendChild(btn);
screenDiv.appendChild(div);
}

function showDemographics() {
clearScreen();
const div = document.createElement("div");
div.innerHTML = `
  <h2>Before we begin</h2>
  <label>Age:
	<input type="number" id="age" min="10" max="100">
  </label>
  <label>Do you have a diagnosed color vision deficiency?
	<select id="cvd">
	  <option value="">Select</option>
	  <option value="no">No</option>
	  <option value="yes">Yes</option>
	  <option value="unsure">Unsure</option>
	</select>
  </label>
  <label>If yes, please describe (optional):
	<input type="text" id="cvd_desc">
  </label>
  <label>Device:
	<select id="device">
	  <option value="">Select</option>
	  <option value="laptop">Laptop</option>
	  <option value="desktop">Desktop</option>
	  <option value="tablet">Tablet</option>
	  <option value="phone">Phone</option>
	</select>
  </label>
  <label>Room lighting:
	<select id="lighting">
	  <option value="">Select</option>
	  <option value="bright">Bright</option>
	  <option value="medium">Medium</option>
	  <option value="dim">Dim</option>
	  <option value="dark">Dark</option>
	</select>
  </label>
`;
const btn = document.createElement("button");
btn.textContent = "Start experiment";
btn.onclick = () => {
  participant.demographics = {
	age: document.getElementById("age").value,
	cvd: document.getElementById("cvd").value,
	cvd_desc: document.getElementById("cvd_desc").value,
	device: document.getElementById("device").value,
	lighting: document.getElementById("lighting").value
  };
//       showInstructions();
showColorScreening();
};
div.appendChild(btn);
screenDiv.appendChild(div);
}

function showInstructions() {
clearScreen();
const div = document.createElement("div");
div.innerHTML = `
  <h2>Instructions</h2>
  <p>Please sit at arm's length from the screen and maximize this window.</p>
  <p>In each trial you will:</p>
  <ol>
	<li>Stare at a small cross in the center of a colored circle for 15 seconds.</li>
	<li>Keep your eyes fixed on the cross when the image changes and observe what you see for 20 seconds.</li>
  </ol>
  <p>Try to keep your eyes as still as possible during the 20-second period.</p>
`;
const btn = document.createElement("button");
btn.textContent = "I am ready";
btn.onclick = () => startTrial();
div.appendChild(btn);
screenDiv.appendChild(div);
}

function startTrial() {
if (currentTrialIndex >= trialOrder.length) {
  showDebrief();
  return;
}

const trialType = trialOrder[currentTrialIndex]; // "A" or "B"
const trial = {
  trialIndex: currentTrialIndex + 1,
  type: trialType,
  adaptationStart: null,
  testStart: null,
  responses: null
};

participant.trials.push(trial);
showAdaptationScreen(trial);
}

function createResponsiveCanvas() {
  const canvas = document.createElement("canvas");
  canvas.id = "stimulusCanvas";

  // Compute a size that fits within the viewport
  // On phones: use most of screen width, on desktop: cap at 600px
  const size = Math.min(
    window.innerWidth * 0.85,
    window.innerHeight * 0.6,
    600
  );
  
  canvas.width = size;
  canvas.height = size;
  canvas.style.display = "block";
  canvas.style.margin = "0 auto";

  return canvas;
}

function showAdaptationScreen(trial) {
clearScreen();

const canvas = createResponsiveCanvas();
screenDiv.appendChild(canvas);

const ctx = canvas.getContext("2d");

// Draw gray background
ctx.fillStyle = GRAY_BG;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Draw magenta circle - scale proportionally to canvas size
const cx = canvas.width / 2;
const cy = canvas.height / 2;
const radius = canvas.width * 0.25; // 25% of canvas width
ctx.beginPath();
ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
ctx.fillStyle = MAGENTA;
ctx.fill();

// Draw fixation cross - scale proportionally
ctx.strokeStyle = "black";
ctx.lineWidth = Math.max(2, canvas.width * 0.004); // Scale line width
const crossSize = canvas.width * 0.02; // 2% of canvas width
ctx.beginPath();
ctx.moveTo(cx - crossSize, cy);
ctx.lineTo(cx + crossSize, cy);
ctx.moveTo(cx, cy - crossSize);
ctx.lineTo(cx, cy + crossSize);
ctx.stroke();

trial.adaptationStart = Date.now();

const info = document.createElement("p");
info.textContent = "Keep looking at the cross. The image will change automatically.";
screenDiv.appendChild(info);

setTimeout(() => showTestScreen(trial), ADAPTATION_MS);
}

function showTestScreen(trial) {
clearScreen();

const canvas = createResponsiveCanvas();
screenDiv.appendChild(canvas);

const ctx = canvas.getContext("2d");

const isGrayCondition = (trial.type === "A");
const bgColor = isGrayCondition ? GRAY_BG : GULLY_GREEN;

ctx.fillStyle = bgColor;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Fixation cross - scale proportionally
const cx = canvas.width / 2;
const cy = canvas.height / 2;
const crossSize = canvas.width * 0.02; // 2% of canvas width
ctx.strokeStyle = "black";
ctx.lineWidth = Math.max(2, canvas.width * 0.004); // Scale line width
ctx.beginPath();
ctx.moveTo(cx - crossSize, cy);
ctx.lineTo(cx + crossSize, cy);
ctx.moveTo(cx, cy - crossSize);
ctx.lineTo(cx, cy + crossSize);
ctx.stroke();

trial.testStart = Date.now();

const info = document.createElement("p");
info.textContent = "Keep looking at the cross. You will answer questions after this screen.";
screenDiv.appendChild(info);

setTimeout(() => showResponseForm(trial), TEST_MS);
}

function showResponseForm(trial) {
clearScreen();
const div = document.createElement("div");
const label = (trial.type === "A") ? "gray background" : "green background";
div.innerHTML = `
  <h2>Trial ${trial.trialIndex} – ${label}</h2>

  <label>Did you see a circle after the image changed?<br>
	<select id="q_presence">
	  <option value="">Select</option>
	  <option value="no">No</option>
	  <option value="yes_faint">Yes – faint</option>
	  <option value="yes_clear">Yes – clearly</option>
	</select>
  </label>

  <label>For how much of the 20 seconds did you see the circle?<br>
	<input type="range" id="q_duration" min="0" max="30" value="15">
	<span id="q_duration_label">15 seconds</span>
  </label>

  <label>At its strongest, how would you describe the circle’s color?<br>
	<select id="q_peak_color">
	  <option value="">Select</option>
	  <option value="grayish">Grayish</option>
	  <option value="desat_green">Desaturated green</option>
	  <option value="vivid_green">Vivid green</option>
	  <option value="blue_green">Blue-green / teal</option>
	  <option value="yellow_green">Yellow-green</option>
	  <option value="other">Other</option>
	</select>
  </label>

  <label>Did the color of the circle change over time?<br>
	<select id="q_timecourse">
	  <option value="">Select</option>
	  <option value="no_change">No, stayed about the same</option>
	  <option value="darker_to_lighter">Started darker and became lighter</option>
	  <option value="green_to_yellow">Started greener and became more yellowish</option>
	  <option value="other">Other change</option>
	</select>
  </label>

  <label>Describe the color(s) you experienced in your own words (optional):<br>
	<textarea id="q_free" rows="4" cols="40"></textarea>
  </label>
`;

const durationSlider = div.querySelector("#q_duration");
const durationLabel = div.querySelector("#q_duration_label");
durationSlider.addEventListener("input", () => {
  durationLabel.textContent = durationSlider.value + " seconds";
});

const btn = document.createElement("button");
btn.textContent = (currentTrialIndex === trialOrder.length - 1)
  ? "Finish experiment"
  : "Continue to next trial";
btn.onclick = () => {
  trial.responses = {
	presence: div.querySelector("#q_presence").value,
	durationSeconds: Number(div.querySelector("#q_duration").value),
	peakColor: div.querySelector("#q_peak_color").value,
	timecourse: div.querySelector("#q_timecourse").value,
	free: div.querySelector("#q_free").value,
	responseTime: Date.now()
  };

  currentTrialIndex += 1;
  if (currentTrialIndex < trialOrder.length) {
	startTrial();
  } else {
	showDebrief();
  }
};

div.appendChild(btn);
screenDiv.appendChild(div);
}

function showDebrief() {
	clearScreen();
	const div = document.createElement("div");
	div.innerHTML = `
	  <h2>Thank you</h2>
	  <p>Thank you for participating. This experiment examines how afterimages behave on different background colors and whether certain combinations can produce unusual color experiences.</p>
	  <p>Your responses have been recorded.</p>
	  <p>You may now close this window.</p>
	`;
	screenDiv.appendChild(div);

	// For now: print data to console; replace with a POST request to your server.
	console.log("Participant data:", JSON.stringify(participant, null, 2));
	submitResults(participant);
}

function showColorScreening() {
  clearScreen();

  const div = document.createElement("div");
  div.innerHTML = `
	<h2>Color Perception Check</h2>
	<p>You will see two images made of colored dots.
	Each image may contain a number or shape.</p>
	<p>If you do not see anything, type “none”.</p>
  `;

  const btn = document.createElement("button");
  btn.textContent = "Begin";
  btn.onclick = () => showPlate(0);

  div.appendChild(btn);
  screenDiv.appendChild(div);
}

const plates = [
  { src: "colorblindness_screening_01.jpg", correct: ["12"] },
  { src: "colorblindness_screening_02.jpg", correct: ["8", "circle"] }
];

const plateResponses = [];

function showPlate(index) {
  clearScreen();
  const plate = plates[index];

  const img = document.createElement("img");
  img.src = plate.src;
  img.style.maxWidth = "500px";
  img.style.display = "block";
  img.style.margin = "20px auto";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "What do you see?";
  input.style.fontSize = "16px";

  const btn = document.createElement("button");
  btn.textContent = (index === plates.length - 1)
	? "Continue"
	: "Next";

  btn.onclick = () => {
	plateResponses.push({
	  plate: plate.src,
	  response: input.value.trim().toLowerCase()
	});

	if (index + 1 < plates.length) {
	  showPlate(index + 1);
	} else {
	  participant.colorScreening = plateResponses;
	  showInstructions(); // enter main experiment
	}
  };

  const div = document.createElement("div");
  div.appendChild(img);
  div.appendChild(input);
  div.appendChild(document.createElement("br"));
  div.appendChild(btn);

  screenDiv.appendChild(div);
}

async function submitResults(resultData) {
  try {
    const response = await fetch('/api/results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resultData)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Server error:', response.status, text);
      return;
    }

    const json = await response.json();
    console.log('Saved:', json);
  } catch (err) {
    console.error('Network error submitting results:', err);
  }
}

// Start
showWelcome();