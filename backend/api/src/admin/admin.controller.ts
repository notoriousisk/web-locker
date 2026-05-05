import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { UpdateLockerStatusDto } from './dto/update-locker-status.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('lockers')
  listLockers() {
    return this.adminService.listLockers();
  }

  @Patch('lockers/:id/status')
  updateLockerStatus(
    @Param('id') lockerId: string,
    @Body() dto: UpdateLockerStatusDto
  ) {
    return this.adminService.updateLockerStatus(lockerId, dto);
  }

  @Get('sessions')
  listSessions() {
    return this.adminService.listSessions();
  }

  @Get('sessions/active')
  listActiveSessions() {
    return this.adminService.listActiveSessions();
  }

  @Get('sessions/history')
  listHistorySessions() {
    return this.adminService.listHistorySessions();
  }
}
