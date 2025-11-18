import { createPublicKey, createVerify, type KeyObject } from 'crypto';

export interface GovernmentSignaturePayload {
  credential: string;
  signature: string;
  pk: string;
}

const EC_P256_SPKI_PREFIX = Buffer.from([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
  0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
  0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03,
  0x42, 0x00
]);

export function isGovernmentSignaturePayload(value: unknown): value is GovernmentSignaturePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).credential === 'string' &&
    typeof (value as any).signature === 'string' &&
    typeof (value as any).pk === 'string'
  );
}

export function verifyGovernmentSignature(input: GovernmentSignaturePayload): void {
  const credential = hexToBuffer(input.credential, 'credential');
  const signature = hexToBuffer(input.signature, 'signature');
  const publicKey = importEcPublicKey(input.pk);

  const verifier = createVerify('sha256');
  verifier.update(credential);
  verifier.end();

  const isValid = verifier.verify(publicKey, signature);

  if (!isValid) {
    throw new Error('Invalid issuer signature');
  }
}

function importEcPublicKey(pkHex: string): KeyObject {
  const pkBytes = hexToBuffer(pkHex, 'pk');

  // Attempt to treat the bytes as an SPKI-encoded key first.
  try {
    return createPublicKey({ key: pkBytes, format: 'der', type: 'spki' });
  } catch {
    // Fall through to try raw, uncompressed EC points
  }

  if (pkBytes.length === 65 && pkBytes[0] === 0x04) {
    const spki = Buffer.concat([EC_P256_SPKI_PREFIX, pkBytes]);
    return createPublicKey({ key: spki, format: 'der', type: 'spki' });
  }

  throw new Error('Unsupported public key encoding');
}

function hexToBuffer(value: string, fieldName: string): Buffer {
  if (!/^(0x)?[0-9a-fA-F]+$/.test(value)) {
    throw new Error(`Field "${fieldName}" must be a hex string`);
  }

  const normalized = value.startsWith('0x') ? value.slice(2) : value;

  if (normalized.length % 2 !== 0) {
    throw new Error(`Field "${fieldName}" must contain an even number of hex characters`);
  }

  return Buffer.from(normalized, 'hex');
}

