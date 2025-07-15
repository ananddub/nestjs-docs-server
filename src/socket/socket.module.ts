import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketGateway } from './socket.gateway';
import 'dotenv/config';

import { DocumentModule } from '../document/document.module';
import { CacheModule } from 'src/config/cache.module';
import { DocumentModel, DocumentSchema } from '../schemas/document.schema';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    DocumentModule,
    MongooseModule.forFeature([
      { name: DocumentModel.name, schema: DocumentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
    CacheModule,
  ],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
