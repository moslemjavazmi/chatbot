import {
  SupportIdentity,
  SupportPresence,
} from "../types/socket";

interface PresenceEntry {
  identity: SupportIdentity;
  socketIds: Set<string>;
  lastSeen: string | null;
}

export class PresenceManager {
  private entries = new Map<
    string,
    PresenceEntry
  >();

  private getKey(identity: SupportIdentity) {
    return `${identity.type}:${identity.id}`;
  }

  addConnection(
    identity: SupportIdentity,
    socketId: string
  ): SupportPresence {
    const key = this.getKey(identity);

    let entry = this.entries.get(key);

    if (!entry) {
      entry = {
        identity,
        socketIds: new Set(),
        lastSeen: null,
      };

      this.entries.set(key, entry);
    }

    entry.socketIds.add(socketId);

    return this.toPresence(entry);
  }

  removeConnection(
    identity: SupportIdentity,
    socketId: string
  ): SupportPresence {
    const key = this.getKey(identity);

    const entry = this.entries.get(key);

    if (!entry) {
      return {
        id: identity.id,
        type: identity.type,
        online: false,
        lastSeen: new Date().toISOString(),
      };
    }

    entry.socketIds.delete(socketId);

    if (entry.socketIds.size === 0) {
      entry.lastSeen = new Date().toISOString();
    }

    return this.toPresence(entry);
  }

  getAll(): SupportPresence[] {
    return Array.from(this.entries.values()).map(
      (entry) => this.toPresence(entry)
    );
  }

  private toPresence(
    entry: PresenceEntry
  ): SupportPresence {
    return {
      id: entry.identity.id,
      type: entry.identity.type,
      online: entry.socketIds.size > 0,
      lastSeen: entry.lastSeen,
    };
  }
}