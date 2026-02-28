import { createSaveService } from './save-service.js';

export function bootstrapGame({ state, eventBus, intervalMs } = {}) {
  const saveService = createSaveService({
    getRuntimeState: () => state.runtime,
    on: eventBus?.on?.bind(eventBus),
    intervalMs,
  });

  // Load at startup, defaults are returned if no valid save exists.
  state.runtime = saveService.loadGame();

  // Save on interval + task changes.
  saveService.start();

  return saveService;
}
