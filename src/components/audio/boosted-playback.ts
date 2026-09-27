type ConnectableNode = {
  connect(target: unknown): unknown;
  disconnect(): void;
};

type PlaybackAudioContext = {
  destination: unknown;
  createMediaElementSource(element: HTMLMediaElement): ConnectableNode;
  createGain(): ConnectableNode & { gain: { value: number } };
  createDynamicsCompressor(): ConnectableNode;
  resume(): Promise<void>;
  close(): Promise<void>;
};

type AudioContextFactory = () => PlaybackAudioContext;

function createBrowserAudioContext(): PlaybackAudioContext {
  return new AudioContext() as unknown as PlaybackAudioContext;
}

export function boostMediaElement(
  element: HTMLAudioElement,
  createContext: AudioContextFactory = createBrowserAudioContext,
  multiplier = 1.6,
): () => void {
  element.volume = 1;
  let context: PlaybackAudioContext;
  try {
    context = createContext();
  } catch {
    return () => undefined;
  }

  const source = context.createMediaElementSource(element);
  const gain = context.createGain();
  const compressor = context.createDynamicsCompressor();
  gain.gain.value = multiplier;
  source.connect(gain);
  gain.connect(compressor);
  compressor.connect(context.destination);
  void context.resume();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    source.disconnect();
    gain.disconnect();
    compressor.disconnect();
    void context.close();
  };
}
