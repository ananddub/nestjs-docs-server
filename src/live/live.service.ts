import { Injectable } from '@nestjs/common';
import { CreateLiveDto } from './dto/create-live.dto';
import { UpdateLiveDto } from './dto/update-live.dto';

@Injectable()
export class LiveService {
  create(createLiveDto: CreateLiveDto) {
    console.log({ createLiveDto });
    return 'This action adds a new live';
  }

  findAll() {
    return `This action returns all live`;
  }

  findOne(id: number) {
    return `This action returns a #${id} live`;
  }

  update(id: number, updateLiveDto: UpdateLiveDto) {
    return `This action updates a #${id} live`;
  }

  remove(id: number) {
    return `This action removes a #${id} live`;
  }
}
