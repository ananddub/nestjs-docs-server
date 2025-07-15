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
import { DocumentModel } from './document.model';

@Controller('doc')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  createDocument(
    @GetUser('id') userId: string,
    @Body('title') title?: string,
  ): Promise<DocumentModel> {
    return this.documentService.createDocument(userId, title);
  }

  @Get(':id')
  getDocument(@Param('id') id: string): Promise<DocumentModel> {
    return this.documentService.getDocument(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getUserDocuments(@GetUser('id') userId: string): Promise<DocumentModel[]> {
    return this.documentService.getUserDocuments(userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateDocument(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() updates: { title?: string; content?: string },
  ): Promise<DocumentModel> {
    return this.documentService.updateDocument(id, userId, updates);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteDocument(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ): Promise<void> {
    return this.documentService.deleteDocument(id, userId);
  }
}
