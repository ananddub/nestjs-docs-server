import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongoDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from './user.schema';

export type DocumentModelDocument = DocumentModel & MongoDocument;

@Schema({ timestamps: true })
export class DocumentModel {
  @Prop({ default: 'Untitled Document' })
  title: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: [{ insert: '\n' }] })
  content: any;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  creatorId: User;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentModel);
