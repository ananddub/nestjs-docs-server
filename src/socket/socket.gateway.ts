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
import { DocumentService } from '../document/document.service';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from 'src/config/redis-cache.service';
import { Model } from 'mongoose';
import {
  DocumentModel,
  DocumentModelDocument,
} from 'src/schemas/document.schema';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';

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
  private liveuser = new Map<string, Set<string>>();
  private user = new Map<string, string>();
  private debounceMap: Map<string, NodeJS.Timeout> = new Map();
  constructor(
    private documentService: DocumentService,
    private readonly cacheService: RedisCacheService,
    @InjectModel(DocumentModel.name)
    private readonly documentModel: Model<DocumentModelDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const room: any = this.user.has(client.id);
    const set = this.liveuser.get(room);
    if (set) {
      set.delete(client.id);
      this.user.delete(client.id);
      this.server.emit(`changes:${room}`, {
        room,
        title: await this.documentService.getDocument(room),
        total: set.size,
        content: [],
        delta: [],
      });
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  async handleJoinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() documentId: string,
  ) {
    try {
      this.logger.log(`Client ${client.id} joining document: ${documentId}`);
      client.join(documentId);

      // Get document data from cache or database
      const data = await this.cacheService.get(documentId);

      if (data) {
        // Send data to the client who just joined
        client.emit('load', data);
        this.logger.log(`Document data sent to client ${client.id}`);
      } else {
        this.logger.log(`No cached data found for document ${documentId}`);
        // Try to get from database if not in cache
        try {
          const document = await this.documentService.getDocument(documentId);
          if (document) {
            client.emit('load', document);
            // Cache the document for future use
            await this.cacheService.set(documentId, document);
          }
        } catch (err) {
          this.logger.error(
            `Error fetching document from database: ${err.message}`,
          );
        }
      }

      // Notify others that someone joined
      client.to(documentId).emit('user_joined', { clientId: client.id });
    } catch (error) {
      this.logger.error(`Error in join handler: ${error.message}`);
      client.emit('error', {
        message: 'Failed to join document',
        error: error.message,
      });
    }
  }

  async saveData(room: string, title: string, content: any) {
    await this.documentModel.findByIdAndUpdate(room, {
      content,
      title,
    });
  }

  @SubscribeMessage('typing')
  async handleUpdateDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      room: string;
      title: string;
      total: number;
      content: any;
      delta: any;
    },
  ) {
    try {
      console.log(data);
      try {
        if (!this.liveuser.has(data.room)) {
          this.liveuser.set(data.room, new Set(client.id));
          data.total = 1;
        } else {
          const set = this.liveuser.get(data.room);
          set.add(client.id);
          data.total = set.size;
        }
      } finally {
        console.log(data);
        this.user.set(client.id, data.room);
        client.broadcast.emit(`changes:${data.room}`, data);
        await this.cacheService.set(data.room, data.content);
      }

      if (this.debounceMap.has(data.room)) {
        clearTimeout(this.debounceMap.get(data.room));
      }

      const timeout = setTimeout(async () => {
        await this.saveData(data.room, data.title, data.content);
        this.debounceMap.delete(data.room);
        this.logger.log(`Document ${data.room} auto-saved`);
      }, 5);

      this.debounceMap.set(data.room, timeout);
    } catch (error) {
      this.logger.error(`Error in typing handler: ${error.message}`);
      client.emit('error', {
        message: 'Failed to update document',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('leave')
  handleLeaveDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() documentId: string,
  ) {
    this.logger.log(`Client ${client.id} leaving document: ${documentId}`);
    client.leave(documentId);

    // Notify others that someone left
    client.emit(`user_left:${client.rooms}`, { clientId: client.id });
  }

  @SubscribeMessage('save')
  async handleSaveDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { room: string; fid: string; delta: any; userId: string },
  ) {
    try {
      client.emit(`saved:${data.room}`, {
        documentId: data.room,
        savedBy: client.id,
      });
    } catch (error) {
      client.emit('error', {
        message: 'Failed to save document',
        error: error.message,
      });
    }
  }
}
