import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Reiki OKR/CRM Platform API';
  }
}



