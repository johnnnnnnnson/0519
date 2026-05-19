let video;
let handLandmarks = [];

// 猜拳遊戲的變數
let playerGesture = "未知";
let pcGesture = "等待中";
let resultText = "請出拳！";
let lastUpdateTime = 0;

function setup() {
  createCanvas(400, 400);

  // Initialize webcam capture 
  // 改為建立一般 video 元素，避免與 MediaPipe Camera 搶奪視訊鏡頭
  video = createElement('video');
  video.attribute('playsinline', ''); // 確保在部分瀏覽器能正常播放
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
  
  // 水平翻轉攝影機畫面 (像照鏡子一樣比較直覺)
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();
  
  playerGesture = "未知"; // 每幀重置，若有偵測到手勢再更新

  // Draw detected hand landmarks
  if (handLandmarks && handLandmarks.length > 0) {
    let landmarks = handLandmarks[0]; // 只取第一隻手來玩遊戲
    
    for (let j = 0; j < landmarks.length; j++) {
      // 因為畫面翻轉了，X 座標也要跟著翻轉 (1 - x)
      let x = (1 - landmarks[j].x) * width;
      let y = landmarks[j].y * height;
      fill(0, 255, 0);
      noStroke();
      circle(x, y, 10);
    }
    
    playerGesture = detectGesture(landmarks);
  }

  // 遊戲邏輯：如果玩家有出拳，且距離上次電腦出拳已過 1.5 秒 (1500毫秒)
  if (playerGesture !== "未知" && millis() - lastUpdateTime > 1500) {
    pcGesture = random(["石頭", "剪刀", "布"]);
    resultText = checkWin(playerGesture, pcGesture);
    lastUpdateTime = millis();
  }

  // 繪製遊戲 UI 文字
  textAlign(CENTER, CENTER);
  textSize(32);
  strokeWeight(4);
  stroke(0);
  fill(255);

  text(`你: ${playerGesture}`, width / 4, height - 40);
  text(`電腦: ${pcGesture}`, width * 3 / 4, height - 40);

  textSize(48);
  text(resultText, width / 2, 50);
}

// 判斷手勢的副程式
function detectGesture(landmarks) {
  let wrist = landmarks[0];
  // 計算指尖(tip)到手腕的距離 是否大於 第二關節(pip)到手腕的距離 -> 用來判斷手指有沒有伸直
  let isIndexOpen = dist(landmarks[8].x, landmarks[8].y, wrist.x, wrist.y) > dist(landmarks[6].x, landmarks[6].y, wrist.x, wrist.y);
  let isMiddleOpen = dist(landmarks[12].x, landmarks[12].y, wrist.x, wrist.y) > dist(landmarks[10].x, landmarks[10].y, wrist.x, wrist.y);
  let isRingOpen = dist(landmarks[16].x, landmarks[16].y, wrist.x, wrist.y) > dist(landmarks[14].x, landmarks[14].y, wrist.x, wrist.y);
  let isPinkyOpen = dist(landmarks[20].x, landmarks[20].y, wrist.x, wrist.y) > dist(landmarks[18].x, landmarks[18].y, wrist.x, wrist.y);

  let openCount = isIndexOpen + isMiddleOpen + isRingOpen + isPinkyOpen;

  if (openCount === 0) return "石頭";
  if (openCount >= 3) return "布";
  if (openCount === 2 && isIndexOpen && isMiddleOpen) return "剪刀";

  return "未知";
}

// 判斷輸贏的副程式
function checkWin(player, pc) {
  if (player === pc) return "平手！";
  if ((player === "石頭" && pc === "剪刀") ||
      (player === "剪刀" && pc === "布") ||
      (player === "布" && pc === "石頭")) {
    return "你贏了！🎉";
  }
  return "你輸了！😭";
}
