// The sample workspace has its own router base and never needs a live session.
export const sampleBase = /^\/sample(?:\/|$)/.test(window.location.pathname) ? '/sample' : ''
