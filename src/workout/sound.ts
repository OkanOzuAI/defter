let context: AudioContext | undefined

/** Browsers only allow audio after a tap, so the ✓ button calls this to unlock it. */
export function primeAudio() {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
  } catch {
    // No WebAudio: the timer still shows and vibrates.
  }
}

/** Two short beeps plus a vibration, where the device supports them. */
export function restOverSignal() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // vibration blocked
  }
  if (!context || context.state !== 'running') return
  for (const offset of [0, 0.25]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.value = 0.15
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(context.currentTime + offset)
    oscillator.stop(context.currentTime + offset + 0.15)
  }
}
