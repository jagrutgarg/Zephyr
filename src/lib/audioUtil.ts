export function playSound(type: "win" | "void") {
  if (typeof window === "undefined") return;
  const muted = localStorage.getItem("aetheria_audio_muted") === "true";
  if (muted) return;
  
  const volume = parseFloat(localStorage.getItem("aetheria_audio_volume") || "0.4");
  const audio = new Audio(`/audio/${type}.mp3`);
  audio.volume = volume;
  audio.play().catch(() => {});
}
