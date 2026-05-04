import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UpsertUserDto } from './dto/upsert-user.dto';
import { UsersService } from './users.service';

@Controller('tma')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('users/upsert')
  upsertTelegramUser(@Body() dto: UpsertUserDto) {
    return this.usersService.upsertTelegramUser(dto);
  }

  @Get('me')
  getMe(@Query('telegramId') telegramId: string | undefined) {
    return this.usersService.getByTelegramId(telegramId);
  }
}
