import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('users')
    async getUsers(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search: string,
        @Query('status') status: string,
        @Query('type') type: string,
    ) {
        return this.adminService.getUsers({
            skip: (page - 1) * limit,
            take: limit,
            search,
            status,
            type
        });
    }

    @Get('users/stats')
    async getUserStats() {
        return this.adminService.getUserStats();
    }

    @Get('users/:id')
    async getUserDetail(@Param('id') id: string) {
        return this.adminService.getUserDetail(id);
    }

    @Get('activity')
    async getActivityLogs(
        @Query('limit') limit: number,
        @Query('type') type: string,
        @Query('search') search: string,
    ) {
        return this.adminService.getActivityLogs({
            limit,
            type,
            search
        });
    }
}
