import {
  ConnectionClosedEvent,
  ConnectionOpenedEvent,
} from "./connection";
import {
  GameCamerasClosedEvent,
  GameCamerasOpenedEvent,
  GameEndedEvent,
  GameScannerDequeuedEvent,
  GameScannerQueuedEvent,
  GameScannerStartedEvent,
  GameScannerStoppedEvent,
  GameStartedEvent,
  GameStartingEvent,
  GameVentEnteredEvent,
  GameVentExitedEvent,
} from "./game";
import {
  LobbyCountdownStartedEvent,
  LobbyCountdownStoppedEvent,
  LobbyHostAddedEvent,
  LobbyHostMigratedEvent,
  LobbyHostRemovedEvent,
  LobbyOptionsUpdatedEvent,
  LobbyPrivacyUpdatedEvent,
} from "./lobby";
import { LobbyButtonClickedEvent } from "./lobby/lobbyButtonClickedEvent";
import {
  MeetingClosedEvent,
  MeetingConcludedEvent,
  MeetingEndedEvent,
  MeetingStartedEvent,
  MeetingVoteAddedEvent,
  MeetingVoteRemovedEvent,
} from "./meeting";
import {
  PlayerBannedEvent,
  PlayerChatMessageEvent,
  PlayerChatNoteEvent,
  PlayerColorUpdatedEvent,
  PlayerDiedEvent,
  PlayerExiledEvent,
  PlayerHatUpdatedEvent,
  PlayerJoinedEvent,
  PlayerKickedEvent,
  PlayerLeftEvent,
  PlayerMurderedEvent,
  PlayerNameUpdatedEvent,
  PlayerPetUpdatedEvent,
  PlayerPositionTeleportedEvent,
  PlayerPositionUpdatedEvent,
  PlayerPositionWalkedEvent,
  PlayerRevivedEvent,
  PlayerRoleUpdatedEvent,
  PlayerSkinUpdatedEvent,
  PlayerSpawnedEvent,
  PlayerTaskAddedEvent,
  PlayerTaskAnimationEvent,
  PlayerTaskCompletedEvent,
  PlayerTaskRemovedEvent,
  PlayerTaskUncompletedEvent,
  PlayerVotekickAddedEvent,
  PlayerVotekickRemovedEvent,
} from "./player";
import {
  RoomCommunicationsConsoleClosedEvent,
  RoomCommunicationsConsoleOpenedEvent,
  RoomCommunicationsConsoleRepairedEvent,
  RoomDecontaminationEnteredEvent,
  RoomDecontaminationExitedEvent,
  RoomDecontaminationSprayedEvent,
  RoomDoorsClosedEvent,
  RoomDoorsOpenedEvent,
  RoomElectricalInteractedEvent,
  RoomHeliConsoleClosedEvent,
  RoomHeliConsoleOpenedEvent,
  RoomHeliConsoleRepairedEvent,
  RoomOxygenConsoleRepairedEvent,
  RoomReactorConsoleClearedEvent,
  RoomReactorConsoleRepairedEvent,
  RoomRepairedEvent,
  RoomSabotagedEvent,
} from "./room";
import {
  ServerLobbyCreatedEvent,
  ServerLobbyCreatedRefusedEvent,
  ServerLobbyCreatingEvent,
  ServerLobbyDestroyedEvent,
  ServerLobbyJoinEvent,
  ServerLobbyJoinRefusedEvent,
  ServerLobbyListEvent,
  ServerPacketInCustomEvent,
  ServerPacketInEvent,
  ServerPacketInGameDataCustomEvent,
  ServerPacketInGameDataEvent,
  ServerPacketInRpcCustomEvent,
  ServerPacketInRpcEvent,
  ServerPacketOutCustomEvent,
  ServerPacketOutEvent,
  ServerPacketOutGameDataCustomEvent,
  ServerPacketOutGameDataEvent,
  ServerPacketOutRpcCustomEvent,
  ServerPacketOutRpcEvent,
  ServerPlayerReportedEvent,
} from "./server";

/**
 * All Server events.
 */
