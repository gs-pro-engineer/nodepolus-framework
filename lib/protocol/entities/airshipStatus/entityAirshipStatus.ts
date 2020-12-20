import { SpawnInnerNetObject } from "../../packets/gameData/types";
import { SpawnFlag, SpawnType } from "../../../types/enums";
import { BaseEntity, LobbyImplementation } from "../types";
import { SpawnPacket } from "../../packets/gameData";
import { InnerAirshipStatus } from ".";

export type AirshipStatusInnerNetObjects = [ InnerAirshipStatus ];

export class EntityAirshipStatus extends BaseEntity {
  public owner!: number;
  public flags: SpawnFlag = SpawnFlag.None;
  public innerNetObjects!: AirshipStatusInnerNetObjects;

  get aprilShipStatus(): InnerAirshipStatus {
    return this.innerNetObjects[0];
  }

  constructor(lobby: LobbyImplementation) {
    super(SpawnType.Airship, lobby);
  }

  static spawn(owner: number, flags: SpawnFlag, innerNetObjects: SpawnInnerNetObject[], lobby: LobbyImplementation): EntityAirshipStatus {
    const airshipStatus = new EntityAirshipStatus(lobby);

    airshipStatus.setSpawn(owner, flags, innerNetObjects);

    return airshipStatus;
  }

  getSpawn(): SpawnPacket {
    return new SpawnPacket(
      this.type,
      this.owner,
      this.flags,
      [
        this.aprilShipStatus.spawn(),
      ],
    );
  }

  setSpawn(owner: number, _flags: SpawnFlag, innerNetObjects: SpawnInnerNetObject[]): void {
    this.owner = owner;
    this.innerNetObjects = [
      InnerAirshipStatus.spawn(innerNetObjects[0], this),
    ];
  }
}
