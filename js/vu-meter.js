/**
 * YouTube DJ Mixer - VU Meter
 * v3.42
 */

function updateVUMeter(channel, level) {
  const meter = document.getElementById("vuMeterVert" + channel);
  if (!meter) return;
  const segments = meter.querySelectorAll(".vu-segment");
  const activeCount = Math.floor((level / 100) * segments.length);
  segments.forEach((seg, i) => {
    seg.classList.toggle("active", i < activeCount);
  });
}

// Récupérer la valeur d'un fader custom
function getFaderValue(faderId) {
  const fader = document.getElementById(faderId);
  if (fader && fader.dataset.value !== undefined) {
    return parseInt(fader.dataset.value);
  }
  return 100;
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("headphoneA")?.addEventListener("click", function () {
    this.classList.toggle("active");
  });
  document.getElementById("headphoneB")?.addEventListener("click", function () {
    this.classList.toggle("active");
  });

  setTimeout(() => {
    updateVUMeter("A", 100);
    updateVUMeter("B", 100);
  }, 500);

  // Animation VU meters basée sur l'état de lecture
  setInterval(() => {
    if (typeof state !== "undefined") {
      // Deck A
      if (state.isPlaying?.A) {
        const faderVal = getFaderValue("faderA");
        updateVUMeter(
          "A",
          Math.min(100, Math.max(0, faderVal + Math.random() * 20 - 10)),
        );
      }
      // Deck B
      if (state.isPlaying?.B) {
        const faderVal = getFaderValue("faderB");
        updateVUMeter(
          "B",
          Math.min(100, Math.max(0, faderVal + Math.random() * 20 - 10)),
        );
      }
    }
  }, 100);
});
