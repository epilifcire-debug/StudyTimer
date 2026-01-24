let timer = null;
let isRunning = false;
let isStudyTime = true;

let studyMinutes = 25;
let breakMinutes = 5;
let totalCycles = 4;
let currentCycle = 1;

let transitionSeconds = 10;

let remainingSeconds = 0;
let endTimestamp = null;

let isInTransition = false;
let transitionEndTimestamp = null;

const timeDisplay = document.getElementById("time-display");
const statusDisplay = document.querySelector(".status");

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");

const studyInput = document.getElementById("study-time");
const breakInput = document.getElementById("break-time");
const cyclesInput = document.getElementById("cycles");
const transitionInput = document.getElementById("transition-time");

// 🔊 Áudio real
const alarm = new Audio("/StudyTimer/alarm.mp3");
alarm.preload = "auto";
let audioUnlocked = false;

// ==========================
// 💾 Persistência (localStorage)
// ==========================

function saveSettings() {
  const settings = {
    study: studyInput.value,
    break: breakInput.value,
    cycles: cyclesInput.value,
    transition: transitionInput.value
  };
  localStorage.setItem("studyTimerSettings", JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem("studyTimerSettings");
  if (!saved) return;

  try {
    const settings = JSON.parse(saved);

    if (settings.study) studyInput.value = settings.study;
    if (settings.break) breakInput.value = settings.break;
    if (settings.cycles) cyclesInput.value = settings.cycles;
    if (settings.transition) transitionInput.value = settings.transition;

  } catch (e) {
    console.log("Falha ao carregar configurações salvas");
  }
}

// Salva automaticamente quando usuário altera algo
[studyInput, breakInput, cyclesInput, transitionInput].forEach(input => {
  input.addEventListener("change", saveSettings);
});

// ==========================
// 🔓 Desbloqueio de áudio
// ==========================

function unlockAudio() {
  if (audioUnlocked) return;

  alarm.play()
    .then(() => {
      alarm.pause();
      alarm.currentTime = 0;
      audioUnlocked = true;
    })
    .catch(() => {});
}

// ==========================
// 🧠 Utilitários
// ==========================

function updateDisplayFromSeconds(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  timeDisplay.textContent =
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function readInputs() {
  studyMinutes = parseInt(studyInput.value) || 1;
  breakMinutes = parseInt(breakInput.value) || 1;
  totalCycles = parseInt(cyclesInput.value) || 1;
  transitionSeconds = parseInt(transitionInput.value) || 0;
}

// ==========================
// ⏱️ Configuração de períodos
// ==========================

function setNewPeriod() {
  readInputs();

  if (isStudyTime) {
    remainingSeconds = studyMinutes * 60;
    statusDisplay.textContent = `📚 Estudando — Ciclo ${currentCycle} de ${totalCycles}`;
  } else {
    remainingSeconds = breakMinutes * 60;
    statusDisplay.textContent = "☕ Descansando";
  }

  endTimestamp = Date.now() + remainingSeconds * 1000;
  updateDisplayFromSeconds(remainingSeconds);
}

// ==========================
// 🔔 Notificação + alarme
// ==========================

function sendNotification(message) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "notify",
      text: message
    });
  }
}

function playAlarm(message) {
  alarm.currentTime = 0;
  alarm.play().catch(() => {});

  if ("vibrate" in navigator) {
    navigator.vibrate([500, 200, 500]);
  }

  sendNotification(message);
}

// ==========================
// 🔴 Final de período
// ==========================

function finishPeriod() {
  if (isStudyTime) {
    // Fim do estudo → pausa configurável
    readInputs();

    if (transitionSeconds > 0) {
      playAlarm(`⏰ Estudo finalizado! Descanso começa em ${transitionSeconds} segundos...`);

      isInTransition = true;
      transitionEndTimestamp = Date.now() + transitionSeconds * 1000;
      endTimestamp = null;

      statusDisplay.textContent = `⏸️ Preparando descanso... ${transitionSeconds}`;
      updateDisplayFromSeconds(0);
      return;
    } else {
      // Sem pausa
      playAlarm("⏰ Hora de descansar!");
      isStudyTime = false;
      setNewPeriod();
      return;
    }

  } else {
    // Fim do descanso → volta para estudo
    playAlarm("📚 Hora de voltar a estudar!");
    isStudyTime = true;
    currentCycle++;

    if (currentCycle > totalCycles) {
      stopTimer();
      statusDisplay.textContent = "🎉 Sessão concluída!";
      playAlarm("🎉 Sessão de estudos concluída!");
      return;
    }

    setNewPeriod();
  }
}

// ==========================
// 🔄 Loop principal (timestamp real)
// ==========================

function startRealTimerLoop() {
  if (timer) clearInterval(timer);

  timer = setInterval(() => {
    if (!isRunning) return;

    const now = Date.now();

    // ⏸️ Transição entre estudo e descanso
    if (isInTransition && transitionEndTimestamp) {
      const diffMs = transitionEndTimestamp - now;
      let diffSeconds = Math.ceil(diffMs / 1000);

      if (diffSeconds <= 0) {
        isInTransition = false;
        isStudyTime = false;
        setNewPeriod();
      } else {
        statusDisplay.textContent = `⏸️ Preparando descanso... ${diffSeconds}`;
        updateDisplayFromSeconds(0);
      }
      return;
    }

    // ⏱️ Período normal
    if (!endTimestamp) return;

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

// ==========================
// ▶️ Controles
// ==========================

function startTimer() {
  unlockAudio();

  if (isRunning) return;

  readInputs();

  if (remainingSeconds === 0 || !endTimestamp) {
    setNewPeriod();
  } else {
    endTimestamp = Date.now() + remainingSeconds * 1000;
  }

  isRunning = true;
  startRealTimerLoop();
}

function pauseTimer() {
  if (!isRunning) return;

  clearInterval(timer);
  isRunning = false;

  if (endTimestamp) {
    const diffMs = endTimestamp - Date.now();
    remainingSeconds = Math.max(0, Math.ceil(diffMs / 1000));
  }

  statusDisplay.textContent += " (Pausado)";
}

function stopTimer() {
  clearInterval(timer);
  isRunning = false;
  isStudyTime = true;
  isInTransition = false;
  currentCycle = 1;
  endTimestamp = null;
  transitionEndTimestamp = null;

  readInputs();

  remainingSeconds = studyMinutes * 60;
  statusDisplay.textContent = "Pronto para começar";
  updateDisplayFromSeconds(remainingSeconds);
}

// ==========================
// 🎛️ Eventos
// ==========================

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", stopTimer);

// ==========================
// 🔄 Inicialização
// ==========================

// Carrega configurações salvas
loadSettings();

readInputs();
remainingSeconds = studyMinutes * 60;
updateDisplayFromSeconds(remainingSeconds);

// Permissão de notificações
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
