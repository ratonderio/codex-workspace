export const jobRegistry = Object.freeze([
  Object.freeze({
    id: 'warehouse',
    label: 'Warehouse Shift',
    baseSeconds: 3.2,
    scaleFactor: 0.22,
    moneyBase: 6,
    xpBase: 4,
  }),
  Object.freeze({
    id: 'courier',
    label: 'Courier Route',
    baseSeconds: 4,
    scaleFactor: 0.18,
    moneyBase: 9,
    xpBase: 5,
  }),
  Object.freeze({
    id: 'artisan',
    label: 'Artisan Contract',
    baseSeconds: 5.6,
    scaleFactor: 0.16,
    moneyBase: 14,
    xpBase: 7,
  }),
]);

export function getJobById(jobId) {
  return jobRegistry.find((job) => job.id === jobId);
}
