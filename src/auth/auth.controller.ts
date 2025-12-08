import { Controller, Post, Body, UseGuards, Request, Get, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import type { AppleAuthPayload } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(@Body() req: { email: string; password: string }) {
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registrations per minute
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // ============ GOOGLE OAUTH ============

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google OAuth page
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Request() req: any, @Res() res: Response) {
    const { access_token } = await this.authService.login(req.user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
  }

  // ============ APPLE SIGN IN ============

  /**
   * Returns Apple Sign In configuration for the frontend
   * Frontend should use Apple's Sign In JS SDK or redirect to Apple's auth URL
   */
  @Get('apple')
  getAppleAuthConfig() {
    const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('APPLE_CALLBACK_URL') || 'http://localhost:3001/auth/apple/callback';

    return {
      clientId,
      redirectUri,
      scope: 'name email',
      responseType: 'code id_token',
      responseMode: 'form_post',
      // Apple's authorization URL
      authUrl: `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code%20id_token&scope=name%20email&response_mode=form_post`,
    };
  }

  /**
   * Apple sends a POST request to this callback with:
   * - id_token: JWT identity token
   * - code: authorization code
   * - user: (only on first sign-in) { name: { firstName, lastName }, email }
   */
  @Post('apple/callback')
  async appleAuthCallback(@Body() body: AppleAuthPayload, @Res() res: Response) {
    try {
      // Parse user data if present (Apple sends it as a JSON string on first sign-in)
      let payload = body;
      if (typeof body.user === 'string') {
        payload = { ...body, user: JSON.parse(body.user as unknown as string) };
      }

      const result = await this.authService.verifyAppleToken(payload);

      // Redirect to frontend with token
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${result.access_token}`);
    } catch (error) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?error=apple_auth_failed`);
    }
  }

  /**
   * Alternative: Handle Apple Sign In via REST API 
   * (for mobile apps that get the token client-side)
   */
  @Post('apple/verify')
  async appleVerifyToken(@Body() body: AppleAuthPayload) {
    return this.authService.verifyAppleToken(body);
  }
}


