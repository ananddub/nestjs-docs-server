import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentService } from './document.service';
import { GetUser } from '../auth/get-user.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post()
  createDocument(
    @GetUser('id') userId: string,
    @Body('title') title?: string,
  ): Promise<Document> {
    return this.documentService.createDocument(userId, title);
  }

  @Get(':id')
  getDocument(@Param('id') id: string): Promise<Document> {
    return this.documentService.getDocument(id);
  }

  @Get()
  getUserDocuments(@GetUser('id') userId: string): Promise<Document[]> {
    return this.documentService.getUserDocuments(userId);
  }

  @Put(':id')
  updateDocument(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updates: { title?: string; content?: string },
  ): Promise<Document> {
    return this.documentService.updateDocument(id, userId, updates);
  }

  @Delete(':id')
  deleteDocument(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ): Promise<void> {
    return this.documentService.deleteDocument(id, userId);
  }
}
