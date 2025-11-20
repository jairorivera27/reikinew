import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OkrModule } from './okr/okr.module';
import { CrmModule } from './crm/crm.module';
import { QuoteModule } from './quote/quote.module';
import { ContractModule } from './contract/contract.module';
import { MarketingModule } from './marketing/marketing.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OkrModule,
    CrmModule,
    QuoteModule,
    ContractModule,
    MarketingModule,
    GoogleDriveModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


