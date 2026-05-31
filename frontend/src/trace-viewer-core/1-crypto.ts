import type { TraceLineDescriptor } from "./9-core-types";

export class TraceCrypto {
    private static readonly FT_KEY_LEN = 16;
    // 98, 11, 5, 61, 254, 12, 228, 229, 31, 77, 9, 75, 1, 73, 223, 17
    private static readonly DEFAULT_KEY = new Uint8Array([
        98, 11, 5, 61, 254, 12, 228, 229, 31, 77, 9, 75, 1, 73, 223, 17
    ]);

    private keys: Array<{ offset: number, key: Uint8Array }> = [];

    constructor() {
        // We don't init with default key in the list, fallback to it if list empty or no match
    }

    public addKey(line: TraceLineDescriptor, keyContent: Uint8Array) {
        // TODO: The keyContent is encrypted with RSA Private Key.
        // We need to decrypt it first.
        // For now, we just store it (it won't work until we implement RSA decrypt)
        // const decryptedKey = this.decryptRSA(keyContent);
        // this.keys.push({ offset: line.lineFileNumber, key: decryptedKey });
        console.warn("Encrypted session keys (LINECODE::Key) logic not yet implemented. Skipping key.");
    }

    private getCryptKey(headerOffset: number): Uint8Array {
        // logic from Utilities.cpp: GetCryptKey
        // "The first key element must be at the very beginning of the trace file... Everything located later than the saved key must be decrypted with that key..."
        
        let selectedKey = TraceCrypto.DEFAULT_KEY;

        if (this.keys.length > 0) {
            // We assume keys are sorted by offset? 
            // C++ logic:
            // iterate from begin. 
            // save first key.
            // if uHeaderOffset < currentKey.offset -> return saved key (previous one)
            // else saved key = currentKey.key
            
            // This implies the list is sorted by offset.
            // C++ uses std::vector push_back, so assuming they appear in order in file.
            
            // We can just iterate and find the last key where key.offset <= headerOffset
            // Actually C++ logic is slightly different:
            /*
            crypt_keys_t::const_iterator it = ms_CryptKeys.begin();
            const BYTE* pKeyBytes = (*it).GetCryptKey(); 
            ++it;
            for (; it != ms_CryptKeys.end(); ++it) {
                if (uHeaderOffset < (*it).GetHeaderOffset()) 
                    return pKeyBytes;
                pKeyBytes = (*it).GetCryptKey();
            }
            return pKeyBytes;
            */
           
           // This means: find the Last key that has Offset <= uHeaderOffset.
           // If keys are [0, 100, 200]
           // Offset 50: 
           //  it=0 (offset 0). pKey = key0.
           //  it=1 (offset 100). 50 < 100 -> return key0. Correct.
           
           // But wait, ms_CryptKeys is populated as we encounter them. 
           // If no keys in file -> empty vector -> default key.
           
           if (this.keys.length > 0) {
               // Assuming keys are sorted by offset (as they are pushed sequentially)
               let pKey = this.keys[0].key;
               for (let i = 1; i < this.keys.length; i++) {
                   if (headerOffset < this.keys[i].offset) {
                       return pKey;
                   }
                   pKey = this.keys[i].key;
               }
               return pKey;
           }
        }
        
        return selectedKey;
    }

