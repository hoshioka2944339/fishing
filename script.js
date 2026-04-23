const fishData = [
  { id: "001", name: "いか", image: "fish_image/001.png" },
  { id: "002", name: "たこ", image: "fish_image/002.png" },
  { id: "003", name: "くじら", image: "fish_image/003.png" },
  { id: "004", name: "さめ", image: "fish_image/004.png" },
  { id: "005", name: "いるか", image: "fish_image/005.png" },
  { id: "006", name: "かめ", image: "fish_image/006.png" },
  { id: "007", name: "ひとで", image: "fish_image/007.png" },
  { id: "008", name: "あんこう", image: "fish_image/008.png" },
  { id: "009", name: "はりせんぼん", image: "fish_image/009.png" },
  { id: "010", name: "ほしのおさかな", image: "fish_image/010.png" },
  { id: "011", name: "ゆうひのおさかな", image: "fish_image/011.png" },
  { id: "012", name: "そらのさかな", image: "fish_image/012.png" },
  { id: "013", name: "もりのおさかな", image: "fish_image/013.png" },
  { id: "014", name: "つきのおさかな", image: "fish_image/014.png" },
  { id: "015", name: "くらげ", image: "fish_image/015.png" },
  { id: "016", name: "ゆきのおさかな", image: "fish_image/016.png" },
  { id: "017", name: "ひかりのおさかな", image: "fish_image/017.png" },
  { id: "018", name: "ゆめのおさかな", image: "fish_image/018.png" }
];

const storageKey = "fantasy-fishing-book-v1";

const girlImage = document.getElementById("girlImage");
const seaButton = document.getElementById("seaButton");
const messageEl = document.getElementById("message");
const caughtFishImage = document.getElementById("caughtFishImage");
const sparkles = document.getElementById("sparkles");
const panelFishImage = document.getElementById("panelFishImage");
const panelFishName = document.getElementById("panelFishName");
const caughtCount = document.getElementById("caughtCount");
const startPanel = document.getElementById("startPanel");
const successPanel = document.getElementById("successPanel");
const startButton = document.getElementById("startButton");
const continueButton = document.getElementById("continueButton");
const catchButton = document.getElementById("catchButton");
const bookButton = document.getElementById("bookButton");
const bookPanel = document.getElementById("bookPanel");
const closeBookButton = document.getElementById("closeBookButton");
const resetButton = document.getElementById("resetButton");
const bookGrid = document.getElementById("bookGrid");

const shadows = [...document.querySelectorAll("[data-shadow]")];

let stage = "idle";
let currentFish = null;
let hookedTimer = null;
let releaseTimer = null;
let bookState = loadBookState();
let audioContext = null;

function loadBookState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) {
      return saved.filter((id) => fishData.some((fish) => fish.id === id));
    }
  } catch (error) {
    console.warn("book load failed", error);
  }
  return [];
}

function saveBookState() {
  localStorage.setItem(storageKey, JSON.stringify(bookState));
}

