import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodIssue, ZodSchema } from 'zod';

// Doc 12 §1 / Doc 19 §1: request bodies and query params are validated
// against packages/shared-types zod schemas at the NestJS boundary. A
// BadRequestException here is already mapped to VALIDATION_ERROR by the
// global exception filter (Doc 19 §4) — no separate error code needed.
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((issue: ZodIssue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
