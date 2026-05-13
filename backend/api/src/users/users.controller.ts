import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TmaAuthGuard } from '../tma-auth/tma-auth.guard';
import { TmaRequest } from '../tma-auth/tma-auth.types';
import { UsersService } from './users.service';

@Controller('tma')
@UseGuards(TmaAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Req() request: TmaRequest) {
    return this.usersService.getById(request.tmaUser?.userId);
  }
}
