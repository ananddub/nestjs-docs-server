import { User } from '../schemas/user.schema';

export interface DocumentModel {
  title: string;
  content?: any;
  creatorId: User;
}
