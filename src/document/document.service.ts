import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
      title: title || 'Untitled Document',
      creatorId: userId,
    });
    const value = await newDoc.save();
    value.id = value._id;
    return value;
  }

  async getDocument(id: string): Promise<DocumentModel> {
    const document = await this.documentModel.findById(id).exec();
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    document.id = document._id;
    return document;
  }

  async getUserDocuments(userId: string): Promise<DocumentModel[]> {
    console.log(userId);
    const value = await this.documentModel
      .find({ creatorId: userId })
      .lean()
      .exec();
    return value.map((x) => ({ ...x, id: x._id }));
  }

  async updateDocument(
    id: string,
    userId: string,
    updates: Partial<Pick<DocumentModel, 'title' | 'content'>>,
  ): Promise<DocumentModel> {
    const document = this.documentModel.findByIdAndUpdate(id, {
      title: updates.title,
    });
    console.log(document);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    // document.id = document._id;
    return document;
  }

  async deleteDocument(id: string, userId: string): Promise<void> {
    await this.documentModel.findByIdAndDelete(id);
  }
}
