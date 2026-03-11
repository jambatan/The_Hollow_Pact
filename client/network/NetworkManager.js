import { MSG_TYPE, EVENTS, NETWORK_HZ } from '../../shared/constants.js';
import { encode, decode } from '../../shared/protocol.js';

export class NetworkManager {
  constructor(events) {
    this.events    = events;
    this._ws       = null;
    this._localId  = null;
    this._connected = false;
    this._syncTimer = 0;
    this._syncInterval = 1 / NETWORK_HZ;
    this._remoteHandlers = new Map(); // MSG_TYPE → fn
    this.onPlayerJoin  = null;
    this.onPlayerLeave = null;
    this.onSnapshot    = null;
  }

  connect(roomId = 'default') {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url   = `${proto}://${location.host}?room=${roomId}`;
    this._ws = new WebSocket(url);

    this._ws.addEventListener('open', () => {
      this._connected = true;
      console.log('Connected to server room:', roomId);
      this.onConnect?.();
    });
    this._ws.addEventListener('message', e => this._onMessage(e.data));
    this._ws.addEventListener('close', () => {
      this._connected = false;
      console.warn('Disconnected from server');
    });
  }

  _onMessage(raw) {
    const msg = decode(raw);
    if (!msg) return;

    switch (msg.type) {
      case MSG_TYPE.ROOM_STATE:
        this._localId = msg.data.yourId;
        this.onSnapshot?.(msg.data.players.filter(p => p.id !== this._localId));
        break;
      case MSG_TYPE.JOIN:
        this.onPlayerJoin?.(msg.data);
        break;
      case MSG_TYPE.LEAVE:
        this.onPlayerLeave?.(msg.data.id);
        break;
      case MSG_TYPE.SNAPSHOT:
        this.onSnapshot?.(msg.data.filter(p => p.id !== this._localId));
        break;
      case MSG_TYPE.CHAT:
        this.events.emit(EVENTS.NOTIFICATION, { text: `[${msg.data.id}] ${msg.data.text}`, color: '#aaddff' });
        break;
      case MSG_TYPE.PARTY_INVITE:
        this.onPartyInvite?.(msg.data); // { fromId }
        break;
      case MSG_TYPE.PARTY_UPDATE:
        this.onPartyUpdate?.(msg.data); // { partyId, members: [id,...] }
        break;
      case MSG_TYPE.PARTY_ZONE:
        this.onPartyZone?.(msg.data); // { fromId, zoneId }
        break;
      case MSG_TYPE.ENTITY_SYNC:
        this.onEntitySync?.(msg.data); // { kills: [netId,...] }
        break;
      case MSG_TYPE.CHAR_DATA:
        this.onCharData?.(msg.data);
        break;
    }
  }

  requestCharList() {
    if (!this._connected) return;
    this._ws.send(encode(MSG_TYPE.CHAR_LIST, {}));
  }

  sendCharLoad(name, pin) {
    if (!this._connected) return;
    this._ws.send(encode(MSG_TYPE.CHAR_LOAD, { name, pin }));
  }

  sendCharCreate(name, pin) {
    if (!this._connected) return;
    this._ws.send(encode(MSG_TYPE.CHAR_CREATE, { name, pin }));
  }

  sendCharSave(data) {
    if (!this._connected) return;
    this._ws.send(encode(MSG_TYPE.CHAR_SAVE, data));
  }

  sendPartyInvite(targetId) {
    if (!this._connected) return;
    this._ws.send(encode(MSG_TYPE.PARTY_INVITE, { targetId }));
  }

  sendPartyAccept(fromId) {
    if (!this._connected) return;
    this._ws.send(encode(MSG_TYPE.PARTY_ACCEPT, { fromId }));
  }

  sendPartyLeave() {
    if (!this._connected) return;
    this._ws.send(encode(MSG_TYPE.PARTY_LEAVE, {}));
  }

  sendEntitySync(payload) {
    if (!this._connected) return;
    this._ws.send(encode(MSG_TYPE.ENTITY_SYNC, payload));
  }

  // Send local player state to server (optionally include NPC party member positions)
  sendAction(player, partyNpcs = []) {
    if (!this._connected || !this._ws) return;
    const snap = player.toNetSnapshot();
    const payload = {
      x: snap.x, y: snap.y, zoneId: player._zoneId ?? 'ashenvale',
      hp: snap.hp, facing: snap.facing, animState: snap.animState,
    };
    if (partyNpcs.length) payload.partyNpcs = partyNpcs;
    this._ws.send(encode(MSG_TYPE.ACTION, payload));
  }

  update(dt, localPlayer, partyNpcs = []) {
    if (!this._connected || !localPlayer) return;
    this._syncTimer += dt;
    if (this._syncTimer >= this._syncInterval) {
      this._syncTimer = 0;
      this.sendAction(localPlayer, partyNpcs);
    }
  }

  get isConnected() { return this._connected; }
  get localId()     { return this._localId; }
}
