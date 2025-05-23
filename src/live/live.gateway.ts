import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { LiveService } from './live.service';
import { CreateLiveDto } from './dto/create-live.dto';
import { UpdateLiveDto } from './dto/update-live.dto';

@WebSocketGateway()
export class LiveGateway {
  constructor(private readonly liveService: LiveService) {}
  @SubscribeMessage('connect')
  handleConnection(client: any, ...args: any[]) {
    console.log(client.id);
  }
  @SubscribeMessage('createLive')
  create(@MessageBody() createLiveDto: CreateLiveDto) {
    return this.liveService.create(createLiveDto);
  }

  @SubscribeMessage('findAllLive')
  findAll(@ConnectedSocket() client, @MessageBody() data: any) {
    client.to('12').emit('hello world');
    return this.liveService.findAll();
  }

  @SubscribeMessage('findOneLive')
  findOne(@MessageBody() id: number) {
    return this.liveService.findOne(id);
  }

  @SubscribeMessage('updateLive')
  update(@MessageBody() updateLiveDto: UpdateLiveDto) {
    return this.liveService.update(updateLiveDto.id, updateLiveDto);
  }

  @SubscribeMessage('removeLive')
  remove(@MessageBody() id: number) {
    return this.liveService.remove(id);
  }
}
