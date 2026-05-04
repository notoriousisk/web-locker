import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { FinishSessionDto } from './dto/finish-session.dto';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';

@Controller('tma')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me/sessions/active')
  listActiveSessions(@Query('telegramId') telegramId: string | undefined) {
    return this.sessionsService.listUserActiveSessions(telegramId);
  }

  @Get('me/sessions/history')
  listHistorySessions(@Query('telegramId') telegramId: string | undefined) {
    return this.sessionsService.listUserHistorySessions(telegramId);
  }

  @Post('sessions')
  startSession(@Body() dto: StartSessionDto) {
    return this.sessionsService.startSession(dto);
  }

  @Post('sessions/:id/finish')
  finishSession(
    @Param('id') sessionId: string,
    @Body() dto: FinishSessionDto
  ) {
    return this.sessionsService.finishSession(sessionId, dto);
  }
}
