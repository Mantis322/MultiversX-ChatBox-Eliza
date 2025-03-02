import { elizaLogger } from "@elizaos/core";
import {
    Mnemonic,
    UserSecretKey,
    Address
} from "@multiversx/sdk-core";
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

/**
 * WalletCreationProvider - Sadece cüzdan oluşturma işlemleri için özelleştirilmiş provider
 * Bu provider, MultiversX ağında yeni cüzdan oluşturmak için gereken minimum fonksiyonları sağlar
 * ve oluşturulan private key'i .env dosyasına kaydeder
 */
export interface WalletCreationOptions {
    name?: string;
    type?: string;
    saveToEnv?: boolean; // .env dosyasına kaydetmek için opsiyon
}

export interface WalletInfo {
    address: string;
    publicKey: string;
    privateKey: string;
    mnemonic: string[];
    name?: string;
    type?: string;
    savedToEnv?: boolean; // .env dosyasına kaydedildi mi?
}

export class WalletCreationProvider {
    /**
     * Yeni bir MultiversX cüzdanı oluşturur
     * @param options Cüzdan oluşturma seçenekleri
     * @returns Oluşturulan cüzdan bilgileri
     */
    async createWallet(options: WalletCreationOptions = {}): Promise<WalletInfo> {
        const saveToEnv = options.saveToEnv !== false; // Varsayılan olarak true

        elizaLogger.log("Creating new wallet with options:", {
            name: options.name,
            type: options.type,
            saveToEnv
        });

        try {
            // Yeni bir mnemonic (hatırlatıcı kelimeler) oluştur
            const mnemonic = Mnemonic.generate();
            elizaLogger.log("Mnemonic generated successfully");

            // Mnemonic'ten 0. indeks için gizli anahtar türet
            const secretKey = mnemonic.deriveKey(0);
            elizaLogger.log("Secret key derived from mnemonic");

            // Gizli anahtardan genel anahtar oluştur
            const publicKey = secretKey.generatePublicKey();
            elizaLogger.log("Public key generated from secret key");

            // Genel anahtardan adres oluştur
            const address = new Address(publicKey.buffer, "erd");
            const walletAddress = address.bech32();
            elizaLogger.log("Wallet address created:", walletAddress);

            // Private key'i .env dosyasına kaydet (eğer istenirse)
            let savedToEnv = false;
            if (saveToEnv) {
                savedToEnv = this.updateEnvFile('MVX_PRIVATE_KEY', secretKey.hex());
                if (savedToEnv) {
                    elizaLogger.log("Private key saved to .env file as MVX_PRIVATE_KEY");
                } else {
                    elizaLogger.warn("Failed to save private key to .env file");
                }
            }

            // Sonuçları hazırla
            const walletInfo: WalletInfo = {
                address: walletAddress,
                publicKey: publicKey.hex(),
                privateKey: secretKey.hex(),
                mnemonic: mnemonic.getWords(),
                name: options.name || "MyWallet",
                type: options.type || "MultiversX",
                savedToEnv
            };

            elizaLogger.log("Wallet created successfully with address:", walletAddress);

            return walletInfo;
        } catch (error) {
            elizaLogger.error("Error creating wallet:", error);
            throw new Error(`Wallet creation failed: ${error.message}`);
        }
    }

    /**
     * Private key'i .env dosyasına kaydeder
     * @param key .env dosyasındaki anahtar adı
     * @param newValue Kaydedilecek değer
     * @returns İşlemin başarılı olup olmadığı
     */
    updateEnvFile(key: string, newValue: string): boolean {
        // .env dosyasının yolunu belirle
        const envFilePath = path.resolve(__dirname, '..', '..', '..', '..', '.env');
        
        try {
          // Mevcut .env dosyasını oku
          const envContents = fs.readFileSync(envFilePath, 'utf8');
          
          // Dosya içeriğini satır satır parse et
          const lines = envContents.split('\n');
          
          // Belirtilen anahtarı bul ve değerini güncelle
          const updatedLines = lines.map(line => {
            // Yorumları ve boş satırları atla
            if (line.trim().startsWith('#') || line.trim() === '') {
              return line;
            }
            
            // Anahtar-değer çiftini ayır
            const parts = line.split('=');
            if (parts.length < 2) return line;
            
            const existingKey = parts[0].trim();
            
            // Eşleşen anahtarı bul ve değerini güncelle
            if (existingKey === key) {
              // Yeni değeri tırnak içine al (string olarak)
              return `${key}="${newValue}"`;
            }
            
            return line;
          });
          
          // Güncellenmiş içeriği dosyaya yaz
          fs.writeFileSync(envFilePath, updatedLines.join('\n'));
          console.log(`${key} değeri başarıyla güncellendi.`);
          
          // Değişiklikleri yeniden yükle
          dotenv.config({ override: true });
          
          return true;
        } catch (error) {
          console.error('.env dosyası güncellenirken bir hata oluştu:', error);
          return false;
        }
    }
}