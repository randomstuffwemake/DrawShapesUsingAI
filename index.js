import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

let handLandmarker;
let leftPinched = false;
let rightPinched = false;
let leftRightIndexPinched = false;
let leftRightThumbPinched = false;
let leftIndexRightThumbPinched = false;
let leftThumbRightIndexPinched = false;
let isLeftHand = false;
let isRightHand = false;
let leftIndex = 0;
let rightIndex = 0;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

async function createHandLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numHands: 2
    });
}

function drawLine(start, end, color = "red") {
    context.beginPath();
    context.moveTo(start.x * canvas.width, start.y * canvas.height);
    context.lineTo(end.x * canvas.width, end.y * canvas.height);
    context.lineWidth = 8;
    context.strokeStyle = color;
    context.lineCap = "round";
    context.stroke();
}

function calculateDistance(point1, point2) {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
}

function processDetections(detections) {
    if (detections.handednesses.length) {
        const detectedHands = detections.handednesses.length;
        isLeftHand = detectedHands === 2 || detections.handednesses[0][0].index === 1;
        isRightHand = detectedHands === 2 || detections.handednesses[0][0].index === 0;

        if (detectedHands === 2) {
            [leftIndex, rightIndex] = detections.handednesses[0][0].index === 1 ? [0, 1] : [1, 0];
        }
    } else {
        isLeftHand = isRightHand = leftPinched = rightPinched = leftRightIndexPinched = leftRightThumbPinched = leftIndexRightThumbPinched = leftThumbRightIndexPinched = false;
    }

    function processHand(index, isPinched) {
        const indexTip = detections.landmarks[index][8];
        const thumbTip = detections.landmarks[index][4];
        if (calculateDistance(indexTip, thumbTip) < 0.04) {
            isPinched = true;
        }
        if (isPinched) {
            drawLine(indexTip, thumbTip);
        }
        return isPinched;
    }

    if (isLeftHand && !isRightHand) {
        leftPinched = processHand(0, leftPinched);
    }
    
    if (!isLeftHand && isRightHand) {
        rightPinched = processHand(0, rightPinched);
    }

    if (isLeftHand && isRightHand) {
        leftPinched = processHand(leftIndex, leftPinched);
        rightPinched = processHand(rightIndex, rightPinched);

        const leftIndexTip = detections.landmarks[leftIndex][8];
        const rightIndexTip = detections.landmarks[rightIndex][8];
        const leftThumbTip = detections.landmarks[leftIndex][4];
        const rightThumbTip = detections.landmarks[rightIndex][4];

        if (calculateDistance(leftIndexTip, rightIndexTip) < 0.04) {
            leftRightIndexPinched = true;   
        }
        if (calculateDistance(leftThumbTip, rightThumbTip) < 0.04) {
            leftRightThumbPinched = true;
        }
        if (calculateDistance(leftIndexTip, rightThumbTip) < 0.04) {
            leftIndexRightThumbPinched = true;
        }
        if (calculateDistance(leftThumbTip, rightIndexTip) < 0.04) {
            leftThumbRightIndexPinched = true;
        }
        if (leftRightIndexPinched) {
            drawLine(
                { x: leftIndexTip.x, y: leftIndexTip.y },
                { x: rightIndexTip.x, y: rightIndexTip.y }
            );
        }
        if (leftRightThumbPinched) {
            drawLine(
                { x: leftThumbTip.x, y: leftThumbTip.y },
                { x: rightThumbTip.x, y: rightThumbTip.y }
            );
        }
        if (leftIndexRightThumbPinched) {
            drawLine(
                { x: leftIndexTip.x, y: leftIndexTip.y },
                { x: rightThumbTip.x, y: rightThumbTip.y }
            );
        }
        if (leftThumbRightIndexPinched) {
            drawLine(
                { x: leftThumbTip.x, y: leftThumbTip.y },
                { x: rightIndexTip.x, y: rightIndexTip.y }
            );
        }
    }
}

function startDetection() {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const detections = handLandmarker.detect(canvas)
    processDetections(detections);
    window.requestAnimationFrame(startDetection);
}

navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } }).then( async function(mediaStream) {
    video.srcObject = mediaStream;
    video.play();
    video.addEventListener("loadeddata", async () => {
        await createHandLandmarker();
        startDetection();
    });
});