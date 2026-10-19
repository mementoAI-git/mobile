/** Native capture events, rather than the start request, determine recording state. */
export class SpeechSession {
  active = false;
  capturing = false;
  private confirmed = '';
  private latest = '';
  levels = Array<number>(32).fill(0);

  begin() {
    this.active = true;
    this.capturing = false;
    this.confirmed = '';
    this.latest = '';
    this.levels = Array<number>(32).fill(0);
  }
  audioStarted() {
    if (!this.active) return false;
    this.capturing = true;
    return true;
  }
  result(segment: string, final: boolean) {
    if (!this.active) return null;
    this.latest = [this.confirmed, segment.trim()].filter(Boolean).join(' ');
    if (final) this.confirmed = this.latest;
    return this.latest;
  }
  volume(value: number) {
    if (!this.active || !this.capturing) return null;
    this.levels = [...this.levels.slice(1), Math.max(0, Math.min(1, value / 10))];
    return this.levels;
  }
  finish() {
    if (!this.active) return null;
    const text = this.latest.trim();
    this.active = false;
    this.capturing = false;
    return text;
  }
  cancel() {
    this.active = false;
    this.capturing = false;
    this.latest = '';
    this.confirmed = '';
  }
}
