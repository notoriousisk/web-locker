import { Body, Controller, Post } from '@nestjs/common';
import { TmaLoginDto } from './dto/tma-login.dto';
import { TmaAuthService } from './tma-auth.service';

@Controller('tma/auth')
export class TmaAuthController {
  constructor(private readonly tmaAuthService: TmaAuthService) {}

  @Post('login')
  login(@Body() dto: TmaLoginDto) {
    return this.tmaAuthService.login(dto);
  }
}