export type ServerEvents = {
  /**
   * Fired when the Server successfully binds to the network address and port.
   */
  "server.ready": undefined;
  /**
   * Fired when the Server shuts down.
   */
  "server.close": undefined;

  /**
   * Button events
   */
  "button.clicked": LobbyButtonClickedEvent;

  /**
   * Connection Events
   */
  "connection.closed": ConnectionClosedEvent;
  "connection.opened": ConnectionOpenedEvent;

  /**
   * Game Events
   */
  "game.cameras.closed": GameCamerasClosedEvent;
  "game.cameras.opened": GameCamerasOpenedEvent;
  "game.ended": GameEndedEvent;
  "game.scanner.dequeued": GameScannerDequeuedEvent;
  "game.scanner.queued": GameScannerQueuedEvent;
  "game.scanner.started": GameScannerStartedEvent;
  "game.scanner.stopped": GameScannerStoppedEvent;
  "game.started": GameStartedEvent;
  "game.starting": GameStartingEvent;
  "game.vent.entered": GameVentEnteredEvent;
  "game.vent.exited": GameVentExitedEvent;

  /**
   * Lobby Events
   */
  "lobby.countdown.started": LobbyCountdownStartedEvent;
  "lobby.countdown.stopped": LobbyCountdownStoppedEvent;
  "lobby.host.added": LobbyHostAddedEvent;
  "lobby.host.removed": LobbyHostRemovedEvent;
  "lobby.host.migrated": LobbyHostMigratedEvent;
  "lobby.options.updated": LobbyOptionsUpdatedEvent;
  "lobby.privacy.updated": LobbyPrivacyUpdatedEvent;

  /**
   * Meeting Events
   */
  "meeting.closed": MeetingClosedEvent;
  "meeting.concluded": MeetingConcludedEvent;
  "meeting.ended": MeetingEndedEvent;
  "meeting.started": MeetingStartedEvent;
  "meeting.vote.added": MeetingVoteAddedEvent;
  "meeting.vote.removed": MeetingVoteRemovedEvent;

  /**
   * Player Events
   */
  "player.banned": PlayerBannedEvent;
  "player.chat.message": PlayerChatMessageEvent;
  "player.chat.note": PlayerChatNoteEvent;
  "player.color.updated": PlayerColorUpdatedEvent;
  "player.died": PlayerDiedEvent;
  "player.exiled": PlayerExiledEvent;
  "player.hat.updated": PlayerHatUpdatedEvent;
  "player.joined": PlayerJoinedEvent;
  "player.kicked": PlayerKickedEvent;
  "player.left": PlayerLeftEvent;
  "player.murdered": PlayerMurderedEvent;
  "player.name.updated": PlayerNameUpdatedEvent;
  "player.pet.updated": PlayerPetUpdatedEvent;
  "player.position.teleported": PlayerPositionTeleportedEvent;
  "player.position.updated": PlayerPositionUpdatedEvent;
  "player.position.walked": PlayerPositionWalkedEvent;
  "player.revived": PlayerRevivedEvent;
  "player.role.updated": PlayerRoleUpdatedEvent;
  "player.skin.updated": PlayerSkinUpdatedEvent;
  "player.spawned": PlayerSpawnedEvent;
  "player.task.added": PlayerTaskAddedEvent;
  "player.task.animation": PlayerTaskAnimationEvent;
  "player.task.completed": PlayerTaskCompletedEvent;
  "player.task.removed": PlayerTaskRemovedEvent;
  "player.task.uncompleted": PlayerTaskUncompletedEvent;
  "player.votekick.added": PlayerVotekickAddedEvent;
  "player.votekick.removed": PlayerVotekickRemovedEvent;

  /**
   * Room Events
   */
  "room.communications.console.closed": RoomCommunicationsConsoleClosedEvent;
  "room.communications.console.opened": RoomCommunicationsConsoleOpenedEvent;
  "room.communications.console.repaired": RoomCommunicationsConsoleRepairedEvent;
  "room.decontamination.entered": RoomDecontaminationEnteredEvent;
  "room.decontamination.exited": RoomDecontaminationExitedEvent;
  "room.decontamination.sprayed": RoomDecontaminationSprayedEvent;
  "room.doors.closed": RoomDoorsClosedEvent;
  "room.doors.opened": RoomDoorsOpenedEvent;
  "room.electrical.interacted": RoomElectricalInteractedEvent;
  "room.heli.console.closed": RoomHeliConsoleClosedEvent;
  "room.heli.console.opened": RoomHeliConsoleOpenedEvent;
  "room.heli.console.repaired": RoomHeliConsoleRepairedEvent;
  "room.oxygen.console.repaired": RoomOxygenConsoleRepairedEvent;
  "room.reactor.console.cleared": RoomReactorConsoleClearedEvent;
  "room.reactor.console.repaired": RoomReactorConsoleRepairedEvent;
  "room.repaired": RoomRepairedEvent;
  "room.sabotaged": RoomSabotagedEvent;

  /**
   * Server Events
   */
  "server.lobby.created": ServerLobbyCreatedEvent;
  "server.lobby.created.refused": ServerLobbyCreatedRefusedEvent;
  "server.lobby.creating": ServerLobbyCreatingEvent;
  "server.lobby.destroyed": ServerLobbyDestroyedEvent;
  "server.lobby.join": ServerLobbyJoinEvent;
  "server.lobby.join.refused": ServerLobbyJoinRefusedEvent;
  "server.lobby.list": ServerLobbyListEvent;
  "server.packet.in.custom": ServerPacketInCustomEvent;
  "server.packet.in": ServerPacketInEvent;
  "server.packet.in.gamedata.custom": ServerPacketInGameDataCustomEvent;
  "server.packet.in.gamedata": ServerPacketInGameDataEvent;
  "server.packet.in.rpc.custom": ServerPacketInRpcCustomEvent;
  "server.packet.in.rpc": ServerPacketInRpcEvent;
  "server.packet.out.custom": ServerPacketOutCustomEvent;
  "server.packet.out": ServerPacketOutEvent;
  "server.packet.out.gamedata.custom": ServerPacketOutGameDataCustomEvent;
  "server.packet.out.gamedata": ServerPacketOutGameDataEvent;
  "server.packet.out.rpc.custom": ServerPacketOutRpcCustomEvent;
  "server.packet.out.rpc": ServerPacketOutRpcEvent;
  "server.player.reported": ServerPlayerReportedEvent;
};
