let teaKettle;
let saucer;
let saucer_cup;
let fullCup;

let kettleTexture;
let cupTexture;

let pourSound;

let fillAmount;
let fillingCup;
let currentCupState;
let calledFilling;
let sentSocket;

let Socket;
const IP = "10.21.40.140:81";

const defaultOrientation = [0, 0, -90];
let orientation = [0, 0, 0];

const CALLIBRATION_ROUNDS = 50;

function preload() {
  teaKettle = loadModel("assets/kettle.obj");
  saucer = loadModel("assets/saucer.obj");
  saucer_cup = loadModel("assets/saucer&cup.obj");
  fullCup = loadModel("assets/fullCup.obj");

  kettleTexture = loadImage("assets/metallic-texture.jpg"); 
  cupTexture = loadImage("assets/cupTexture.jpg");
  soundFormats('wav');
  pourSound = loadSound('assets/pourSound');
}

/**
 * Average all of the data coming in so that we can callibrated the deafult position the virtual tea kettle is in.
 * @param {array} callibrationData Array of all the callibration data saved in memory.
 * @returns Average callibration data to find the default position.
 */
function averageCallibrationArray(callibrationData) {
  const totalCallibration = callibrationData.reduce(
    (perviousValue, currentValue) => {
      return perviousValue.map((value, index) => value + currentValue[index]);
    },
    [0, 0, 0]
  );

  return totalCallibration.map((value) => value / callibrationData.length );
}

function setup() {
  createCanvas(700, 500, WEBGL);
  
  const callibration = [];
  const calculatedCallibration = [0, 0, 0];

  Socket = new WebSocket(`ws://${IP}`);

  Socket.onmessage = function(event) {
    rawData = JSON.parse(event.data);
    
    // If were below the number of callibration rounds.
    if(callibration.length < CALLIBRATION_ROUNDS) {
      callibration.push(rawData);
      const averageCallibration = averageCallibrationArray(callibration);

      
      for(let i = 0; i < calculatedCallibration.length; i++) {
        calculatedCallibration[i] = averageCallibration[i];
      }
    }

    orientation = defaultOrientation.map((value, index) => value + (rawData[index] - calculatedCallibration[index]));
  }

  Socket.onclose = function(event){
    console.log(event);
  }
  
  Socket.onerror = function(event) {
    console.error(event);
  }

  fillAmount = 0;
  calledFilling = false;
  sentSocket = false;
}

function draw() {
  background('rgba(0, 0, 0, 0)');
  camera(0, -350, -300, 0, -300, 0, 0, 1, 0);
  rotate(PI, [1, 0, 0]);
  rotate(PI / 2, [0, 1, 0]);
  translate(400, -150, 0);

  noStroke() 
  textureMode(NORMAL);
  texture(cupTexture);
  if (fillAmount >= 2 && fillAmount < 4) {
    currentCupState = saucer_cup;
  } else if (fillAmount >= 4 && fillAmount < 6) {
    currentCupState = fullCup;
  } else {
    currentCupState = saucer;
  }
  model(currentCupState);
  console.log("fill:", fillAmount);

  texture(kettleTexture);
  orientationMatrix(orientation[0], orientation[1], orientation[2]);
  // translate(-450, 200, 0);
  //rotate(PI, [0, 1, 0]);
  model(teaKettle);

  if (orientation[0] >= 30) {
    pourTea();
  } else {
    //stop pouring sound
    pourSound.stop();
    clearTimeout(fillingCup);
    calledFilling = false;
  }
}

function pourTea() {
  //pouring sound
  if (!pourSound.isPlaying() && fillAmount !== 6) {
    pourSound.playMode('sustain');
    pourSound.play();
  }

  if (!calledFilling) {
    /* every second the user has the right angle, there will be amount
      added to the fillAmount (determines how much of cup is shown) */
    fillingCup = setTimeout(() => {
      if (fillAmount < 5) {
        fillAmount++;
      } else if(fillAmount === 5){
        cupIsFilled();
        fillAmount++;
      } else {
        fillAmount = 0;
      }
    }, 1000);

    calledFilling = true;
  }

}

function cupIsFilled() {
  pourSound.stop();
  if (!sentSocket) {
    //send signal back to arduino to play sound
    setTimeout(() => {
      Socket.send("1");
    }, 1000);

    sentSocket = true;
  }

  sentSocket = false;
}

function orientationMatrix(roll, pitch, heading) {

  let c1 = cos(radians(roll));
  let s1 = sin(radians(roll));
  let c2 = cos(radians(pitch));
  let s2 = sin(radians(pitch));
  let c3 = cos(radians(heading));
  let s3 = sin(radians(heading));

  applyMatrix(c2 * c3, s1 * s3 + c1 * c3 * s2, c3 * s1 * s2 - c1 * s3, 0,
    -s2, c1 * c2, c2 * s1, 0,
    c2 * s3, c1 * s2 * s3 - c3 * s1, c1 * c3 + s1 * s2 * s3, 0,
    0, 400, -150, 1
  );
}