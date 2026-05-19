let video;
let handLandmarks = [];

function setup() {
  createCanvas(400, 400);

  // Initialize webcam capture
  video = createCapture(VIDEO);
  video.size(400, 400);
  video.hide(); // Hide the default HTML video element

  // Set up MediaPipe Hands
  const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }});
  
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  
  hands.onResults((results) => {
    handLandmarks = results.multiHandLandmarks;
  });

  // Set up MediaPipe Camera utility
  const camera = new Camera(video.elt, {
    onFrame: async () => {
      await hands.send({image: video.elt});
    },
    width: 400,
    height: 400
  });
  camera.start();
}

function draw() {
  background(220);
  
  // Draw the webcam feed
  image(video, 0, 0, width, height);
  
  // Draw detected hand landmarks
  if (handLandmarks && handLandmarks.length > 0) {
    for (let i = 0; i < handLandmarks.length; i++) {
      let landmarks = handLandmarks[i];
      for (let j = 0; j < landmarks.length; j++) {
        let x = landmarks[j].x * width;
        let y = landmarks[j].y * height;
        fill(0, 255, 0);
        noStroke();
        circle(x, y, 10);
      }
    }
  }
}