    public decrypt(headerOffset: number, buffer: Uint8Array): Uint8Array {
        // Port of CCryptKeys::Decrypt from Utilities.cpp
        
        const key = this.getCryptKey(headerOffset);
        const len = buffer.length;
        const decryptedBuff = new Uint8Array(len);
        
        // Setup key
        const finalKey = new Int32Array(4);
        // memcpy(finalKey, EV_key, FT_KEY_LEN);
        // EV_key is bytes, finalKey is longs (32-bit). Little-endian on Windows.
        const keyDataView = new DataView(key.buffer, key.byteOffset, key.byteLength);
        for(let i=0; i<4; i++) {
             finalKey[i] = keyDataView.getInt32(i*4, true); // true = little endian
        }

        finalKey[0] ^= 0x23650935;
        finalKey[1] ^= 0x79642590;
        finalKey[2] ^= 0x51806878;
        finalKey[3] ^= 0x91341639;

        const iv = new Int32Array(2);
        iv[0] = 0x35096523;
        iv[1] = 0x78688051;

        // We need a byte view of IV for XORing
        // BUT: in the loop, IV is updated as 32-bit integers: IV[0] = y, IV[1] = z.
        // And also accessed as bytes: *(pOutput + n) = ... ^ *(pbIV + n)
        // So we need a shared buffer for IV
        const ivBuffer = new ArrayBuffer(8);
        const ivInt32 = new Int32Array(ivBuffer);
        const ivBytes = new Uint8Array(ivBuffer);

        ivInt32[0] = 0x35096523;
        ivInt32[1] = 0x78688051;

        let bytes = len;
        let pInputIndex = 0;
        let pOutputIndex = 0;

        const SCHEDULE_CONSTANT = 0x9e3779b9 | 0; // force 32-bit int

        while (bytes > 0) {
            let y = ivInt32[0];
            let z = ivInt32[1];
            let sum = 0;

            const ivCount = (bytes > 8) ? 8 : bytes;

            for (let n = 0; n < 32; n++) {
                sum = (sum + SCHEDULE_CONSTANT) | 0;
                
                // y += (z << 4) + finalKey[0] ^ z + sum ^ (z >> 5) + finalKey[1];
                // Breakdown:
                // term1 = (z << 4) + finalKey[0]
                // term2 = z + sum
                // term3 = (z >>> 5) + finalKey[1]  <-- wait, C++ >> depends on signedness, long is signed.
                // Assuming arithmetic shift for signed types in C++. JS >> is arithmetic shift. >>> is logical.
                // In C++, 'long' is signed.
                
                const term1 = ((z << 4) + finalKey[0]) | 0;
                const term2 = (z + sum) | 0;
                const term3 = ((z >>> 5) + finalKey[1]) | 0; // Use >>> 5 matching standard TEA/XTEA usually? 
                // Let's verify C++ shift on signed. It is implementation defined but usually arithmetic (preserve sign).
                // However, in encryption algos, usually unsigned logic is desired. 
                // Looking at Utilities.cpp: `long y = 0;` -> signed 32-bit int.
                // If z is negative, z >> 5 fills with 1s.
                // Standard TEA uses unsigned long. This implementation uses `long`.
                // Let's stick to `>>` (signed/arithmetic) to match C++ `long`.
                
                const term3_c = ((z >> 5) + finalKey[1]) | 0;
                
                // precedence: + is higher than ^. 
                // y += (term1 ^ term2 ^ term3)
                
                const rhs = (term1 ^ term2 ^ term3_c);
                y = (y + rhs) | 0;

                // z += (y << 4) + finalKey[2] ^ y + sum ^ (y >> 5) + finalKey[3];
                const z_term1 = ((y << 4) + finalKey[2]) | 0;
                const z_term2 = (y + sum) | 0;
                const z_term3 = ((y >> 5) + finalKey[3]) | 0;
                
                const z_rhs = (z_term1 ^ z_term2 ^ z_term3);
                z = (z + z_rhs) | 0;
            }

            ivInt32[0] = y;
            ivInt32[1] = z;

            // XOR loop
            for (let n = 0; n < ivCount; n++) {
                decryptedBuff[pOutputIndex + n] = buffer[pInputIndex + n] ^ ivBytes[n];
            }

            // memcpy(pbIV, pInput, ivcount); 
            // The NEW IV for next block comes from the CIPHERTEXT of current block (buffer[pInput])
            // "memcpy(pbIV, pInput, ivcount)" -> pInput is `EV_encrBuff`.
            // So we copy current ciphertext into IV buffer for next round (CFB mode-ish behavior).
            for(let n=0; n < ivCount; n++) {
                ivBytes[n] = buffer[pInputIndex + n];
            }

            bytes -= ivCount;
            pInputIndex += ivCount;
            pOutputIndex += ivCount;
        }

        return decryptedBuff;
    }
}

