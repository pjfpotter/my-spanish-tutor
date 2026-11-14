/**
 * Demo state lives in this browser tab only, under keys that start with `demo`, plus the two device-only stores the
 * timed round reads (ladder and best time), which are keyed by the demo answers' ids. Reset clears all of it.
 * No profile is created and nothing is sent to the server.
 */
export const DEMO_RECORDING_KEY = 'demo-recording';
export const MEMORISE_DEMO_KEY = 'memorise-demo-v1';
/** Ids of the sample answers. The timed round's device stores are keyed by them. */
export const DEMO_ITEM_PREFIX = 'demo-';

const isDemoKey = (k: string) => k.startsWith('demo') || k === MEMORISE_DEMO_KEY || k.startsWith(`ladder:${DEMO_ITEM_PREFIX}`) || k.startsWith(`best-ms:${DEMO_ITEM_PREFIX}`) || k === 'automate-last-order';

/** Removes everything the demo kept, except the presenter's recording switch. Safe when storage is blocked. */
export function resetDemo(stores: Storage[] = typeof window === 'undefined' ? [] : [window.localStorage, window.sessionStorage]): void {
  for (const store of stores) {
    try {
      const doomed: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && isDemoKey(k) && k !== DEMO_RECORDING_KEY) doomed.push(k);
      }
      doomed.forEach((k) => store.removeItem(k));
    } catch {
      /* storage blocked: nothing was kept to clear */
    }
  }
}

export function recordingOn(): boolean {
  try {
    return sessionStorage.getItem(DEMO_RECORDING_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setRecording(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(DEMO_RECORDING_KEY, 'on');
    else sessionStorage.removeItem(DEMO_RECORDING_KEY);
  } catch {
    /* the switch still works for this page */
  }
}
