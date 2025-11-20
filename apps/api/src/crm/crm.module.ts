import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmTemplatesService } from './crm-templates.service';
import { CompaniesController } from './controllers/companies.controller';
import { ContactsController } from './controllers/contacts.controller';
import { OpportunitiesController } from './controllers/opportunities.controller';
import { ActivitiesController } from './controllers/activities.controller';
import { NotesController } from './controllers/notes.controller';
import { RemindersController } from './controllers/reminders.controller';
import { CrmTemplatesController } from './controllers/crm-templates.controller';

@Module({
  controllers: [
    CompaniesController,
    ContactsController,
    OpportunitiesController,
    ActivitiesController,
    NotesController,
    RemindersController,
    CrmTemplatesController,
  ],
  providers: [CrmService, CrmTemplatesService],
  exports: [CrmService, CrmTemplatesService],
})
export class CrmModule {}


