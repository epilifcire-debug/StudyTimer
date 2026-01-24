let timer = null;
let isRunning = false;
let isStudyTime = true;

let studyMinutes = 25;
let breakMinutes = 5;
let totalCycles = 4;
let currentCycle = 1;

let remainingSeconds = 0;
let endTimestamp = null;

// ⏸️ Transição entre estudo e descanso
const TRANSITION_SECONDS = 10;
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
    })
    .catch(() => {});
}

// Atualiza display
function updateDisplayFromSeconds(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  timeDisplay.textContent =
    String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// Lê sempre os últimos valores digitados
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
    // ⏸️ Fim do estudo → inicia pausa de 10 segundos
    playAlarm("⏰ Estudo finalizado! Descanso começa em 10 segundos...");
    isInTransition = true;
    transitionEndTimestamp = Date.now() + TRANSITION_SECONDS * 1000;
    statusDisplay.textContent = `⏸️ Preparando descanso... ${TRANSITION_SECONDS}`;
  } else {
    // Fim do descanso → volta direto para estudo
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

// Loop principal baseado em timestamp real
function startRealTimerLoop() {
  if (timer) clearInterval(timer);

  timer = setInterval(() => {
    if (!isRunning) return;

    const now = Date.now();

    // ⏸️ Período de transição (10s)
    if (isInTransition && transitionEndTimestamp) {
      const diffMs = transitionEndTimestamp - now;
      let diffSeconds = Math.ceil(diffMs / 1000);

      if (diffSeconds <= 0) {
        // Fim da transição → começa descanso
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

// Iniciar
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

// Pausar
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

// 🔁 Reset volta para o ÚLTIMO tempo digitado
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

// Eventos
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", stopTimer);

// Inicialização
readInputs();
remainingSeconds = studyMinutes * 60;
updateDisplayFromSeconds(remainingSeconds);

// Permissão de notificações
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
