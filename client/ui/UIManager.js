import { HUD } from './HUD.js';
import { InventoryUI } from './InventoryUI.js';
import { DialogueBox } from './DialogueBox.js';
import { ShopUI } from './ShopUI.js';
import { QuestLog } from './QuestLog.js';
import { DevConsole } from './DevConsole.js';
import { NotificationSystem } from './NotificationSystem.js';
import { BattleUI } from './BattleUI.js';
import { PartyScreen } from './PartyScreen.js';
import { EVENTS, CANVAS_W, CANVAS_H } from '../../shared/constants.js';

export class UIManager {
  constructor(events) {
    this.events = events;
    this.hud         = new HUD(events);
    this.inventory   = new InventoryUI(events);
    this.dialogue    = new DialogueBox(events);
    this.shop        = new ShopUI(events);
    this.questLog    = new QuestLog(events);
    this.devConsole  = new DevConsole(events);
    this.notifications = new NotificationSystem(events);
    this.battleUI    = new BattleUI(events);
    this.partyScreen = new PartyScreen();

    this._activePanel = null; // 'inventory' | 'shop' | 'questlog' | 'party' | null

    events.on(EVENTS.DIALOGUE_START, () => { this._activePanel = 'dialogue'; });
    events.on(EVENTS.DIALOGUE_END,   () => { if (this._activePanel === 'dialogue') this._activePanel = null; });
    events.on(EVENTS.SHOP_OPEN,      (d) => { this.shop.open(d.merchant, d.player); this._activePanel = 'shop'; });
    events.on(EVENTS.SHOP_CLOSE,     () => { if (this._activePanel === 'shop') this._activePanel = null; });
    // Close any open panel when battle starts
    events.on(EVENTS.BATTLE_START,   () => { this._activePanel = null; });
  }

  handleInput(input, player, dialogueSystem, questSystem, game) {
    // Toggle dev console (backtick)
    if (input.pressed('Backquote')) {
      this.devConsole.toggle();
      return;
    }
    // Dev console captures all input when open
    if (this.devConsole.visible) return;

    // Battle mode — route all input to BattleUI, block all other panels
    if (game?._inBattle) {
      this.battleUI.handleInput(input, game.systems.battle);
      return;
    }

    // Shop panel — delegate navigation to ShopUI
    if (this._activePanel === 'shop') {
      this.shop.handleInput(input);
      return;
    }

    // Quest log — delegate navigation + tracking
    if (this._activePanel === 'questlog') {
      this.questLog.handleInput(input, questSystem);
      if (input.pressed('KeyJ')) this._activePanel = null;
      return;
    }

    // Party screen — delegate ALL input first so its keys (I, Tab, etc.) aren't consumed by globals
    if (this._activePanel === 'party') {
      if (input.pressed('Escape') || input.pressed('KeyP')) {
        this._activePanel = null;
        return;
      }
      this.partyScreen.handleInput(input, player, game);
      return;
    }

    // Close any open panel with Escape
    if (input.pressed('Escape')) {
      if (this._activePanel) {
        this._closeActivePanel();
        return;
      }
    }

    // Inventory (I)
    if (input.pressed('KeyI')) {
      if (this._activePanel === 'inventory') this._activePanel = null;
      else this._activePanel = 'inventory';
      return;
    }

    // Quest log (J)
    if (input.pressed('KeyJ')) {
      if (this._activePanel === 'questlog') this._activePanel = null;
      else this._activePanel = 'questlog';
      return;
    }

    // Party screen (P)
    if (input.pressed('KeyP')) {
      this._activePanel = 'party';
      return;
    }

    // Inventory item navigation / interaction
    if (this._activePanel === 'inventory') {
      this.inventory.handleInput(input, player);
      return;
    }

    // Interact (E) — when no panel open
    if (input.pressed('KeyE') && !this._activePanel) {
      // Handled by Game.js passing to DialogueSystem
    }

    // Dialogue choices (1-4)
    if (this._activePanel === 'dialogue' && dialogueSystem?.active) {
      for (let i = 0; i < 4; i++) {
        const keys = ['Digit1','Digit2','Digit3','Digit4'];
        if (input.pressed(keys[i])) {
          dialogueSystem.selectChoice(i, questSystem);
          return;
        }
      }
    }
  }

  _closeActivePanel() {
    if (this._activePanel === 'shop')     this.events.emit(EVENTS.SHOP_CLOSE);
    if (this._activePanel === 'dialogue') this.events.emit(EVENTS.DIALOGUE_END);
    this._activePanel = null;
  }

  update(dt, player) {
    this.notifications.update(dt);
    this.hud.update(player);
    this.shop.update(dt);
  }

  render(ctx, player, questSystem, dialogueSystem, camera, game) {
    if (game?._inBattle) {
      // Battle: only show battle overlay + notifications + dev console
      this.battleUI.render(ctx, game.systems.battle, camera);
      this.notifications.render(ctx, camera);
      if (this.devConsole.visible) this.devConsole.render(ctx);
      return;
    }

    // Always render HUD and notifications
    this.hud.render(ctx, player, questSystem, game?._partyMembers);
    this.notifications.render(ctx, camera);

    // Panels (modal)
    if (this._activePanel === 'dialogue' && dialogueSystem?.active) {
      this.dialogue.render(ctx, dialogueSystem);
    }
    if (this._activePanel === 'shop' && this.shop.isOpen) {
      this.shop.render(ctx, player);
    }
    if (this._activePanel === 'inventory') {
      this.inventory.render(ctx, player);
    }
    if (this._activePanel === 'questlog') {
      this.questLog.render(ctx, questSystem);
    }
    if (this._activePanel === 'party') {
      this.partyScreen.render(ctx, player, game);
    }

    // Persistent party prompt banners (stay visible until Y/N)
    if (game) this._renderPartyBanners(ctx, game);

    // Dev console always on top
    if (this.devConsole.visible || this.devConsole._tilesheetMode) {
      this.devConsole.render(ctx);
    }
  }

  _renderPartyBanners(ctx, game) {
    const banners = [];
    if (game._pendingPartyInvite) {
      banners.push({
        text: `${game._pendingPartyInvite.fromName} invites you to party!`,
        hint: '[Y] Accept   [N] Decline',
        color: '#88ccff', border: '#446688',
      });
    }
    if (game._pendingZoneFollow) {
      banners.push({
        text: `${game._pendingZoneFollow.fromName ?? 'Party'} moved to: ${game._pendingZoneFollow.zoneId}`,
        hint: '[Y] Follow   [N] Stay',
        color: '#ffdd88', border: '#886633',
      });
    }
    if (banners.length === 0) return;

    const bw = 280, bh = 46;
    const bx = (CANVAS_W - bw) / 2;
    let by = CANVAS_H - 80 - banners.length * (bh + 6);
    for (const b of banners) {
      ctx.fillStyle = 'rgba(5,10,25,0.92)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = b.border;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = b.color;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.text, bx + bw / 2, by + 16);
      ctx.fillStyle = '#aaa';
      ctx.font = '6px monospace';
      ctx.fillText(b.hint, bx + bw / 2, by + 32);
      ctx.textAlign = 'left';
      by += bh + 6;
    }
  }

  get isModalOpen() {
    return this._activePanel !== null || this.devConsole.visible || this.devConsole._tilesheetMode;
  }
}
