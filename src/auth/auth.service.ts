import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as appleSignin from 'apple-signin-auth';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthProvider } from '../users/entities/user.entity';

export interface OAuthUserData {
    googleId?: string;
    appleId?: string;
    email: string;
    name?: string;
    avatar?: string;
    accessToken?: string;
    refreshToken?: string;
}

export interface AppleAuthPayload {
    id_token: string;           // JWT identity token from Apple
    code?: string;              // Authorization code
    user?: {                    // Only sent on first sign-in
        name?: {
            firstName?: string;
            lastName?: string;
        };
        email?: string;
    };
}

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && user.password && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async validateOAuthUser(userData: OAuthUserData, provider: AuthProvider): Promise<any> {
        // Get the provider ID based on provider type
        const providerId = provider === 'google' ? userData.googleId : userData.appleId;

        // Try to find user by provider ID first (if available)
        let user = providerId ? await this.usersService.findByOAuthId(provider, providerId) : null;

        if (!user) {
            // Try to find by email (user might have registered with email first)
            user = await this.usersService.findByEmail(userData.email);

            if (user && providerId) {
                // Link the OAuth account to existing user
                await this.usersService.linkOAuthAccount(user.id, provider, providerId);
            } else if (!user) {
                // Create new user from OAuth data
                const nameParts = userData.name?.split(' ') || ['', ''];
                user = await this.usersService.createOAuthUser({
                    email: userData.email,
                    firstName: nameParts[0],
                    lastName: nameParts.slice(1).join(' '),
                    avatar: userData.avatar,
                    authProvider: provider,
                    googleId: userData.googleId,
                    appleId: userData.appleId,
                });
            }
        }

        return user;
    }

    /**
     * Verify Apple identity token and authenticate user
     * @param payload - Contains id_token and optionally user info (first sign-in only)
     */
    async verifyAppleToken(payload: AppleAuthPayload): Promise<any> {
        try {
            const clientId = this.configService.get<string>('APPLE_CLIENT_ID');

            if (!clientId) {
                throw new BadRequestException('Apple Sign In is not configured');
            }

            // Verify the identity token with Apple's servers
            const appleUser = await appleSignin.verifyIdToken(payload.id_token, {
                audience: clientId,
                ignoreExpiration: false, // Don't accept expired tokens
            });

            // appleUser contains: { sub, email, email_verified, is_private_email, ... }
            const appleId = appleUser.sub;
            const email = appleUser.email;

            if (!email) {
                throw new BadRequestException('Email not provided by Apple');
            }

            // Build user data - Apple only sends name on FIRST sign-in
            const userData: OAuthUserData = {
                appleId,
                email,
                name: payload.user?.name
                    ? `${payload.user.name.firstName || ''} ${payload.user.name.lastName || ''}`.trim()
                    : undefined,
            };

            // Use existing OAuth validation flow
            const user = await this.validateOAuthUser(userData, 'apple');

            return this.login(user);

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error('Apple Sign In verification failed:', error);
            throw new UnauthorizedException('Invalid Apple identity token');
        }
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
            },
        };
    }

    async register(createUserDto: CreateUserDto) {
        const user = await this.usersService.create(createUserDto);
        return this.login(user);
    }
}


