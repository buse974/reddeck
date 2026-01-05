/**
 * YouTube DJ Mixer - Custom Faders
 * Faders verticaux custom avec drag & drop
 */

// Initialiser les faders au chargement
document.addEventListener("DOMContentLoaded", () => {
  initCustomFaders();
});

function initCustomFaders() {
  const faders = document.querySelectorAll(".custom-fader");

  faders.forEach((fader) => {
    const track = fader.querySelector(".fader-track");
    const fill = fader.querySelector(".fader-fill");
    const knob = fader.querySelector(".fader-knob");
    const initialValue = parseInt(fader.dataset.value) || 100;

    // Initialiser la position
    updateFaderVisual(fader, initialValue);

    let isDragging = false;

    // Mouse events
    const startDrag = (e) => {
      isDragging = true;
      fader.classList.add("dragging");
      document.body.style.cursor = "grabbing";
      e.preventDefault();
      handleMove(e);
    };

    const endDrag = () => {
      if (isDragging) {
        isDragging = false;
        fader.classList.remove("dragging");
        document.body.style.cursor = "default";
      }
    };

    const handleMove = (e) => {
      if (!isDragging && e.type === "mousemove") return;

      const rect = track.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Calculer la valeur (inversée car 0 en bas, 100 en haut)
      let percentage = ((rect.bottom - clientY) / rect.height) * 100;
      percentage = Math.max(0, Math.min(100, percentage));

      updateFaderVisual(fader, percentage);
      handleFaderChange(fader.id, percentage);
    };

    // Click direct sur la track
    track.addEventListener("mousedown", startDrag);
    track.addEventListener("touchstart", (e) => {
      isDragging = true;
      fader.classList.add("dragging");
      handleMove(e);
    });

    // Drag sur le knob
    knob.addEventListener("mousedown", startDrag);
    knob.addEventListener("touchstart", (e) => {
      isDragging = true;
      fader.classList.add("dragging");
      e.preventDefault();
    });

    // Move global
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", (e) => {
      if (isDragging) {
        handleMove(e);
      }
    });

    // End drag global
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);

    // Double-click pour reset
    fader.addEventListener("dblclick", () => {
      const defaultVal = fader.id === "masterVolume" ? 80 : 100;
      updateFaderVisual(fader, defaultVal);
      handleFaderChange(fader.id, defaultVal);
    });
  });
}

function updateFaderVisual(fader, value) {
  const fill = fader.querySelector(".fader-fill");
  const knob = fader.querySelector(".fader-knob");
  const track = fader.querySelector(".fader-track");

  if (!fill || !knob || !track) return;

  const trackHeight = track.offsetHeight;
  const knobHeight = knob.offsetHeight;
  const availableHeight = trackHeight - knobHeight;

  // Position du knob (du bas vers le haut)
  const knobPosition = (value / 100) * availableHeight;
  knob.style.bottom = knobPosition + "px";

  // Hauteur du fill
  fill.style.height = value + "%";

  // Stocker la valeur
  fader.dataset.value = Math.round(value);
}

function handleFaderChange(faderId, value) {
  const intValue = Math.round(value);

  switch (faderId) {
    case "faderA":
      state.volumes.A = intValue;
      updateVolume("A");
      break;
    case "faderB":
      state.volumes.B = intValue;
      updateVolume("B");
      break;
    case "masterVolume":
      state.volumes.master = intValue;
      updateVolume("A");
      updateVolume("B");
      sendToTv({ type: "masterVolume", volume: intValue });
      break;
  }
}

// Fonction pour mettre à jour un fader depuis l'extérieur
function setFaderValue(faderId, value) {
  const fader = document.getElementById(faderId);
  if (fader) {
    updateFaderVisual(fader, value);
  }
}
