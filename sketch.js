let video;
let handLandmarks = [];

// 猜拳遊戲的變數
let playerGesture = "未知";
let pcGesture = "等待中";
let resultText = "請出拳！";
// 新增遊戲狀態控制
let gameState = "WAITING"; // "WAITING" (等待出拳), "SHOW_RESULT" (顯示結果), 或 "STOPPED" (暫停)
let timerStart = 0;
let lastToggleTime = 0; // 紀錄上次切換狀態的時間，防止連觸

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
  
  let currentGesture = "未知"; // 當下這幀偵測到的手勢

  // Draw detected hand landmarks
  if (handLandmarks && handLandmarks.length > 0) {
    let landmarks = handLandmarks[0]; // 只取第一隻手來玩遊戲
    
    // 繪製手部骨架連線
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // 拇指
      [0, 5], [5, 6], [6, 7], [7, 8],       // 食指
      [5, 9], [9, 10], [10, 11], [11, 12],  // 中指
      [9, 13], [13, 14], [14, 15], [15, 16],// 無名指
      [13, 17], [17, 18], [18, 19], [19, 20],// 小指
      [0, 17]                               // 手掌根部
    ];
    
    stroke(0, 255, 255); // 設定骨架線條顏色 (青色)
    strokeWeight(3);
    for (let i = 0; i < connections.length; i++) {
      let [p1, p2] = connections[i];
      let x1 = (1 - landmarks[p1].x) * width;
      let y1 = landmarks[p1].y * height;
      let x2 = (1 - landmarks[p2].x) * width;
      let y2 = landmarks[p2].y * height;
      line(x1, y1, x2, y2);
    }

    // 繪製手部關節點
    for (let j = 0; j < landmarks.length; j++) {
      // 因為畫面翻轉了，X 座標也要跟著翻轉 (1 - x)
      let x = (1 - landmarks[j].x) * width;
      let y = landmarks[j].y * height;
      fill(0, 255, 0);
      noStroke();
      circle(x, y, 10);
    }
    
    currentGesture = detectGesture(landmarks);
  }

  // 新增：利用「讚」手勢來切換遊戲暫停或重新開始 (加上 1 秒的冷卻時間防連觸)
  if (currentGesture === "讚" && millis() - lastToggleTime > 1000) {
    if (gameState === "STOPPED") {
      gameState = "WAITING"; // 恢復遊戲
    } else {
      gameState = "STOPPED"; // 暫停遊戲
      resultText = "遊戲已暫停 (比 👍 重新開始)";
    }
    lastToggleTime = millis();
  }

  // 遊戲邏輯與狀態切換
  if (gameState === "WAITING") {
    playerGesture = currentGesture; // 持續更新玩家手勢
    
    // 排除「讚」與「未知」，避免誤判為出拳
    if (playerGesture === "石頭" || playerGesture === "剪刀" || playerGesture === "布") {
      // 一旦偵測到有效出拳，電腦隨機出拳並結算
      pcGesture = random(["石頭", "剪刀", "布"]);
      resultText = checkWin(playerGesture, pcGesture);
      gameState = "SHOW_RESULT";
      timerStart = millis(); // 開始計時
    } else {
      pcGesture = "等待中...";
      resultText = "請對著鏡頭出拳！(比 👍 暫停)";
    }
  } else if (gameState === "SHOW_RESULT") {
    // 顯示結果 2 秒 (2000毫秒) 後，重置回等待狀態
    if (millis() - timerStart > 2000) {
      gameState = "WAITING";
    }
  } else if (gameState === "STOPPED") {
    playerGesture = "暫停";
    pcGesture = "暫停";
  }

  // 繪製遊戲 UI 文字
  textAlign(CENTER, CENTER);
  textSize(20);
  strokeWeight(3); // 邊框變細一點點
  stroke(0);
  fill(255);

  text(`你: ${playerGesture}`, width / 4, height - 25);
  text(`電腦: ${pcGesture}`, width * 3 / 4, height - 25);

  textSize(32);
  text(resultText, width / 2, 40);
}

// 判斷手勢的副程式
function detectGesture(landmarks) {
  let wrist = landmarks[0];
  let pinkyBase = landmarks[17]; // 小指根部

  // 判斷大拇指：拇指指尖(4)到小指根部(17)的距離，若大於 拇指關節(3)到小指根部的距離，代表大拇指是張開的
  let isThumbOpen = dist(landmarks[4].x, landmarks[4].y, pinkyBase.x, pinkyBase.y) > dist(landmarks[3].x, landmarks[3].y, pinkyBase.x, pinkyBase.y);

  // 計算指尖(tip)到手腕的距離 是否大於 第二關節(pip)到手腕的距離 -> 用來判斷手指有沒有伸直
  let isIndexOpen = dist(landmarks[8].x, landmarks[8].y, wrist.x, wrist.y) > dist(landmarks[6].x, landmarks[6].y, wrist.x, wrist.y);
  let isMiddleOpen = dist(landmarks[12].x, landmarks[12].y, wrist.x, wrist.y) > dist(landmarks[10].x, landmarks[10].y, wrist.x, wrist.y);
  let isRingOpen = dist(landmarks[16].x, landmarks[16].y, wrist.x, wrist.y) > dist(landmarks[14].x, landmarks[14].y, wrist.x, wrist.y);
  let isPinkyOpen = dist(landmarks[20].x, landmarks[20].y, wrist.x, wrist.y) > dist(landmarks[18].x, landmarks[18].y, wrist.x, wrist.y);

  let openCount = isIndexOpen + isMiddleOpen + isRingOpen + isPinkyOpen;

  // 加入「讚」的判定：其他四指彎曲且大拇指伸直
  if (openCount === 0 && isThumbOpen) return "讚";
  if (openCount === 0 && !isThumbOpen) return "石頭";
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
