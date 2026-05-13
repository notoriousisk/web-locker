import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TmaAuthGuard } from '../tma-auth/tma-auth.guard';
import { TmaRequest } from '../tma-auth/tma-auth.types';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';

@Controller('tma')
@UseGuards(TmaAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me/sessions/active')
  listActiveSessions(@Req() request: TmaRequest) {
    return this.sessionsService.listUserActiveSessions(request.tmaUser?.userId);
  }

  @Get('me/sessions/history')
  listHistorySessions(@Req() request: TmaRequest) {
    return this.sessionsService.listUserHistorySessions(request.tmaUser?.userId);
  }

  @Post('sessions')
  startSession(@Req() request: TmaRequest, @Body() dto: StartSessionDto) {
    return this.sessionsService.startSession(request.tmaUser?.userId, dto);
  }

  @Post('sessions/:id/finish')
  finishSession(
    @Req() request: TmaRequest,
    @Param('id') sessionId: string
  ) {
    return this.sessionsService.finishSession(request.tmaUser?.userId, sessionId);
  }
}
