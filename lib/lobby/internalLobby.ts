import { ServerLobbyDestroyedEvent, ServerLobbyJoinRefusedEvent, ServerPacketInRpcCustomEvent, ServerPacketInRpcEvent } from "../api/events/server";
import { BaseGameDataPacket, DataPacket, DespawnPacket, RpcPacket, SceneChangePacket } from "../protocol/packets/gameData";
import { BaseEntityShipStatus } from "../protocol/entities/shipStatus/baseShipStatus/baseEntityShipStatus";
import { BaseRpcPacket, SendChatPacket, UpdateGameDataPacket } from "../protocol/packets/rpc";
import { BaseInnerNetEntity, BaseInnerNetObject } from "../protocol/entities/baseEntity";
import { EntityPlayer, InnerCustomNetworkTransform } from "../protocol/entities/player";
import { LobbyHostMigratedEvent, LobbyPrivacyUpdatedEvent } from "../api/events/lobby";
import { DisconnectReason, GameOptionsData, LobbyListing, Vector2 } from "../types";
import { EntityLobbyBehaviour } from "../protocol/entities/lobbyBehaviour";
import { MessageReader, MessageWriter } from "../util/hazelMessage";
import { EntityMeetingHud } from "../protocol/entities/meetingHud";
import { PlayerData } from "../protocol/entities/gameData/types";
import { EntityGameData } from "../protocol/entities/gameData";
import { PlayerJoinedEvent } from "../api/events/player";
import { RootPacket } from "../protocol/packets/hazel";
import { Connection } from "../protocol/connection";
import { notUndefined } from "../util/functions";
import { PlayerInstance } from "../api/player";
import { LobbyCode } from "../util/lobbyCode";
import { MaxValue } from "../util/constants";
import { LobbyInstance } from "../api/lobby";
import { TextComponent } from "../api/text";
import { HostInstance } from "../api/host";
import { InternalPlayer } from "../player";
import { InternalHost } from "../host";
import { Game } from "../api/game";
import { Logger } from "../logger";
import { Server } from "../server";
import {
  AlterGameTagPacket,
  BaseRootPacket,
  GameDataPacket,
  JoinGameErrorPacket,
  JoinGameResponsePacket,
  JoinedGamePacket,
  KickPlayerPacket,
  RemovePlayerPacket,
  RemoveGamePacket,
} from "../protocol/packets/root";
import {
  AlterGameTag,
  FakeClientId,
  GameDataPacketType,
  GameState,
  InnerNetObjectType,
  Level,
  LimboState,
  PlayerColor,
  PlayerHat,
  PlayerPet,
  PlayerSkin,
  RootPacketType,
  RpcPacketType,
  SpawnFlag,
  SpawnType,
} from "../types/enums";

export class InternalLobby implements LobbyInstance {
  protected readonly createdAt: number = Date.now();
  protected readonly hostInstance: HostInstance = new InternalHost(this);
  protected readonly spawningPlayers: Set<Connection> = new Set();
  protected readonly connections: Connection[] = [];
  protected readonly gameTags: Map<AlterGameTag, number> = new Map([[AlterGameTag.ChangePrivacy, 0]]);
  protected readonly metadata: Map<string, unknown> = new Map();
  protected readonly logger: Logger;
  protected readonly ignoredNetIds: number[] = [];

  protected joinTimer?: NodeJS.Timeout;
  protected startTimer?: NodeJS.Timeout;
  protected game?: Game;
  protected players: InternalPlayer[] = [];
  protected gameState = GameState.NotStarted;
  protected gameData?: EntityGameData;
  protected lobbyBehaviour?: EntityLobbyBehaviour;
  protected shipStatus?: BaseEntityShipStatus;
  protected meetingHud?: EntityMeetingHud;

  constructor(
    protected readonly server: Server,
    protected readonly address: string = server.getDefaultLobbyAddress(),
    protected readonly port: number = server.getDefaultLobbyPort(),
    protected readonly startTimerDuration: number = server.getDefaultLobbyStartTimerDuration(),
    protected readonly timeToJoinUntilClosed: number = server.getDefaultLobbyTimeToJoinUntilClosed(),
    protected readonly timeToStartUntilClosed: number = server.getDefaultLobbyTimeToStartUntilClosed(),
    protected options: GameOptionsData = new GameOptionsData(),
    protected readonly code: string = LobbyCode.generate(),
  ) {
    if (this.timeToJoinUntilClosed > 0) {
      this.joinTimer = setTimeout(() => {
        this.close();
      }, this.timeToJoinUntilClosed * 1000);
    }

    this.logger = this.server.getLogger(`Lobby ${this.code}`);
  }

