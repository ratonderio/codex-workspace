import { mergeContentPacks } from './content/pack-loader.js';
import { createSaveService } from './save-service.js';

export function bootstrapGame({
  state,
  eventBus,
  intervalMs,
  contentPacks,
  activePackIds,
} = {}) {
  const content = mergeContentPacks({
    packs: contentPacks,
    activePackIds,
  });

  state.content = content;

  if (Array.isArray(state.equipmentDefinitions) && state.equipmentDefinitions.length === 0) {
    state.equipmentDefinitions = content.equipment;
  }

  const saveService = createSaveService({
    getRuntimeState: () => state.runtime,
    on: eventBus?.on?.bind(eventBus),
    intervalMs,
  });

  // Load at startup, defaults are returned if no valid save exists.
  state.runtime = saveService.loadGame();

  // Save on interval + task changes.
  saveService.start();

  return {
    saveService,
    content,
  };
}
