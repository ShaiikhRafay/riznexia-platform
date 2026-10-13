import { HttpStatus } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';

export class CustomSiteInvalidException extends AppException {
  constructor(errors: string[], warnings: string[] = []) {
    super(
      'CUSTOM_SITE_INVALID',
      errors[0] ?? 'Uploaded site is invalid',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { errors, warnings },
    );
  }
}

export class CustomSiteNotFoundException extends AppException {
  constructor() {
    super('CUSTOM_SITE_NOT_FOUND', 'Uploaded site not found', HttpStatus.NOT_FOUND);
  }
}

export class DeploymentProviderNotConfiguredException extends AppException {
  constructor() {
    super(
      'DEPLOYMENT_PROVIDER_NOT_CONFIGURED',
      'Vercel is not configured on the server (VERCEL_API_TOKEN missing)',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
