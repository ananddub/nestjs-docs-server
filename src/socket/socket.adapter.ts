// src/socket/socket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { DocumentService } from '../document/document.service';
import { RedisCacheService } from 'src/config/redis-cache.service';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import {
  DocumentModel,
  DocumentModelDocument,
} from 'src/schemas/document.schema';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private documentService: DocumentService,
    private readonly cacheService: RedisCacheService,
    private readonly jwtService: JwtService,
    @InjectModel(DocumentModel.name)
    private readonly documentModel: Model<DocumentModelDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const token =
      client.handshake.auth.token || client.handshake.headers.authorization;
    if (token) {
      try {
        const payload = this.jwtService.verify(token.replace('Bearer ', ''));
        client.data.user = payload;
        this.logger.log(`Authenticated user: ${payload.email}`);
      } catch (e) {
        client.disconnect();
      }
    } else {
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  async handleJoinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() documentId: string,
  ) {
    try {
      client.join(documentId);
      this.logger.log(`Client ${client.id} joined document ${documentId}`);

      const cached = await this.cacheService.get(documentId);
      if (cached) {
        client.emit('load', cached);
      } else {
        const doc = await this.documentService.getDocument(documentId);
        if (doc) {
          client.emit('load', doc.content);
          await this.cacheService.set(documentId, doc.content);
        }
      }

      client.to(documentId).emit('user_joined', { clientId: client.id });
    } catch (error) {
      this.logger.error(`Join error: ${error.message}`);
      client.emit('error', { message: 'Join failed', error: error.message });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; content: any },
  ) {
    try {
      client.to(data.documentId).emit('changes', {
        clientId: client.id,
        content: data.content,
      });

      // Update cache
      await this.cacheService.set(data.documentId, data.content);
    } catch (error) {
      this.logger.error(`Typing error: ${error.message}`);
      client.emit('error', { message: 'Typing failed', error: error.message });
    }
  }

  @SubscribeMessage('save')
  async handleSave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; content: any },
  ) {
    try {
      const userId = client.data?.user?.sub;
      await this.documentService.updateDocument(data.documentId, userId, {
        content: data.content,
      });

      await this.cacheService.set(data.documentId, data.content);

      client.emit('save_success', { documentId: data.documentId });
      client.to(data.documentId).emit('document_saved', {
        documentId: data.documentId,
        savedBy: userId,
      });
    } catch (error) {
      this.logger.error(`Save error: ${error.message}`);
      client.emit('error', { message: 'Save failed', error: error.message });
    }
  }

  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() documentId: string,
  ) {
    client.leave(documentId);
    client.to(documentId).emit('user_left', { clientId: client.id });
  }
}
