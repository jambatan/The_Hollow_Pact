export { MSG_TYPE } from './constants.js';

// Encode/decode helpers for sending over WebSocket
export function encode(type, data) {
  return JSON.stringify({ t: type, d: data });
}

export function decode(raw) {
  try {
    const msg = JSON.parse(raw);
    return { type: msg.t, data: msg.d };
  } catch {
    return null;
  }
}
