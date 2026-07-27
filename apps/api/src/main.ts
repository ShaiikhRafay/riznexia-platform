import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Bootstrap only — no business logic. Feature modules (discovery, leads,
// generation, deployment, pitch, team, auth) land per Doc 21 Module M0+.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

void bootstrap();
