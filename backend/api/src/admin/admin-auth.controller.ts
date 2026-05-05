import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';
import { AdminLoginDto } from './dto/admin-login.dto';

type AdminRequest = {
  admin?: {
    login: string;
  };
};

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  getMe(@Req() request: AdminRequest) {
    return this.adminAuthService.getMe(request.admin?.login ?? 'admin');
  }
}
