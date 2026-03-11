import { EventEmitter } from 'events';
import { encode, decode } from '../shared/protocol.js';
import { MSG_TYPE, MAX_PLAYERS, NETWORK_HZ } from '../shared/constants.js';

export class GameRoom extends EventEmitter {
  constructor(id, store) {
    super();
    this.id = id;
    this._store   = store; // CharacterStore reference
    this._players = new Map(); // ws → { id, charName, x, y, zoneId, hp, maxHp, facing, animState }
    this._nextId  = 1;
    this._tickInterval = setInterval(() => this._tick(), 1000 / NETWORK_HZ);
    // Party tracking
    this._parties     = new Map(); // partyId → Set<playerId>
    this._playerParty = new Map(); // playerId → partyId
  }

  get playerCount() { return this._players.size; }

  addPlayer(ws) {
    if (this._players.size >= MAX_PLAYERS) {
      ws.send(encode(MSG_TYPE.ERROR, { msg: 'Room full' }));
      ws.close();
      return;
    }

    const playerId = this._nextId++;
    const state = { id: playerId, charName: null, x: 480, y: 720, zoneId: 'ashenvale', hp: 50, maxHp: 50, facing: 'down', animState: 'idle', partyNpcs: [] };
    this._players.set(ws, state);

    // Only send authenticated (charName != null) players in room state — unauthenticated players are invisible
    ws.send(encode(MSG_TYPE.ROOM_STATE, {
      yourId: playerId,
      players: [...this._players.values()].filter(s => s.charName !== null),
    }));

    // Do NOT broadcast JOIN yet — will broadcast after character is authenticated

    ws.on('message', raw => this._onMessage(ws, raw));
    ws.on('close', () => this._removePlayer(ws));
    ws.on('error', () => this._removePlayer(ws));
  }

  _removePlayer(ws) {
    const state = this._players.get(ws);
    if (!state) return;
    this._leaveParty(state.id);
    this._players.delete(ws);
    this._broadcast(encode(MSG_TYPE.LEAVE, { id: state.id }));
    if (this._players.size === 0) {
      clearInterval(this._tickInterval);
      this.emit('empty');
    }
  }

  _leaveParty(playerId) {
    const partyId = this._playerParty.get(playerId);
    if (!partyId) return;
    this._playerParty.delete(playerId);
    const members = this._parties.get(partyId);
    if (!members) return;
    members.delete(playerId);
    if (members.size === 0) {
      this._parties.delete(partyId);
    } else {
      this._broadcastToParty(partyId, encode(MSG_TYPE.PARTY_UPDATE, { partyId, members: [...members] }));
    }
  }

  _broadcastToParty(partyId, payload, excludeWs = null) {
    const members = this._parties.get(partyId);
    if (!members) return;
    for (const [ws, state] of this._players) {
      if (ws !== excludeWs && members.has(state.id) && ws.readyState === 1) {
        ws.send(payload);
      }
    }
  }

  _wsForPlayer(id) {
    return [...this._players.entries()].find(([, s]) => s.id === id)?.[0] ?? null;
  }

