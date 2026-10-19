/** One transcript insertion per recording; failures retain the original audio. */
export class RecordingTranscription {
  uri: string | null = null;
  busy = false;
  private generation = 0;
  private request: AbortController | null = null;
  retain(uri: string) { this.uri = uri; }
  async run(transcribe: (uri: string, signal: AbortSignal) => Promise<string>, insert: (text: string) => Promise<void>) {
    if (this.busy || !this.uri) return false;
    const uri = this.uri;
    const generation = ++this.generation;
    const request = new AbortController();
    this.request = request;
    this.busy = true;
    try {
      const text = await transcribe(uri, request.signal);
      if (generation !== this.generation) return false;
      if (!text.trim()) throw new Error('No speech was found. Your recording is ready to retry.');
      await insert(text.trim());
      if (generation !== this.generation) return false;
      this.uri = null;
      return true;
    } finally {
      if (generation === this.generation) { this.busy = false; this.request = null; }
    }
  }
  cancelRequest() { this.generation++; this.request?.abort(); this.request = null; this.busy = false; }
}
