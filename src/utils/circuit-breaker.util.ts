import { HttpException } from '@nestjs/common';

export class CircuitBreaker {
    private attempts = 0;
    constructor(private readonly maxAttempts: number, private readonly delayMs: number) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        while (this.attempts < this.maxAttempts) {
            try {
                const result = await fn();
                this.attempts = 0; // reset on success
                return result;
            } catch (err) {
                this.attempts++;
                if (this.attempts >= this.maxAttempts) {
                    throw new HttpException('Service unavailable after multiple attempts', 503);
                }
                await new Promise((res) => setTimeout(res, this.delayMs));
            }
        }
        // Should never reach here
        throw new HttpException('Service unavailable (Circuit Open)', 503);
    }
}