  _onMessage(ws, raw) {
    const msg = decode(raw.toString());
    if (!msg) return;
    const state = this._players.get(ws);
    if (!state) return;

    if (msg.type === MSG_TYPE.ACTION) {
      const d = msg.data;
      const prevZone = state.zoneId;
      if (d.x != null)         state.x         = d.x;
      if (d.y != null)         state.y         = d.y;
      if (d.zoneId != null)    state.zoneId    = d.zoneId;
      if (d.hp != null)        state.hp        = d.hp;
      if (d.facing != null)    state.facing    = d.facing;
      if (d.animState != null) state.animState = d.animState;
      if (d.partyNpcs)         state.partyNpcs = d.partyNpcs;
      // Notify party members when this player changes zone
      if (d.zoneId && d.zoneId !== prevZone) {
        const partyId = this._playerParty.get(state.id);
        if (partyId) {
          this._broadcastToParty(partyId, encode(MSG_TYPE.PARTY_ZONE, { fromId: state.id, zoneId: d.zoneId }), ws);
        }
      }
    }

    if (msg.type === MSG_TYPE.CHAT) {
      this._broadcast(encode(MSG_TYPE.CHAT, { id: state.id, text: msg.data.text?.slice(0, 200) }));
    }

    if (msg.type === MSG_TYPE.PARTY_INVITE) {
      const targetWs = this._wsForPlayer(msg.data.targetId);
      if (targetWs) {
        targetWs.send(encode(MSG_TYPE.PARTY_INVITE, { fromId: state.id, fromName: state.charName ?? `Player ${state.id}` }));
      }
    }

    if (msg.type === MSG_TYPE.PARTY_ACCEPT) {
      const inviterId = msg.data.fromId;
      // Get or create party for the inviter
      let partyId = this._playerParty.get(inviterId);
      if (!partyId) {
        partyId = `p${inviterId}`;
        this._parties.set(partyId, new Set([inviterId]));
        this._playerParty.set(inviterId, partyId);
      }
      this._parties.get(partyId).add(state.id);
      this._playerParty.set(state.id, partyId);
      // Notify all party members of current membership
      this._broadcastToParty(partyId, encode(MSG_TYPE.PARTY_UPDATE, { partyId, members: [...this._parties.get(partyId)] }));
      // Also notify the accepting player themselves
      ws.send(encode(MSG_TYPE.PARTY_UPDATE, { partyId, members: [...this._parties.get(partyId)] }));
    }

    if (msg.type === MSG_TYPE.PARTY_LEAVE) {
      this._leaveParty(state.id);
    }

    if (msg.type === MSG_TYPE.CHAR_LIST) {
      ws.send(encode(MSG_TYPE.CHAR_DATA, { list: this._store.getList() }));
    }

    if (msg.type === MSG_TYPE.CHAR_LOAD) {
      const { name, pin } = msg.data;
      // Reject if character is already logged in on another connection
      const alreadyOnline = [...this._players.values()].some(s => s !== state && s.charName?.toLowerCase() === name?.toLowerCase());
      if (alreadyOnline) {
        ws.send(encode(MSG_TYPE.CHAR_DATA, { success: false, error: 'Character already online' }));
      } else {
        const result = this._store.authenticate(name, pin);
        if (result.success) {
          state.charName = result.data.name;
          // Now announce this player to all others
          this._broadcast(encode(MSG_TYPE.JOIN, { ...state }), ws);
        }
        ws.send(encode(MSG_TYPE.CHAR_DATA, result));
      }
    }

    if (msg.type === MSG_TYPE.CHAR_CREATE) {
      const { name, pin } = msg.data;
      const alreadyOnline = [...this._players.values()].some(s => s !== state && s.charName?.toLowerCase() === name?.toLowerCase());
      if (alreadyOnline) {
        ws.send(encode(MSG_TYPE.CHAR_DATA, { success: false, error: 'Character already online' }));
      } else {
        const result = this._store.create(name, pin);
        if (result.success) {
          state.charName = result.data.name;
          this._broadcast(encode(MSG_TYPE.JOIN, { ...state }), ws);
        }
        ws.send(encode(MSG_TYPE.CHAR_DATA, result));
      }
    }

    if (msg.type === MSG_TYPE.CHAR_SAVE) {
      if (state.charName) this._store.save(state.charName, msg.data);
    }

    if (msg.type === MSG_TYPE.ENTITY_SYNC) {
      // Relay entity kill/sync events only to players in the same zone
      const payload = encode(MSG_TYPE.ENTITY_SYNC, msg.data);
      for (const [ws2, st2] of this._players) {
        if (ws2 !== ws && ws2.readyState === 1 && st2.zoneId === state.zoneId) {
          ws2.send(payload);
        }
      }
    }
  }

  _tick() {
    // Only broadcast authenticated players (charName set)
    const snapshot = [...this._players.values()].filter(s => s.charName !== null);
    const payload  = encode(MSG_TYPE.SNAPSHOT, snapshot);
    this._broadcast(payload);
  }

  _broadcast(payload, exclude = null) {
    for (const [ws] of this._players) {
      if (ws !== exclude && ws.readyState === 1 /* OPEN */) {
        ws.send(payload);
      }
    }
  }
}
