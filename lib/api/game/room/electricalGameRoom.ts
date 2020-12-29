import { ElectricalAmount } from "../../../protocol/packets/rpc/repairSystem/amounts";
import { SwitchSystem } from "../../../protocol/entities/baseShipStatus/systems";
import { InternalSystemType } from "../../../protocol/entities/baseShipStatus";
import { SystemType } from "../../../types/enums";
import { InternalPlayer } from "../../../player";
import { BaseDoorGameRoom } from ".";
import { Game } from "..";

export class Switch {
  constructor(
    public room: ElectricalGameRoom,
    public readonly index: number,
  ) {}

  getState(): boolean {
    return this.room.getInternalSystem().actualSwitches.bits[this.index];
  }

  getPreferredState(): boolean {
    return this.room.getInternalSystem().expectedSwitches.bits[this.index];
  }

  flip(): void {
    this.room.internalBackupShipStatus();

    this.room.getInternalSystem().actualSwitches.bits[this.index] = !this.getState();

    this.room.internalUpdateShipStatus();
  }

  setOn(): void {
    if (!this.getState()) {
      this.flip();
    }
  }

  setOff(): void {
    if (this.getState()) {
      this.flip();
    }
  }

  repair(): void {
    if (this.getState() != this.getPreferredState()) {
      this.flip();
    }
  }

  flipPreferred(): void {
    this.room.internalBackupShipStatus();

    this.room.getInternalSystem().expectedSwitches.bits[this.index] = !this.getPreferredState();

    this.room.internalUpdateShipStatus();
  }

  setPreferredOn(): void {
    if (!this.getPreferredState()) {
      this.flipPreferred();
    }
  }

  setPreferredOff(): void {
    if (this.getPreferredState()) {
      this.flipPreferred();
    }
  }
}

export class ElectricalGameRoom extends BaseDoorGameRoom {
  private readonly internalSwitches = [
    new Switch(this, 0),
    new Switch(this, 1),
    new Switch(this, 2),
    new Switch(this, 3),
    new Switch(this, 4),
  ];

  constructor(game: Game) {
    super(game, SystemType.Electrical);
  }

  getSwitches(): Switch[] {
    return this.internalSwitches;
  }

  isSabotaged(): boolean {
    for (let i = 0; i < this.getSwitches().length; i++) {
      if (this.getSwitches()[i].getState() != this.getSwitches()[i].getPreferredState()) {
        return true;
      }
    }

    return false;
  }

  getInternalSystem(): SwitchSystem {
    return this.getInternalShipStatus().systems[InternalSystemType.Switch] as SwitchSystem;
  }

  // TODO: Understand Airship's Electrical Doors, and add a serializer/deserializer

  sabotage(): void {
    this.internalBackupShipStatus();

    if (!this.game.lobby.internalLobby.customHostInstance.sabotageHandler) {
      throw new Error("Host has no SabotageHandler instance");
    }

    this.game.lobby.internalLobby.customHostInstance.sabotageHandler.sabotageElectrical(this.getInternalSystem());

    this.internalUpdateShipStatus();
  }

  repair(): void {
    this.internalBackupShipStatus();

    if (!this.game.lobby.internalLobby.customHostInstance.systemsHandler) {
      throw new Error("Host has no SystemsHandler instance");
    }

    for (let i = 0; i < this.getInternalSystem().actualSwitches.bits.length; i++) {
      const actualSwitch = this.getInternalSystem().actualSwitches.bits[i];
      const expectedSwitch = this.getInternalSystem().expectedSwitches.bits[i];

      if (actualSwitch != expectedSwitch) {
        this.game.lobby.internalLobby.customHostInstance.systemsHandler.repairSwitch(
          undefined as unknown as InternalPlayer,
          this.getInternalSystem(),
          new ElectricalAmount(i),
        );
      }
    }

    this.internalUpdateShipStatus();
  }
}
