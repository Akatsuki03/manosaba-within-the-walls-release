import { randomUUID } from 'node:crypto';

/** One bounded local projection consumer, not a world scheduler. No model,
 * network request or story-time calculation runs here. At startup it recovers
 * persisted jobs; afterwards the server notifies it after successful commits.
 */
export class PlayerDeliveryWorker {
  #engine;
  #workerId = randomUUID();
  #timer;
  #closed = false;
  #onError;
  #reportedFailure = false;
  constructor(engine, { onError = () => {} } = {}) {
    this.#engine = engine;
    this.#onError = onError;
  }
  #schedule(delay) {
    if (this.#closed || this.#timer !== undefined) return;
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.#drain();
    }, delay);
    this.#timer.unref?.();
  }
  notify() {
    if (this.#closed) return;
    if (this.#timer !== undefined) { clearTimeout(this.#timer); this.#timer = undefined; }
    this.#schedule(0);
  }
  #drain() {
    if (this.#closed) return;
    let lease;
    try {
      // Yield after a bounded number of local projection writes. A damaged
      // queue cannot create an unbounded retry loop or block world commands.
      for (let index = 0; index < 16; index++) {
        lease = this.#engine.claimPlayerDelivery({ workerId: this.#workerId });
        if (!lease) break;
        this.#engine.completePlayerDelivery(lease);
        lease = undefined;
      }
      const delay = this.#engine.playerDeliveryDelay();
      if (delay !== null) this.#schedule(Math.max(1, Math.min(delay, 120000)));
      this.#reportedFailure = false;
    } catch {
      // Provider/body/path/error messages never cross this diagnostic seam.
      // Release only if the lease is still ours; a reclaimed lease is fenced.
      if (lease) { try { this.#engine.releasePlayerDelivery(lease); } catch { /* stale or unavailable */ } }
      if (!this.#reportedFailure) {
        this.#reportedFailure = true;
        try { this.#onError(); } catch { /* optional diagnostics cannot stop the service */ }
      }
      // Retry on an explicit future notification/restart, not a tight timer.
    }
  }
  close() {
    this.#closed = true;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
  }
}
