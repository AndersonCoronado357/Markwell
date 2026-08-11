import { safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Almacenamiento cifrado de claves de API. Cifrado por safeStorage (DPAPI en
 * Windows) y persistido en <userData>/secrets, fuera de la base de datos —
 * así los respaldos del .db nunca contienen la clave.
 */
export class SecretsService {
  constructor(private secretsDir: string) {
    fs.mkdirSync(this.secretsDir, { recursive: true });
  }

  available(): boolean { return safeStorage.isEncryptionAvailable(); }

  setKey(name: string, plaintext: string): void {
    if (!this.available()) throw new Error('Cifrado no disponible en este sistema');
    fs.writeFileSync(this.pathFor(name), safeStorage.encryptString(plaintext));
  }

  getKey(name: string): string | null {
    const p = this.pathFor(name);
    if (!fs.existsSync(p)) return null;
    try { return safeStorage.decryptString(fs.readFileSync(p)); } catch { return null; }
  }

  hasKey(name: string): boolean { return fs.existsSync(this.pathFor(name)); }
  removeKey(name: string): void {
    const p = this.pathFor(name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  private pathFor(name: string): string {
    if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error('Nombre de secreto inválido');
    return path.join(this.secretsDir, `${name}.bin`);
  }
}
