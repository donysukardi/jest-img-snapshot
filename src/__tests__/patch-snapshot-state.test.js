jest.mock('fs');

const fs = require('fs');
const { logDeletedFiles, logObsoleteFiles, patchSnapshotState } = require('../patch-snapshot-state');

const MOCK_FILES = [
  '/__tests__/__image_snapshots__/new-snap.png',
  '/__tests__/__image_snapshots__/obsolete-snap.png',
  '/__tests__/__image_snapshots__/__diff_output__/obsolete-diff.png',
];

describe('patchSnapshotState on getUncheckedKeys', () => {
  
  beforeEach(() => {
    fs.__setMockFiles(MOCK_FILES);
  });

  it('logs obsolete files and calls original getUncheckedKeys on updateSnapshot !== all', () => {
    const mockLog = jest.fn();
    const backupLog = global.console.log;
    global.console.log = mockLog;

    const mockFn = jest.fn();
    const snapshotState = {
      getUncheckedKeys: mockFn,
      _updateSnapshot: 'new',
      _uncheckedKeys: new Set(['obsolete'])
    }

    patchSnapshotState(snapshotState, {
      currentTestName: 'Test',
      imgSnapshotDir: '/__tests__/__image_snapshots__',
      diffOutputDir: '/__tests__/__image_snapshots__/__diff_output__',
    });

    snapshotState.getUncheckedKeys();

    expect(mockLog.mock.calls[0][0]).toBe(logObsoleteFiles([MOCK_FILES[1]]));
    expect(mockFn).toHaveBeenCalled();

    global.console.log = backupLog;
  });

  it('calls original getUncheckedKeys on updateSnapshot === all', () => {
    const mockLog = jest.fn();
    const backupLog = global.console.log;
    global.console.log = mockLog;

    const mockFn = jest.fn();
    const snapshotState = {
      getUncheckedKeys: mockFn,
      _updateSnapshot: 'all',
      _uncheckedKeys: new Set(['obsolete'])
    }

    patchSnapshotState(snapshotState, {
      currentTestName: 'Test',
      imgSnapshotDir: '/__tests__/__image_snapshots__',
      diffOutputDir: '/__tests__/__image_snapshots__/__diff_output__',
    });

    snapshotState.getUncheckedKeys();

    expect(mockLog).not.toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalled();

    global.console.log = backupLog;
  })
});

describe('patchSnapshotState on removeUncheckedKeys', () => {
  
  beforeEach(() => {
    fs.__setMockFiles(MOCK_FILES);
  });

  test('deletes and logs files and calls original removeUncheckedKeys on updateSnapshot === all', () => {
    const mockLog = jest.fn();
    const backupLog = global.console.log;
    global.console.log = mockLog;

    const mockFn = jest.fn();
    const snapshotState = {
      removeUncheckedKeys: mockFn,
      _updateSnapshot: 'all',
      _uncheckedKeys: new Set(['obsolete'])
    }

    patchSnapshotState(snapshotState, {
      currentTestName: 'Test',
      imgSnapshotDir: '/__tests__/__image_snapshots__',
      diffOutputDir: '/__tests__/__image_snapshots__/__diff_output__',
    });

    snapshotState.removeUncheckedKeys();

    expect(mockLog.mock.calls[0][0]).toBe(logDeletedFiles([MOCK_FILES[1]]));
    expect(mockFn).toHaveBeenCalled();
    expect(fs.__getMockFiles()).toEqual([MOCK_FILES[0]]);

    global.console.log = backupLog;
  });
});