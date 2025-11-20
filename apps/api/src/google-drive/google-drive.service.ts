import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { EntityType, FileType } from '../common/types/enums';

interface UploadFileParams {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderPath: string;
  entityType: EntityType;
  entityId: string;
}

@Injectable()
export class GoogleDriveService {
  private drive;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeDrive();
  }

  private async initializeDrive() {
    // Usar Service Account para acceso programático
    const auth = new google.auth.GoogleAuth({
      keyFile: this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY_FILE'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadFile(params: UploadFileParams) {
    try {
      // Obtener o crear la carpeta
      const folderId = await this.getOrCreateFolder(params.folderPath);

      // Subir el archivo
      const fileMetadata = {
        name: params.fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: params.mimeType,
        body: params.fileBuffer,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, mimeType, size',
      });

      const file = response.data;

      // Guardar referencia en la base de datos
      await this.prisma.googleDriveFile.create({
        data: {
          fileId: file.id!,
          fileName: file.name!,
          fileType: this.mapMimeTypeToFileType(params.mimeType),
          mimeType: file.mimeType!,
          fileSize: file.size ? parseInt(file.size) : null,
          webViewLink: file.webViewLink!,
          webContentLink: file.webContentLink || null,
          folderPath: params.folderPath,
          entityType: params.entityType,
          entityId: params.entityId,
        },
      });

      return {
        fileId: file.id,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
      };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  private async getOrCreateFolder(folderPath: string): Promise<string> {
    const folders = folderPath.split('/').filter((f) => f);
    let parentId = 'root';

    for (const folderName of folders) {
      // Buscar si la carpeta ya existe
      const existingFolder = await this.drive.files.list({
        q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (existingFolder.data.files && existingFolder.data.files.length > 0) {
        parentId = existingFolder.data.files[0].id!;
      } else {
        // Crear la carpeta
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        };

        const folder = await this.drive.files.create({
          requestBody: folderMetadata,
          fields: 'id',
        });

        parentId = folder.data.id!;
      }
    }

    return parentId;
  }

  private mapMimeTypeToFileType(mimeType: string): FileType {
    if (mimeType.includes('pdf')) return FileType.PDF;
    if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return FileType.DOCX;
    if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) return FileType.XLSX;
    if (mimeType.startsWith('image/')) return FileType.IMAGEN;
    return FileType.OTRO;
  }
}

