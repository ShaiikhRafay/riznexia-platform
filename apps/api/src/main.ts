import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Bootstrap + cross-cutting wiring only. Feature modules beyond auth land
// per Doc 21 Module M1+.
async function bootstrap() {
  // rawBody: true — request.rawBody is needed to verify the Clerk webhook's
  // Svix signature (auth/clerk-webhook.controller.ts); Nest populates it
  // alongside the normal parsed body, no custom body-parser wiring needed.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

void bootstrap();