  getLogger(): Logger {
    return this.logger;
  }

  getServer(): Server {
    return this.server;
  }

  getAddress(): string {
    return this.address;
  }

  getPort(): number {
    return this.port;
  }

  getStartTimerDuration(): number {
    return this.startTimerDuration;
  }

  getCode(): string {
    return this.code;
  }

  getHostName(): string {
    return this.getActingHosts().find(host => host.getName())?.getName()
      ?? this.connections.find(connection => connection.getName())?.getName()
      ?? this.code;
  }

  isPublic(): boolean {
    return !!(this.getGameTag(AlterGameTag.ChangePrivacy) ?? 0);
  }

  isFull(): boolean {
    return this.connections.length >= this.options.getMaxPlayers();
  }

  getLobbyListing(): LobbyListing {
    return new LobbyListing(
      this.address,
      this.port,
      this.code,
      this.getHostName().substring(0, 12),
      this.connections.length,
      this.getAge(),
      this.options.getLevels()[0],
      this.options.getImpostorCount(),
      this.options.getMaxPlayers(),
    );
  }

  getGame(): Game | undefined {
    return this.game;
  }

  /**
   * @internal
   */
  setGame(game?: Game): void {
    this.game = game;
  }

  getCreationTime(): number {
    return this.createdAt;
  }

  getAge(): number {
    return (new Date().getTime() - this.createdAt) / 1000;
  }

  async close(force: boolean = false): Promise<void> {
    const event = new ServerLobbyDestroyedEvent(this);

    await this.server.emit("server.lobby.destroyed", event);

    if (!force && event.isCancelled()) {
      return;
    }

    this.cancelJoinTimer();
    this.cancelStartTimer();
    this.server.deleteLobby(this);
    this.connections.forEach(async connection => connection.sendReliable([new RemoveGamePacket()]));
  }

  hasMeta(key: string): boolean {
    return this.metadata.has(key);
  }

  getMeta(): Map<string, unknown>;
  getMeta<T = unknown>(key: string): T;
  getMeta<T = unknown>(key?: string): Map<string, unknown> | T {
    return key === undefined ? this.metadata : this.metadata.get(key) as T;
  }

  setMeta(pair: Record<string, unknown>): void;
  setMeta(key: string, value: unknown): void;
  setMeta(key: string | Record<string, unknown>, value?: unknown): void {
    if (typeof key === "string") {
      this.metadata.set(key, value);
    } else {
      for (const [k, v] of Object.entries(key)) {
        this.metadata.set(k, v);
      }
    }
  }

  deleteMeta(key: string): void {
    this.metadata.delete(key);
  }

  clearMeta(): void {
    this.metadata.clear();
  }

  getHostInstance(): HostInstance {
    return this.hostInstance;
  }

  getConnections(): Connection[] {
    return this.connections;
  }

  addConnection(connection: Connection): void {
    this.connections.push(connection);
  }

  removeConnection(connection: Connection): void {
    this.connections.splice(this.connections.indexOf(connection), 1);
  }

  getPlayers(): InternalPlayer[] {
    return this.players;
  }

  addPlayer(player: InternalPlayer): void {
    this.players.push(player);
  }

  clearPlayers(): void {
    this.players = [];
  }

  removePlayer(player: InternalPlayer): void {
    this.players.splice(this.players.indexOf(player), 1);
  }

