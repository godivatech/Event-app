import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request, Response } from 'express';
import { StaffLoginDto } from '@cedoi/contracts';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: StaffLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    const result = await this.authService.login(
      dto.email,
      dto.password,
      userAgent,
      ipAddress
    );

    // Set secure HttpOnly cookie
    res.cookie('cedoi_staff_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      user: result.user,
      token: result.token, // Also return in response for clients preferring header auth
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    let token = req.cookies?.['cedoi_staff_session'];
    if (!token && req.headers['authorization']) {
      token = req.headers['authorization'].replace('Bearer ', '').trim();
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userId = (req as any).user?.id;

    await this.authService.logout(token, userId, ipAddress);

    res.clearCookie('cedoi_staff_session', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }
}
