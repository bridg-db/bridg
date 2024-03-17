const { mockFetch } = require('./__mocks__/fetch.mock');

// needed for pulse tests
global.ReadableStream = require('web-streams-polyfill').ReadableStream;
global.fetch = mockFetch;
