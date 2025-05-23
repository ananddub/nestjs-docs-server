import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentModel,
  DocumentModelDocument,
} from '../schemas/document.schema';

@Injectable()
export class DocumentService {
  constructor(
    @InjectModel(DocumentModel.name)
    private readonly documentModel: Model<DocumentModelDocument>,
  ) {}

  async createDocument(userId: string, title?: string): Promise<DocumentModel> {
    const newDoc = new this.documentModel({
      id: uuidv4(),
      title: title || 'Untitled Document',
      content: '',
      creatorId: userId,
    });
    return await newDoc.save();
  }

  async getDocument(id: string): Promise<DocumentModel> {
    const document = await this.documentModel.findOne({ id }).exec();
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async getUserDocuments(userId: string): Promise<DocumentModel[]> {
    return await this.documentModel.find({ creatorId: userId }).exec();
  }

  async updateDocument(
    id: string,
    userId: string,
    updates: Partial<Pick<DocumentModel, 'title' | 'content'>>,
  ): Promise<DocumentModel> {
    const document = await this.documentModel
      .findOne({ id, creatorId: userId })
      .exec();
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    Object.assign(document, updates);
    return await document.save();
  }

  async deleteDocument(id: string, userId: string): Promise<void> {
    const result = await this.documentModel
      .deleteOne({ id, creatorId: userId })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Document not found');
    }
  }
}
