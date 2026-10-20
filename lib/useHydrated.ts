import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False during server rendering and before React hydrates; true once event handlers are attached.
// Submit buttons stay disabled until then so an early click can't trigger a native form submit.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
