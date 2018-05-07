const fs = jest.genMockFromModule('fs');

let mockFiles = [];
function __setMockFiles(newMockFiles) {
  mockFiles = newMockFiles;
}

function __getMockFiles() {
  return mockFiles;
}

function existsSync(filename) {
  return mockFiles.includes(filename);
}

function unlinkSync(filename) {
  mockFiles = mockFiles.filter(x => x !== filename);
}

fs.__getMockFiles = __getMockFiles;
fs.__setMockFiles = __setMockFiles;
fs.existsSync = existsSync;
fs.unlinkSync = unlinkSync;

module.exports = fs;