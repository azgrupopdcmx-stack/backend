import { Injectable, BadRequestException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService, OAuthUserData } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        const options: StrategyOptions = {
            clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/auth/google/callback',
            scope: ['email', 'profile'],
        };
        super(options);
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<void> {
        const { emails, displayName, photos, id } = profile;

        const email = emails?.[0]?.value;
        if (!email) {
            throw new BadRequestException('No email provided by Google');
        }

        const userData: OAuthUserData = {
            googleId: id,
            email,
            name: displayName,
            avatar: photos?.[0]?.value,
            accessToken,
            refreshToken,
        };

        // This will either find existing user or create new one
        const validatedUser = await this.authService.validateOAuthUser(userData, 'google');
        done(null, validatedUser);
    }
}