  findInnerNetObject(netId: number): BaseInnerNetObject | undefined {
    switch (netId) {
      case this.lobbyBehaviour?.getLobbyBehaviour().getNetId():
        return this.lobbyBehaviour!.getLobbyBehaviour();
      case this.gameData?.getGameData().getNetId():
        return this.gameData!.getGameData();
      case this.gameData?.getVoteBanSystem().getNetId():
        return this.gameData!.getVoteBanSystem();
      case this.shipStatus?.getShipStatus().getNetId():
        return this.shipStatus!.getShipStatus();
      case this.meetingHud?.getMeetingHud().getNetId():
        return this.meetingHud!.getMeetingHud();
    }

    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      const objects = player.getEntity().getObjects();

      for (let j = 0; j < objects.length; j++) {
        const object = objects[j];

        if (notUndefined(object) && object.getNetId() == netId) {
          return object;
        }
      }
    }
  }

  findPlayerByClientId(clientId: number): InternalPlayer | undefined {
    return this.players.find(player => player.getEntity().getOwnerId() == clientId);
  }

  findPlayerByPlayerId(playerId: number): InternalPlayer | undefined {
    return this.players.find(player => player.getId() == playerId);
  }

  findPlayerByNetId(netId: number): InternalPlayer | undefined {
    return this.players.find(player => player.getEntity().getObjects().some(object => object.getNetId() == netId));
  }

  findPlayerByConnection(connection: Connection): InternalPlayer | undefined {
    return this.players.find(player => player.getEntity().getOwnerId() == connection.id);
  }

  findPlayerByEntity(entity: EntityPlayer): InternalPlayer | undefined {
    return this.players.find(player => player.getEntity().getOwnerId() == entity.getOwnerId());
  }

  findPlayerIndexByConnection(connection: Connection): number {
    return this.players.findIndex(player => player.getEntity().getOwnerId() == connection.id);
  }

  findConnection(id: number): Connection | undefined {
    return this.connections.find(con => con.id == id);
  }

  getGameData(): EntityGameData | undefined {
    return this.gameData;
  }

  setGameData(gameData: EntityGameData): void {
    this.gameData = gameData;
  }

  deleteGameData(): void {
    delete this.gameData;
  }

  getLobbyBehaviour(): EntityLobbyBehaviour | undefined {
    return this.lobbyBehaviour;
  }

  setLobbyBehaviour(lobbyBehaviour: EntityLobbyBehaviour): void {
    this.lobbyBehaviour = lobbyBehaviour;
  }

  deleteLobbyBehaviour(): void {
    delete this.lobbyBehaviour;
  }

  getShipStatus(): BaseEntityShipStatus | undefined {
    return this.shipStatus;
  }

  setShipStatus(shipStatus: BaseEntityShipStatus): void {
    this.shipStatus = shipStatus;
  }

  deleteShipStatus(): void {
    delete this.shipStatus;
  }

  getMeetingHud(): EntityMeetingHud | undefined {
    return this.meetingHud;
  }

  setMeetingHud(meetingHud: EntityMeetingHud): void {
    this.meetingHud = meetingHud;
  }

  deleteMeetingHud(): void {
    delete this.meetingHud;
  }

  getOptions(): GameOptionsData {
    return this.options;
  }

  /**
   * Sets the lobby's raw settings.
   *
   * @internal
   * @param options - The lobby's new raw settings
   */
  setOptions(options: GameOptionsData): void {
    this.options = options;
  }

  getLevel(): Level {
    return this.options.getLevels()[0];
  }

  getGameTags(): Map<AlterGameTag, number> {
    return this.gameTags;
  }

  getGameTag(gameTag: AlterGameTag): number | undefined {
    return this.gameTags.get(gameTag);
  }

  async setGameTag(gameTag: AlterGameTag, value: number): Promise<void> {
    switch (gameTag) {
      case AlterGameTag.ChangePrivacy: {
        const event = new LobbyPrivacyUpdatedEvent(this, !!value);

        await this.server.emit("lobby.privacy.updated", event);

        if (event.isCancelled()) {
          return;
        }

        value = event.isPublic() ? 1 : 0;
        break;
      }
    }

    this.gameTags.set(gameTag, value);
    this.sendRootGamePacket(new AlterGameTagPacket(this.code, gameTag, value));
  }

  getGameState(): GameState {
    return this.gameState;
  }

  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  sendRpcPacket(from: BaseInnerNetObject, packet: BaseRpcPacket, sendTo?: Connection[]): void {
    this.sendRootGamePacket(new GameDataPacket([new RpcPacket(from.getNetId(), packet)], this.code), sendTo);
  }

  spawn(entity: BaseInnerNetEntity): void {
    const type = entity.getType();

    switch (type) {
      case SpawnType.SkeldShipStatus:
      case SpawnType.DleksShipStatus:
      case SpawnType.MiraShipStatus:
      case SpawnType.PolusShipStatus:
      case SpawnType.AirshipStatus:
        this.shipStatus = entity as BaseEntityShipStatus;
        break;
      case SpawnType.GameData:
        this.gameData = entity as EntityGameData;
        break;
      case SpawnType.MeetingHud:
        this.meetingHud = entity as EntityMeetingHud;
        break;
      case SpawnType.LobbyBehaviour:
        this.lobbyBehaviour = entity as EntityLobbyBehaviour;
        break;
      case SpawnType.PlayerControl:
        this.logger.warn("Use LobbyInstance#spawnPlayer() to spawn a player");

        return;
      default:
        throw new Error(`Attempted to spawn an unsupported SpawnType: ${type as SpawnType} (${SpawnType[type]})`);
    }

    this.sendRootGamePacket(new GameDataPacket([entity.serializeSpawn()], this.code), this.getConnections());
  }

  spawnPlayer(player: EntityPlayer, playerData: PlayerData): PlayerInstance {
    if (player.getPlayerControl().getPlayerId() != playerData.getId()) {
      throw new Error(`Attempted to spawn a player with mismatched player IDs: PlayerControl(${player.getPlayerControl().getPlayerId()}) != PlayerData(${playerData.getId()})`);
    }

    const clientIdInUse = !!this.findPlayerByClientId(player.getOwnerId());
    const playerInstance = new InternalPlayer(this, player, this.findConnection(player.getOwnerId()));

    this.addPlayer(playerInstance);

    if (!clientIdInUse) {
      this.sendRootGamePacket(new JoinGameResponsePacket(this.code, player.getOwnerId(), this.hostInstance.getId()));
    }

    this.sendRootGamePacket(new GameDataPacket([player.serializeSpawn()], this.code), this.getConnections());

    if (this.gameData) {
      this.gameData.getGameData().players.push(playerData);
      this.sendRpcPacket(this.gameData.getGameData(), new UpdateGameDataPacket([playerData]));
    }

    return playerInstance;
  }

  despawn(innerNetObject: BaseInnerNetObject): void {
    if (innerNetObject.getParent().getLobby().getCode() != this.code) {
      throw new Error(`Attempted to despawn an InnerNetObject from a lobby other than its own`);
    }

    this.sendRootGamePacket(new GameDataPacket([new DespawnPacket(innerNetObject.getNetId())], this.code));
  }

  getActingHosts(): Connection[] {
    return this.connections.filter(con => con.isActingHost());
  }

  sendChat(name: string, color: PlayerColor, message: string | TextComponent, onLeft: boolean): void {
    if (!this.gameData) {
      throw new Error("sendChat called without a GameData instance");
    }

    if (onLeft) {
      const playerId = this.hostInstance.getNextPlayerId();

      const fakePlayer = new EntityPlayer(
        this,
        FakeClientId.ServerChat,
        Vector2.zero(),
        Vector2.zero(),
        playerId,
        false,
        SpawnFlag.None,
      );

      this.spawnPlayer(fakePlayer, new PlayerData(
        playerId,
        name,
        color,
        PlayerHat.None,
        PlayerPet.None,
        PlayerSkin.None,
        false,
        false,
        false,
        [],
      ));

      this.sendRpcPacket(fakePlayer.getPlayerControl(), new SendChatPacket(message.toString()));
      fakePlayer.despawn();
    } else {
      for (let i = 0; i < this.players.length; i++) {
        const player = this.players[i];
        const connection = player.getConnection();

        if (connection) {
          const playerData = player.getGameDataEntry();
          const oldColor = playerData.getColor();
          const oldName = playerData.getName();

          playerData.setColor(color);
          playerData.setName(name);

          connection.writeReliable(new GameDataPacket([
            new RpcPacket(this.gameData.getGameData().getNetId(), new UpdateGameDataPacket([playerData])),
            new RpcPacket(player.getEntity().getPlayerControl().getNetId(), new SendChatPacket(message.toString())),
          ], this.code));

          playerData.setColor(oldColor);
          playerData.setName(oldName);

          connection.writeReliable(new GameDataPacket([
            new RpcPacket(this.gameData.getGameData().getNetId(), new UpdateGameDataPacket([playerData])),
          ], this.code));
        }
      }
    }
  }

  /**
   * Adds the given net IDs to the array of ignored net IDs.
   *
   * @internal
   * @param ids - The net IDs to be ignored
   */
  ignoreNetIds(...ids: number[]): void {
    this.ignoredNetIds.push(...ids);
  }

  /**
   * Gets whether or not the lobby is currently spawning player characters.
   *
   * @internal
   * @returns `true` if players are still being spawned, `false` if not
   */
  isSpawningPlayers(): boolean {
    return this.spawningPlayers.size > 0;
  }

  /**
   * Marks a connection as having had their player character successfully
   * spawned.
   *
   * @internal
   * @param connection - The connection to be marked as spawned
   */
  async finishedSpawningPlayer(connection: Connection): Promise<void> {
    this.spawningPlayers.delete(connection);

    const player = this.findPlayerByConnection(connection);

    if (player && !player.hasBeenInitialized()) {
      player.setInitialized(true);

      await this.getServer().emit("player.joined", new PlayerJoinedEvent(this, player, !connection.firstJoin));

      connection.firstJoin = false;
    }
  }

  /**
   * Adds the given connection to the list of connections whose player
   * characters are currently being spawned.
   *
   * @internal
   * @param connection - The connection to be marked as spawning
   */
  startedSpawningPlayer(connection: Connection): void {
    this.spawningPlayers.add(connection);
  }

  /**
   * Temporarily removes the acting host status from all acting hosts.
   *
   * @internal
   * @param sendImmediately - `true` to send the packet immediately, `false` to send it with the next batch of packets (default `true`)
   */
  disableActingHosts(sendImmediately: boolean = true): void {
    const actingHosts = this.getActingHosts();

    for (let i = 0; i < actingHosts.length; i++) {
      if (actingHosts[i].limboState == LimboState.NotLimbo) {
        this.sendDisableHost(actingHosts[i], sendImmediately);
      }
    }
  }

  /**
   * Reapplies the acting host status to all acting hosts.
   *
   * @internal
   * @param sendImmediately - `true` to send the packet immediately, `false` to send it with the next batch of packets (default `true`)
   */
  enableActingHosts(sendImmediately: boolean = true): void {
    const actingHosts = this.getActingHosts();

    for (let i = 0; i < actingHosts.length; i++) {
      if (actingHosts[i].limboState == LimboState.NotLimbo) {
        this.sendEnableHost(actingHosts[i], sendImmediately);
      }
    }
  }

  /**
   * Updates the client for the given connection to enable host abilities.
   *
   * @internal
   * @param connection - The connection whose host abilities will be enabled
   * @param sendImmediately - `true` to send the packet immediately, `false` to send it with the next batch of packets (default `true`)
   */
  sendEnableHost(connection: Connection, sendImmediately: boolean = true): void {
    if (connection.limboState != LimboState.NotLimbo) {
      return;
    }

    if (sendImmediately) {
      connection.sendReliable([new JoinGameResponsePacket(this.code, connection.id, connection.id)]);
    } else {
      connection.writeReliable(new JoinGameResponsePacket(this.code, connection.id, connection.id));
    }
  }

  /**
   * Updates the client for the given connection to disable host abilities.
   *
   * @internal
   * @param connection - The connection whose host abilities will be disabled
   * @param sendImmediately - `true` to send the packet immediately, `false` to send it with the next batch of packets (default `true`)
   */
  sendDisableHost(connection: Connection, sendImmediately: boolean = true): void {
    if (connection.limboState != LimboState.NotLimbo) {
      return;
    }

    if (sendImmediately) {
      connection.sendReliable([new JoinGameResponsePacket(this.code, connection.id, this.hostInstance.getId())]);
    } else {
      connection.writeReliable(new JoinGameResponsePacket(this.code, connection.id, this.hostInstance.getId()));
    }
  }

  /**
   * Sends the given packet as a reliable packet to the given connections.
   *
   * @internal
   * @param packet - The packet to be sent
   * @param sendTo - The connections to which the packet will be send (default `this.connections`)
   */
  async sendRootGamePacket(packet: BaseRootPacket, sendTo: Connection[] = this.connections): Promise<PromiseSettledResult<void>[]> {
    const promiseArray: Promise<void>[] = [];

    for (let i = 0; i < sendTo.length; i++) {
      promiseArray.push(sendTo[i].writeReliable(packet));
    }

    return Promise.allSettled(promiseArray);
  }

  /**
   * Sends the given packet as an unreliable packet to the given connections.
   *
   * @internal
   * @param packet - The packet to be sent
   * @param sendTo - The connections to which the packet will be send (default `this.connections`)
   */
  sendUnreliableRootGamePacket(packet: BaseRootPacket, sendTo: Connection[] = this.connections): void {
    for (let i = 0; i < sendTo.length; i++) {
      sendTo[i].writeUnreliable(packet);
    }
  }

  /**
   * Removes the given connection from the lobby and migrates hosts.
   *
   * @internal
   * @param connection - The connection that was disconnected
   * @param reason - The reason for why the connection was disconnected
   */
  handleDisconnect(connection: Connection, reason?: DisconnectReason): void {
    this.hostInstance.handleDisconnect(connection, reason);

    const disconnectingConnectionIndex = this.connections.indexOf(connection);
    const disconnectingPlayerIndex = this.findPlayerIndexByConnection(connection);

    if (disconnectingConnectionIndex > -1) {
      this.connections.splice(disconnectingConnectionIndex, 1);
    }

    if (this.meetingHud && disconnectingPlayerIndex) {
      const oldMeetingHud = this.meetingHud.getMeetingHud().clone();
      const disconnectedId = this.players[disconnectingPlayerIndex].getId();
      const votesToClear: InternalPlayer[] = [];

      for (let i = 0; i < this.meetingHud.getMeetingHud().playerStates.length; i++) {
        const state = this.meetingHud.getMeetingHud().playerStates[i];

        if (i == disconnectedId) {
          state.setDead(true);
          state.setVotedFor(-1);
          state.setVoted(false);
        } else if (state.getVotedFor() == disconnectedId) {
          const votingPlayer = this.findPlayerByPlayerId(i);

          if (votingPlayer) {
            votesToClear.push(votingPlayer);
          }

          state.setVotedFor(-1);
          state.setVoted(false);
        }
      }

      this.sendRootGamePacket(new GameDataPacket([
        this.meetingHud.getMeetingHud().serializeData(oldMeetingHud),
      ], this.code));
      this.meetingHud.getMeetingHud().clearVote(votesToClear);
    }

    if (disconnectingPlayerIndex) {
      this.players.splice(disconnectingPlayerIndex, 1);
    }

    if (connection.isActingHost() && this.connections.length > 0) {
      this.migrateHost(connection);
    }

    this.sendRootGamePacket(new RemovePlayerPacket(this.code, connection.id, 0, reason ?? DisconnectReason.exitGame()));
  }

  /**
   * Stops the timer for automatically closing the lobby if the first player
   * takes too long to join.
   *
   * @internal
   */
  cancelJoinTimer(): void {
    if (!this.joinTimer) {
      return;
    }

    clearTimeout(this.joinTimer);

    delete this.joinTimer;
  }

  /**
   * Starts the timer for automatically closing the lobby if the hosts take
   * too long to start a game.
   *
   * @internal
   */
  beginStartTimer(): void {
    if (this.startTimer || this.timeToStartUntilClosed < 1) {
      return;
    }

    this.startTimer = setTimeout(() => {
      this.close();
    }, this.timeToStartUntilClosed * 1000);
  }

  /**
   * Stops the timer for automatically closing the lobby if the hosts take
   * too long to start a game.
   *
   * @internal
   */
  cancelStartTimer(): void {
    if (!this.startTimer) {
      return;
    }

    clearTimeout(this.startTimer);

    delete this.startTimer;
  }

  /**
   * Adds the given connection to the lobby.
   *
   * @internal
   * @param connection - The connection that is joining the lobby
   */
  async handleJoin(connection: Connection): Promise<void> {
    this.logger.verbose("Connection %s joining", connection);

    if (this.connections.indexOf(connection) == -1) {
      const count = this.connections.length;

      if (count >= this.options.getMaxPlayers() || count >= this.server.getMaxPlayersPerLobby()) {
        const event = new ServerLobbyJoinRefusedEvent(connection, this);

        await this.server.emit("server.lobby.join.refused", event);

        if (!event.isCancelled()) {
          this.logger.verbose("Preventing connection %s from joining full lobby", connection);

          connection.writeReliable(new JoinGameErrorPacket(event.getDisconnectReason()));

          return;
        }

        this.logger.verbose("Allowing connection %s to join full lobby", connection);
      }
    }

    this.disableActingHosts();

    if (!connection.lobby) {
      connection.lobby = this;

      connection.on("packet", (packet: BaseRootPacket) => this.handlePacket(packet, connection));
    }

    switch (this.gameState) {
      case GameState.NotStarted:
        this.handleNewJoin(connection);
        break;
      case GameState.Ended:
        // TODO: Dead code, InternalHost#endGame sets gameState to NotStarted
        this.handleRejoin(connection);
        break;
      default:
        connection.sendReliable([new JoinGameErrorPacket(DisconnectReason.gameStarted())]);
    }
  }

  /**
   * @internal
   */
  clearMessage(): void {
    // TODO: Find out how, or bug Forte some more about those custom RPC messages
  }

  /**
   * Called when the lobby receives a packet from a connection.
   *
   * @internal
   * @param packet - The packet that was sent to the lobby
   * @param sender - The connection that sent the packet
   */
  protected handlePacket(packet: BaseRootPacket, sender: Connection): void {
    switch (packet.getType()) {
      case RootPacketType.AlterGameTag: {
        const data = packet as AlterGameTagPacket;

        this.setGameTag(data.tag, data.value);
        break;
      }
      case RootPacketType.GameData:
        // fallthrough
      case RootPacketType.GameDataTo: {
        if (sender.limboState == LimboState.PreSpawn) {
          return;
        }

        const gameData = packet as GameDataPacket;
        let target: Connection | undefined;

        if (gameData.targetClientId) {
          target = this.findConnection(gameData.targetClientId);
        }

        for (let i = 0; i < gameData.packets.length; i++) {
          this.handleGameDataPacket(gameData.packets[i], sender, target ? [target] : undefined);
        }
        break;
      }
      case RootPacketType.KickPlayer: {
        const data = packet as KickPlayerPacket;
        const id = data.kickedClientId;
        const connection = this.findConnection(id);

        if (!connection) {
          this.logger.warn(`KickPlayer sent for unknown client: ${id}`);

          return;
        }

        if (sender.isActingHost()) {
          connection.sendKick(data.banned, this.findPlayerByConnection(sender), data.disconnectReason);
        }
        break;
      }
      case RootPacketType.EndGame:
        break;
      case RootPacketType.RemoveGame:
        break;
      case RootPacketType.RemovePlayer:
        break;
      case RootPacketType.StartGame:
        break;
      case RootPacketType.WaitForHost:
        break;
      case RootPacketType.JoinGame:
        break;
      default: {
        if (RootPacket.hasPacket(packet.getType())) {
          break;
        }

        throw new Error(`Attempted to handle an unimplemented root game packet type: ${packet.getType()} (${RootPacketType[packet.getType()]})`);
      }
    }
  }

  /**
   * Called when the lobby receives a GameData packet from a connection.
   *
   * @internal
   * @param packet - The packet that was sent to the lobby
   * @param sender - The connection that sent the packet
   * @param sendTo - The connections to which the packet was intended to be sent
   */
  protected async handleGameDataPacket(packet: BaseGameDataPacket, sender: Connection, sendTo?: Connection[]): Promise<void> {
    sendTo = ((sendTo && sendTo.length > 0) ? sendTo : this.connections).filter(c => c.id != sender.id);

    switch (packet.getType()) {
      case GameDataPacketType.Data:
        if (!this.ignoredNetIds.includes((packet as DataPacket).senderNetId)) {
          this.handleData((packet as DataPacket).senderNetId, (packet as DataPacket).data, sendTo);
        }
        break;
      case GameDataPacketType.Despawn:
        break;
      case GameDataPacketType.RPC: {
        const rpc = packet as RpcPacket;

        if (this.ignoredNetIds.includes(rpc.senderNetId)) {
          break;
        }

        if (rpc.packet.getType() in RpcPacketType) {
          if (this.server.listenerCount("server.packet.in.rpc") > 0) {
            const event = new ServerPacketInRpcEvent(sender, rpc.senderNetId, this.findInnerNetObject(rpc.senderNetId), rpc.packet);

            await this.server.emit("server.packet.in.rpc", event);

            if (event.isCancelled()) {
              break;
            }
          }

          if (rpc.senderNetId === MaxValue.UInt32) {
            this.getLogger().warn("RPC packet sent from unexpected InnerNetObject: -1");

            return;
          }

          const object = this.findInnerNetObject(rpc.senderNetId);

          if (!object) {
            throw new Error(`RPC packet sent from unknown InnerNetObject: ${rpc.senderNetId}`);
          }

          object.handleRpc(sender, rpc.packet.getType(), rpc.packet, sendTo);
        } else {
          const custom = RpcPacket.getPacket(rpc.packet.getType());

          if (custom !== undefined) {
            const object = this.findInnerNetObject(rpc.senderNetId);

            if (this.server.listenerCount("server.packet.in.rpc.custom") > 0) {
              const event = new ServerPacketInRpcCustomEvent(sender, rpc.senderNetId, object, rpc.packet);

              await this.server.emit("server.packet.in.rpc.custom", event);

              if (event.isCancelled()) {
                break;
              }
            }

            custom.handle(sender, rpc.packet, object);
          }
        }
        break;
      }
      case GameDataPacketType.Ready:
        this.hostInstance.handleReady(sender);
        break;
      case GameDataPacketType.SceneChange: {
        if ((packet as SceneChangePacket).scene != "OnlineGame") {
          return;
        }

        const connectionChangingScene = this.findConnection((packet as SceneChangePacket).clientId);

        if (!connectionChangingScene) {
          throw new Error(`SceneChange packet sent for unknown client: ${(packet as SceneChangePacket).clientId}`);
        }

        this.hostInstance.handleSceneChange(connectionChangingScene, (packet as SceneChangePacket).scene);
        break;
      }
      case GameDataPacketType.Spawn:
        break;
      default:
        throw new Error(`Attempted to handle an unimplemented game data packet type: ${packet.getType() as number} (${GameDataPacketType[packet.getType()]})`);
    }
  }

  /**
   * Called when the lobby receives a Data packet from a connection.
   *
   * @param netId - The net ID of the InnerNetObject that sent the packet
   * @param data - The packet's data
   * @param sendTo - The connections to which the packet was intended to be sent
   */
  protected handleData(netId: number, data: MessageReader | MessageWriter, sendTo?: Connection[]): void {
    const netObject = this.findInnerNetObject(netId);

    if (netObject) {
      if (netObject.getType() == InnerNetObjectType.CustomNetworkTransform) {
        const oldNetObject = netObject.clone();

        (netObject as InnerCustomNetworkTransform).setData(data);
        this.sendUnreliableRootGamePacket(new GameDataPacket([netObject.serializeData(oldNetObject)], this.code), sendTo ?? []);
      }
    } else {
      throw new Error(`Data packet sent with unknown InnerNetObject ID: ${netId}`);
    }
  }

  /**
   * Spawns a player for the given connection.
   *
   * @internal
   * @param connection - The connection that joined the lobby
   */
  protected handleNewJoin(connection: Connection): void {
    if (this.connections.indexOf(connection) == -1) {
      this.connections.push(connection);
    }

    if (this.connections.length == 1) {
      this.cancelJoinTimer();
      this.beginStartTimer();

      connection.updateActingHost(true);
    }

    connection.limboState = LimboState.NotLimbo;

    this.startedSpawningPlayer(connection);
    this.sendJoinedMessage(connection);
    this.broadcastJoinMessage(connection);
  }

  /**
   * Disconnects players from the lobby if they took to long to rejoin.
   *
   * @internal
   * @param connection - The connection that rejoined the lobby
   */
  protected handleRejoin(connection: Connection): void {
    if (connection.lobby?.code != this.code) {
      connection.sendReliable([new JoinGameErrorPacket(DisconnectReason.gameStarted())]);
    }
  }

  /**
   * Assigns a new acting host when an acting host leaves the lobby.
   *
   * @internal
   * @param oldHost - The connection that is no longer an acting host
   */
  protected async migrateHost(oldHost: Connection): Promise<void> {
    const event = new LobbyHostMigratedEvent(this, oldHost, this.connections[0]);

    await this.server.emit("lobby.host.migrated", event);

    if (event.isCancelled()) {
      return;
    }

    event.getNewHost().setActingHost(true);
  }

  /**
   * Sends a JoinGameResponse packet to all connections in the lobby when
   * another connection joins the lobby.
   *
   * @internal
   * @param connection - The connection that joined the lobby
   */
  protected broadcastJoinMessage(connection: Connection): void {
    this.sendRootGamePacket(
      new JoinGameResponsePacket(
        this.code,
        connection.id,
        this.hostInstance.getId(),
      ),
      this.connections
        .filter(con => con.id != connection.id)
        .filter(con => con.limboState == LimboState.NotLimbo),
    );
  }

  /**
   * Sends a JoinedGame packet to the given connection.
   *
   * @internal
   * @param connection - The connection that joined the lobby
   */
  protected sendJoinedMessage(connection: Connection): void {
    connection.sendReliable([
      new JoinedGamePacket(
        this.code,
        connection.id,
        this.hostInstance.getId(),
        this.connections
          .filter(con => con.id != connection.id && con.limboState == LimboState.NotLimbo)
          .map(con => con.id)),
      new AlterGameTagPacket(
        this.code,
        AlterGameTag.ChangePrivacy,
        this.getGameTag(AlterGameTag.ChangePrivacy) ?? 0),
    ]);
  }
}
