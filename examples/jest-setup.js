const { configureToMatchImageSnapshot } = require('../src');

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  failureThreshold: 0.05,
  failureThresholdType: 'percent'
});

expect.extend({ toMatchImageSnapshot });
