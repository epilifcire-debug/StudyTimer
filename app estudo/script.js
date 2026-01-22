let timer = null;
let isRunning = false;
let isStudyTime = true;

let studyMinutes = 25;
let breakMinutes = 5;
let totalCycles = 4;
let currentCycle = 1;

let remainingSeconds = 0;

const timeDisplay = document.getElementById("time-display");
const statusDisplay = document.querySelector(".status");

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");

const studyInput = document.getElementById("study-time");
const breakInput = document.getElementById("break-time");
const cyclesInput = document.getElementById("cycles");

// Áudio simples de alarme
const alarm = new Audio();
alarm.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

// Atualiza display
function updateDisplay() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  timeDisplay.textContent =
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

// Configura novo período
function setNewPeriod() {
  if (isStudyTime) {
    remainingSeconds = studyMinutes * 60;
    statusDisplay.textContent = `📚 Estudando — Ciclo ${currentCycle} de ${totalCycles}`;
  } else {
    remainingSeconds = breakMinutes * 60;
    statusDisplay.textContent = "☕ Descansando";
  }
  updateDisplay();
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

// Toca alarme + vibra + notifica
function playAlarm(message) {
  // Som
  alarm.play().catch(() => {});

  // Vibração
  if ("vibrate" in navigator) {
    navigator.vibrate([300, 150, 300]);
  }

  // Notificação em segundo plano
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

// Inicia timer
function startTimer() {
  if (isRunning) return;

  studyMinutes = parseInt(studyInput.value);
  breakMinutes = parseInt(breakInput.value);
  totalCycles = parseInt(cyclesInput.value);

  if (remainingSeconds === 0) {
    setNewPeriod();
  }

  isRunning = true;

  timer = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateDisplay();
    } else {
      finishPeriod();
    }
  }, 1000);
}

// Pausa
function pauseTimer() {
  if (!isRunning) return;

  clearInterval(timer);
  isRunning = false;
  statusDisplay.textContent += " (Pausado)";
}

// Reinicia tudo
function stopTimer() {
  clearInterval(timer);
  isRunning = false;
  isStudyTime = true;
  currentCycle = 1;
  remainingSeconds = 0;
  statusDisplay.textContent = "Pronto para começar";
  timeDisplay.textContent = "25:00";
}

// Eventos
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", stopTimer);

// Estado inicial
timeDisplay.textContent = "25:00";

// Pede permissão para notificações ao carregar
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
