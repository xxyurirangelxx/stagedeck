import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export class LocalStorageManager {
  private dataDir: string;

  constructor() {
    try {
      this.dataDir = path.join(app.getPath('userData'), 'stagedeck_data');
    } catch {
      this.dataDir = path.join(process.cwd(), '.stagedeck_data');
    }

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  public getFilePath(fileName: string): string {
    return path.join(this.dataDir, `${fileName}.json`);
  }

  public read<T>(fileName: string, fallback: T): T {
    try {
      const filePath = this.getFilePath(fileName);
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`Erro ao ler ${fileName}:`, err);
      return fallback;
    }
  }

  public write<T>(fileName: string, data: T): boolean {
    try {
      const filePath = this.getFilePath(fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`Erro ao gravar ${fileName}:`, err);
      return false;
    }
  }
}

export const storage = new LocalStorageManager();
