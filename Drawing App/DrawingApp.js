const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const sizeSlider = document.getElementById("sizeSlider");
const sizeValue  = document.getElementById("sizeValue");

const penBtn    = document.getElementById("penBtn");
const eraserBtn = document.getElementById("eraserBtn");

const undoBtn  = document.getElementById("undoBtn");
const redoBtn  = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const saveBtn  = document.getElementById("saveBtn");

let drawing = false;
let lastX = 0, lastY = 0;
let tool = "pen";

let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 40;

function setCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const snapshot = ctx.getImageData(0, 0, canvas.width || 1, canvas.height || 1);
  canvas.width  = Math.round(rect.width * devicePixelRatio);
  canvas.height = Math.round(rect.height * devicePixelRatio);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  if (snapshot.width && snapshot.height) {
    const off = document.createElement("canvas");
    off.width = snapshot.width;
    off.height = snapshot.height;
    off.getContext("2d").putImageData(snapshot, 0, 0);
    ctx.drawImage(off, 0, 0, rect.width, rect.height);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}
setCanvasSize();
window.addEventListener("resize", setCanvasSize);

function pushHistory() {
  try {
    const data = ctx.getImageData(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
    undoStack.push(data);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
  } catch {}
}

function restoreImage(imageData) {
  if (!imageData) return;
  const off = document.createElement("canvas");
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  off.width = imageData.width;
  off.height = imageData.height;
  off.getContext("2d").putImageData(imageData, 0, 0);
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(off, 0, 0, w, h);
}

function updateHistoryButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function getPos(e) {
  if (e.touches && e.touches[0]) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  } else {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
}

function beginStroke(x, y) {
  drawing = true;
  lastX = x; lastY = y;
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function drawTo(x, y) {
  if (!drawing) return;
  ctx.lineWidth = parseInt(sizeSlider.value, 10);
  if (tool === "pen") {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = colorPicker.value;
  } else {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  }
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x; lastY = y;
}

function endStroke() {
  if (!drawing) return;
  drawing = false;
  ctx.closePath();
  pushHistory();
}

canvas.addEventListener("mousedown", e => { beginStroke(...Object.values(getPos(e))); });
canvas.addEventListener("mousemove", e => { drawTo(...Object.values(getPos(e))); });
canvas.addEventListener("mouseup", endStroke);
canvas.addEventListener("mouseleave", endStroke);

canvas.addEventListener("touchstart", e => { e.preventDefault(); beginStroke(...Object.values(getPos(e))); }, {passive:false});
canvas.addEventListener("touchmove",  e => { e.preventDefault(); drawTo(...Object.values(getPos(e))); }, {passive:false});
canvas.addEventListener("touchend",   e => { e.preventDefault(); endStroke(); }, {passive:false});

sizeSlider.addEventListener("input", () => { sizeValue.textContent = sizeSlider.value; });
sizeValue.textContent = sizeSlider.value;

penBtn.addEventListener("click", () => {
  tool = "pen";
  penBtn.classList.add("active");
  eraserBtn.classList.remove("active");
});

eraserBtn.addEventListener("click", () => {
  tool = "eraser";
  eraserBtn.classList.add("active");
  penBtn.classList.remove("active");
});

undoBtn.addEventListener("click", () => {
  if (!undoStack.length) return;
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  const current = ctx.getImageData(0,0,w,h);
  redoStack.push(current);
  const prev = undoStack.pop();
  restoreImage(prev);
  updateHistoryButtons();
});

redoBtn.addEventListener("click", () => {
  if (!redoStack.length) return;
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  const current = ctx.getImageData(0,0,w,h);
  undoStack.push(current);
  const img = redoStack.pop();
  restoreImage(img);
  updateHistoryButtons();
});

clearBtn.addEventListener("click", () => {
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  ctx.clearRect(0,0,w,h);
  pushHistory();
});

saveBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `drawing-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "z") { e.preventDefault(); undoBtn.click(); }
  if (e.ctrlKey && e.key.toLowerCase() === "y") { e.preventDefault(); redoBtn.click(); }
  if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); saveBtn.click(); }
  if (e.ctrlKey && e.key.toLowerCase() === "k") { e.preventDefault(); clearBtn.click(); }
  if (e.key.toLowerCase() === "p") { penBtn.click(); }
  if (e.key.toLowerCase() === "e") { eraserBtn.click(); }
});

pushHistory();
updateHistoryButtons();
