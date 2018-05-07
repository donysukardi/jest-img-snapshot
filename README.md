# jest-img-snapshot

Jest matcher for image comparisons using [pixelmatch](https://github.com/mapbox/pixelmatch) with all the goodness of Jest snapshots out of the box.

This project was heavily inspired by [jest-image-snapshot](https://github.com/americanexpress/jest-image-snapshot).

## Overview

Internally, it uses Jest's snapshot features by keeping track of snapshot changes using checksum of the serialized image, passing and failing the snapshot tests accordingly. This means you get interactive update for failing snapshot tests, removal of obsolete snapshots out of the box.

Note that when update flag is not specified and the image comparison falls within the specified threshold, the library will not perform any update and pass the test using the previously stored checksum.

## Usage

1. Extend Jest's `expect` with `toMatchImageSnapshot` exposed by the library

```js
const { toMatchImageSnapshot } = require('jest-image-snapshot');
expect.extend({ toMatchImageSnapshot });
```

2. Or use `configureToMatchImageSnapshot` to specify default configuration (refer to Optional Configuration below for details)

```js
const { configureToMatchImageSnapshot } = require('jest-image-snapshot');
const toMatchImageSnapshot = configureToMatchImageSnapshot({
  customDiffConfig: { threshold: 0.1 },
  noColors: false,
  failureThresholdType: 'percent',
  failureThreshold: 0.01
});
expect.extend({ toMatchImageSnapshot });
```

2. Finally, use `expect(...).toMatchImageSnapshot()` in your tests

```js
it('should match image snapshot', () => {
  // ...
  expect(img).toMatchImageSnapshot();
});
```

### Optional configuration

The following configuration can be passed as object to both `configureToMatchImageSnapshot` as default and `expect(...).toMatchImageSnapshot` as override for particular tests,
* `customDiffConfig`, options passed to [pixelmatch](https://github.com/mapbox/pixelmatch#api). Default: `{ threshold: 0.01 }`
* `noColors`, flag to disable chalk coloring. Default: `false`
* `failureThresholdType`, used in conjuction with `failureThreshold`, options are `pixel` (default) or `percent`
* `failureThreshold`, used in conjunction with `failureThresholdType`, for `percent`, it ranges from 0-1. Default: 0

The following configuration can be used in conjunction with configuration above for `expect(...).toMatchImageSnapshot()` only,
* `name`, custom name for the snapshot, as passed to https://facebook.github.io/jest/docs/en/expect.html#tomatchsnapshotoptionalstring
