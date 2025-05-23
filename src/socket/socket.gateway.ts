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

    // You can authenticate the client here if needed
    // const token = client.handshake.auth.token || client.handshake.headers.authorization;
    // if (token) {
    //   try {
    //     const payload = this.jwtService.verify(token);
    //     client.data.user = payload;
    //   } catch (e) {
    //     client.disconnect();
    //     return;
    //   }
    // }
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

  @SubscribeMessage('typing')
  async handleUpdateDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; content: any; delta: any },
  ) {
    try {
      // this.logger.log(
      //   `Received typing event from ${client.id} for document ${data}`,
      // );
      console.log(data);
      // Broadcast changes to all clients in the room except sender
      // this.server.emit('changes', data);
      client.broadcast.emit('changes', data);
      // Cache the updated content
      // await this.cacheService.set(data.documentId, data.content);
      // Optionally save to database (commented out for performance)
      // await this.documentService.updateDocument(
      //   data.documentId,
      //   undefined,
      //   data.content,
      // );
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
    client.to(documentId).emit('user_left', { clientId: client.id });
  }

  @SubscribeMessage('save')
  async handleSaveDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; content: any; userId: string },
  ) {
    try {
      // this.logger.log(`Saving document ${data.documentId}`);

      // Save to database
      // await this.documentService.updateDocument(data.documentId, data.userId, {
      //   content: data.content,
      // });

      // Update cache
      // await this.cacheService.set(data.documentId, data.content);

      // Confirm save to client
      client.emit('save_success', { documentId: data.documentId });

      // Notify others
      client.to(data.documentId).emit('document_saved', {
        documentId: data.documentId,
        savedBy: client.id,
      });
    } catch (error) {
      this.logger.error(`Error saving document: ${error.message}`);
      client.emit('error', {
        message: 'Failed to save document',
        error: error.message,
      });
    }
  }
}
