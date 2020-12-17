import { MessageReader, MessageWriter } from "../../../../util/hazelMessage";
import { SystemType } from "../../../../types/systemType";
import { BaseSystem } from "./baseSystem";

export enum FlyingPlatformSides {
  LEFT = 0x00,
  RIGHT = 0x01,
}

export class FlyingPlatformSystem extends BaseSystem<FlyingPlatformSystem> {
  public sequenceId = 0;
  public innerPlayerControlNetId?: number;
  public side: FlyingPlatformSides = FlyingPlatformSides.LEFT;

  constructor() {
    super(SystemType.Weapons);
  }

  static spawn(data: MessageReader): FlyingPlatformSystem {
    const flyingPlatformSystem = new FlyingPlatformSystem();

    flyingPlatformSystem.setSpawn(data);

    return flyingPlatformSystem;
  }

  getData(): MessageWriter {
    return this.getSpawn();
  }

  setData(data: MessageReader): void {
    this.setSpawn(data);
  }

  getSpawn(): MessageWriter {
    return new MessageWriter()
      .writeByte(this.sequenceId % 256)
      .writeInt32(this.innerPlayerControlNetId ?? -1)
      .writeByte(this.side);
  }

  setSpawn(data: MessageReader): void {
    this.sequenceId = data.readByte();

    const innerPlayerControlNetId = data.readInt32();

    if (innerPlayerControlNetId > -1) {
      this.innerPlayerControlNetId = innerPlayerControlNetId;
    }

    this.side = data.readByte();
  }

  equals(old: FlyingPlatformSystem): boolean {
    if (this.sequenceId != old.sequenceId) {
      return false;
    }

    if (this.innerPlayerControlNetId != old.innerPlayerControlNetId) {
      return false;
    }

    if (this.side != old.side) {
      return false;
    }

    return true;
  }

  clone(): FlyingPlatformSystem {
    const clone = new FlyingPlatformSystem();

    clone.sequenceId = this.sequenceId;
    clone.innerPlayerControlNetId = this.innerPlayerControlNetId;
    clone.side = this.side;

    return clone;
  }
}