function setupAudio() {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(startFrequency, endFrequency, duration) {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playNibbleSound() {
  playTone(420, 520, 0.16);
}

function playCatchSound() {
  playTone(520, 860, 0.18);
  setTimeout(() => playTone(760, 1160, 0.2), 90);
}

function setMessage(text) {
  messageEl.textContent = text;
}

function setGirl(frame) {
  girlImage.src = `girl_image/${frame}.png`;
}

function chooseFish() {
  const uncaught = fishData.filter((fish) => !bookState.includes(fish.id));
  const pool = uncaught.length > 0 && Math.random() < 0.72 ? uncaught : fishData;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showShadows(visible) {
  shadows.forEach((shadow, index) => {
    shadow.classList.toggle("active", visible);
    shadow.style.animationDelay = `${index * 0.25}s`;
  });
}

function clearCatchDisplay() {
  caughtFishImage.classList.add("hidden");
  sparkles.classList.add("hidden");
  catchButton.classList.add("hidden");
  caughtFishImage.removeAttribute("src");
  caughtFishImage.alt = "";
  panelFishImage.removeAttribute("src");
  panelFishImage.alt = "";
  panelFishName.textContent = "";
}

function updateCount() {
  caughtCount.textContent = String(bookState.length);
}

function renderBook() {
  bookGrid.innerHTML = "";

  fishData.forEach((fish) => {
    const caught = bookState.includes(fish.id);
    const card = document.createElement("article");
    card.className = `book-card${caught ? "" : " locked"}`;

    if (caught) {
      card.innerHTML = `
        <img src="${fish.image}" alt="${fish.name}">
        <p>${fish.id} ${fish.name}</p>
        <small>つれたよ</small>
      `;
    } else {
      card.innerHTML = `
        <div class="locked-fish" aria-hidden="true">?</div>
        <p>${fish.id} ???</p>
        <small>まだ つれていないよ</small>
      `;
    }

    bookGrid.append(card);
  });
}

function openBook() {
  bookPanel.classList.remove("hidden");
  bookPanel.setAttribute("aria-hidden", "false");
  bookButton.setAttribute("aria-expanded", "true");
  renderBook();
}

function closeBook() {
  bookPanel.classList.add("hidden");
  bookPanel.setAttribute("aria-hidden", "true");
  bookButton.setAttribute("aria-expanded", "false");
}

function toWaitingStage() {
  clearTimeout(hookedTimer);
  clearTimeout(releaseTimer);
  currentFish = null;
  stage = "waiting";
  setGirl("001");
  clearCatchDisplay();
  successPanel.classList.add("hidden");
  showShadows(true);
  setMessage("くろい さかなかげを タップしてね");
}

function startGame() {
  setupAudio();
  startPanel.classList.add("hidden");
  toWaitingStage();
}

function onWaitingTap() {
  setupAudio();
  currentFish = chooseFish();
  stage = "hooked";
  setGirl("002");
  showShadows(false);
  setMessage("おさかなが かかったよ");
  playNibbleSound();
  hookedTimer = setTimeout(() => {
    stage = "ready";
    setGirl("003");
    catchButton.classList.remove("hidden");
    setMessage("したの タップ！ を おしてね");
  }, 2000);
}

function onReadyTap() {
  if (!currentFish) return;
  setupAudio();
  stage = "caught";
  setGirl("001");
  catchButton.classList.add("hidden");
  caughtFishImage.src = currentFish.image;
  caughtFishImage.alt = currentFish.name;
  caughtFishImage.classList.remove("hidden");
  sparkles.classList.remove("hidden");
  panelFishImage.src = currentFish.image;
  panelFishImage.alt = currentFish.name;
  panelFishName.textContent = currentFish.name;
  successPanel.classList.remove("hidden");
  setMessage(`${currentFish.name} を つったよ`);
  playCatchSound();

  if (!bookState.includes(currentFish.id)) {
    bookState = [...bookState, currentFish.id];
    saveBookState();
    updateCount();
    renderBook();
  }
}

function isOverlayOpen() {
  return startPanel.classList.contains("hidden") === false
    || bookPanel.classList.contains("hidden") === false
    || successPanel.classList.contains("hidden") === false;
}

function handleShadowTap() {
  if (isOverlayOpen()) return;
  if (stage === "waiting") {
    onWaitingTap();
  }
}

function handleSeaTap() {
  if (startPanel.classList.contains("hidden") === false) return;
  if (bookPanel.classList.contains("hidden") === false) return;
}

function resetBook() {
  bookState = [];
  saveBookState();
  updateCount();
  renderBook();
  toWaitingStage();
}

seaButton.addEventListener("click", handleSeaTap);
shadows.forEach((shadow) => shadow.addEventListener("click", handleShadowTap));
startButton.addEventListener("click", startGame);
continueButton.addEventListener("click", toWaitingStage);
catchButton.addEventListener("click", onReadyTap);
bookButton.addEventListener("click", openBook);
closeBookButton.addEventListener("click", closeBook);
resetButton.addEventListener("click", resetBook);

updateCount();
renderBook();
showShadows(false);
setGirl("001");
setMessage("はじめる を おしてね");
