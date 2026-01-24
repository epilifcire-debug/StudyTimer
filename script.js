let timer = null;
let isRunning = false;
let isStudyTime = true;

let studyMinutes = 25;
let breakMinutes = 5;
let totalCycles = 4;
let currentCycle = 1;

let remainingSeconds = 0;
let endTimestamp = null; // ⏱️ controle real de tempo

const timeDisplay = document.getElementById("time-display");
const statusDisplay = document.querySelector(".status");

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");

const studyInput = document.getElementById("study-time");
const breakInput = document.getElementById("break-time");
const cyclesInput = document.getElementById("cycles");

// 🔊 Áudio real
const alarm = new Audio("/StudyTimer/alarm.mp3");
alarm.preload = "auto";
let audioUnlocked = false;

// 🔓 Desbloqueia áudio no primeiro clique
function unlockAudio() {
  if (audioUnlocked) return;

  alarm.play()
    .then(() => {
      alarm.pause();
      alarm.currentTime = 0;
      audioUnlocked = true;
      console.log("Áudio desbloqueado");
    })
    .catch(() => {});
}

// Atualiza display a partir de remainingSeconds
function updateDisplayFromSeconds(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  timeDisplay.textContent =
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// Lê SEMPRE os últimos valores digitados
function readInputs() {
  studyMinutes = parseInt(studyInput.value) || 1;
  breakMinutes = parseInt(breakInput.value) || 1;
  totalCycles = parseInt(cyclesInput.value) || 1;
}

// Configura novo período (estudo ou descanso)
function setNewPeriod() {
  readInputs();

  if (isStudyTime) {
    remainingSeconds = studyMinutes * 60;
    statusDisplay.textContent = `📚 Estudando — Ciclo ${currentCycle} de ${totalCycles}`;
  } else {
    remainingSeconds = breakMinutes * 60;
    statusDisplay.textContent = "☕ Descansando";
  }

  // Define timestamp real de término
  endTimestamp = Date.now() + remainingSeconds * 1000;
  updateDisplayFromSeconds(remainingSeconds);
}

// Envia notificação via Service Worker
function sendNotification(message) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "notify",
      text: message
    });
  }
}

// 🔔 Alarme completo
function playAlarm(message) {
  // Som
  alarm.currentTime = 0;
  alarm.play().catch(() => {});

  // Vibração
  if ("vibrate" in navigator) {
    navigator.vibrate([500, 200, 500]);
  }

  // Notificação
  sendNotification(message);
}

// Finaliza período atual
function finishPeriod() {
  if (isStudyTime) {
    playAlarm("⏰ Hora de descansar!");
    isStudyTime = false;
  } else {
    playAlarm("📚 Hora de voltar a estudar!");
    isStudyTime = true;
    currentCycle++;

    if (currentCycle > totalCycles) {
      stopTimer();
      statusDisplay.textContent = "🎉 Sessão concluída!";
      playAlarm("🎉 Sessão de estudos concluída!");
      return;
    }
  }

  setNewPeriod();
}

// Loop baseado em timestamp real
function startRealTimerLoop() {
  if (timer) clearInterval(timer);

  timer = setInterval(() => {
    if (!isRunning || !endTimestamp) return;

    const now = Date.now();
    const diffMs = endTimestamp - now;
    let diffSeconds = Math.ceil(diffMs / 1000);

    if (diffSeconds <= 0) {
      remainingSeconds = 0;
      updateDisplayFromSeconds(0);
      finishPeriod();
    } else {
      remainingSeconds = diffSeconds;
      updateDisplayFromSeconds(diffSeconds);
    }
  }, 1000);
}

// Iniciar
function startTimer() {
  unlockAudio();

  if (isRunning) return;

  readInputs();

  if (remainingSeconds === 0 || !endTimestamp) {
    setNewPeriod();
  } else {
    // Retoma de onde parou
    endTimestamp = Date.now() + remainingSeconds * 1000;
  }

  isRunning = true;
  startRealTimerLoop();
}

// Pausar
function pauseTimer() {
  if (!isRunning) return;

  clearInterval(timer);
  isRunning = false;

  // Atualiza remainingSeconds com base no relógio real
  if (endTimestamp) {
    const diffMs = endTimestamp - Date.now();
    remainingSeconds = Math.max(0, Math.ceil(diffMs / 1000));
  }

  statusDisplay.textContent += " (Pausado)";
}

// 🔁 Reset inteligente: volta para o ÚLTIMO valor digitado
function stopTimer() {
  clearInterval(timer);
  isRunning = false;
  isStudyTime = true;
  currentCycle = 1;
  endTimestamp = null;

  // Lê novamente os inputs atuais
  readInputs();

  remainingSeconds = studyMinutes * 60;
  statusDisplay.textContent = "Pronto para começar";
  updateDisplayFromSeconds(remainingSeconds);
}

// Eventos
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", stopTimer);

// Inicializa com os valores atuais dos inputs
readInputs();
remainingSeconds = studyMinutes * 60;
updateDisplayFromSeconds(remainingSeconds);

// Permissão de notificação
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
