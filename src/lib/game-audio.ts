/**
 * Browser-native Web Audio API & Speech Synthesis for Merry Explorers Games.
 * High-fidelity preschool audio cues, natural neural voice prioritization,
 * and resilient offline synthesis.
 */

let audioCtx: AudioContext | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let selectedVoiceURI: string | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Ensure voices are loaded asynchronously across Chrome, Edge, Safari & Firefox
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Prioritize best natural, warm, human-sounding English voices
 */
function findBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // If user selected a specific voice
  if (selectedVoiceURI) {
    const chosen = voices.find((v) => v.voiceURI === selectedVoiceURI);
    if (chosen) return chosen;
  }

  // Priority 1: High quality Microsoft Natural / Neural voices (Edge/Chrome on Windows)
  const naturalVoices = [
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Ana Online (Natural) - English (United States)",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Michelle Online (Natural) - English (United States)",
  ];
  for (const name of naturalVoices) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }

  // Priority 2: Any voice containing "Natural" or "Neural"
  const anyNatural = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Neural"))
  );
  if (anyNatural) return anyNatural;

  // Priority 3: Google US English / Samantha (macOS/iOS/Chrome)
  const premiumVoices = ["Google US English", "Samantha", "Victoria", "Karen", "Zira"];
  for (const name of premiumVoices) {
    const match = voices.find((v) => v.lang.startsWith("en") && v.name.includes(name));
    if (match) return match;
  }

  // Priority 4: Any English US voice
  const enUs = voices.find((v) => v.lang === "en-US");
  if (enUs) return enUs;

  // Priority 5: Any English voice
  return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
}

/**
 * Play a synthesized tone with an exponential decay envelope.
 */
function playSynthTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "sine",
  gainPeak = 0.22
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export const GameAudio = {
  /**
   * Return list of available English voices for teacher selection
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    if (cachedVoices.length === 0) {
      cachedVoices = window.speechSynthesis.getVoices();
    }
    return cachedVoices.filter((v) => v.lang.startsWith("en"));
  },

  /**
   * Set user preferred voice
   */
  setSelectedVoice(voiceURI: string) {
    selectedVoiceURI = voiceURI;
  },

  getSelectedVoiceURI(): string | null {
    return selectedVoiceURI;
  },

  /**
   * Crisp, bubbly pop sound on any tap/touch (gives tactile feedback on misclicks)
   */
  playPop() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(950, t + 0.05);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // ignore
    }
  },

  /**
   * Cheerful ascending chime (C5 -> E5 -> G5 -> C6 -> E6) for a correct answer!
   */
  playCorrect() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      playSynthTone(ctx, 523.25, t, 0.25, "triangle", 0.22); // C5
      playSynthTone(ctx, 659.25, t + 0.07, 0.25, "triangle", 0.22); // E5
      playSynthTone(ctx, 783.99, t + 0.14, 0.3, "triangle", 0.24); // G5
      playSynthTone(ctx, 1046.5, t + 0.21, 0.4, "sine", 0.28); // C6
      playSynthTone(ctx, 1318.51, t + 0.28, 0.45, "sine", 0.22); // E6
    } catch {
      // ignore
    }
  },

  /**
   * Sparkling high chime for a multi-answer streak!
   */
  playStreak() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      playSynthTone(ctx, 659.25, t, 0.18, "triangle", 0.22); // E5
      playSynthTone(ctx, 783.99, t + 0.06, 0.18, "triangle", 0.24); // G5
      playSynthTone(ctx, 1046.5, t + 0.12, 0.22, "sine", 0.28); // C6
      playSynthTone(ctx, 1318.51, t + 0.18, 0.35, "sine", 0.3); // E6
      playSynthTone(ctx, 1567.98, t + 0.24, 0.4, "sine", 0.25); // G6
    } catch {
      // ignore
    }
  },

  /**
   * Gentle, friendly wooden xylophone boop for "try again" - never harsh or discouraging.
   */
  playOops() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      playSynthTone(ctx, 440.0, t, 0.14, "triangle", 0.16); // A4
      playSynthTone(ctx, 392.0, t + 0.1, 0.2, "triangle", 0.18); // G4
    } catch {
      // ignore
    }
  },

  /**
   * Friendly turn announcement chime (G4 -> C5).
   */
  playTurn() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      playSynthTone(ctx, 392.0, t, 0.18, "triangle", 0.2); // G4
      playSynthTone(ctx, 523.25, t + 0.1, 0.32, "sine", 0.24); // C5
    } catch {
      // ignore
    }
  },

  /**
   * Triumphant victory fanfare for podium / game completion.
   */
  playVictoryFanfare() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      playSynthTone(ctx, 523.25, t + 0.0, 0.16, "triangle", 0.25);
      playSynthTone(ctx, 523.25, t + 0.14, 0.16, "triangle", 0.25);
      playSynthTone(ctx, 523.25, t + 0.28, 0.16, "triangle", 0.25);
      playSynthTone(ctx, 659.25, t + 0.42, 0.35, "triangle", 0.3);
      playSynthTone(ctx, 783.99, t + 0.7, 0.22, "triangle", 0.3);
      playSynthTone(ctx, 1046.5, t + 0.9, 0.7, "sine", 0.35);

      // Harmony chord
      playSynthTone(ctx, 523.25, t + 0.9, 0.7, "triangle", 0.2);
      playSynthTone(ctx, 659.25, t + 0.9, 0.7, "triangle", 0.2);
    } catch {
      // ignore
    }
  },

  /**
   * Speaks prompt or praise using the best natural neural speech voice with warm preschool cadence.
   */
  speakText(text: string, enabled = true) {
    if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel(); // Cancel any lingering utterances

      const voices =
        cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
      cachedVoices = voices;

      const bestVoice = findBestVoice(voices);
      const utterance = new SpeechSynthesisUtterance(text);

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      // Warm, natural preschool cadence (not too fast, natural friendly pitch)
      utterance.rate = 0.92;
      utterance.pitch = 1.08;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis failure gracefully handled
    }
  },
};
