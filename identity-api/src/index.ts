import { createServer, type ServerResponse } from 'http';
import { CredentialService } from './credential-service';
import { PassportData } from '@bricktowers/rwa-contract';
import { isGovernmentSignaturePayload, verifyGovernmentSignature } from './government-signature-verifier';

const identityProviderKeyPair = {
  privateKey: 1241430319352124423615924899154790773272120964456935720653499721250655785752n,
  publicKey: {
    x: 43812792349252743837835600206320630279382719512257386748251693919975321166387n,
    y: 41407619889938320009195859806815249190164661574397387710805607319299297262215n
  }
}
const credentialSigner = new CredentialService(identityProviderKeyPair);

const encoder = new TextEncoder();

const bigintStringify = (_key: string, value: any): any => {
  return typeof value === 'bigint' ? value.toString() : value;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};


function toBigInt(str: string): bigint {
  const bytes = encoder.encode(str);
  if (bytes.length > 32) {
    throw new RangeError("String is too long; maximum is 32 bytes");
  }
  const arr = new Uint8Array(32);
  arr.set(bytes.slice(0, 32));
  let result = 0n;
  for (let i = 0; i < arr.length; i++) {
    result += BigInt(arr[i]) * (256n ** BigInt(i));
  }
  return result;
}


async function handleSignRequest(res: ServerResponse, body: string): Promise<void> {
  let content: unknown;
  try {
    content = JSON.parse(body);
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'Invalid JSON input' }));
    return;
  }

  if (!isGovernmentSignaturePayload(content)) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'Payload must include credential, signature and pk as hex strings' }));
    return;
  }

  try {
    verifyGovernmentSignature(content);
  } catch (error) {
    console.error('Signature verification failed:', error);
    res.writeHead(403, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'Signature verification failed' }));
    return;
  }

  const line1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
  const line2 = 'L898902C36UTO6908061F9406236ZE184226B<<<<<10';

  const credential: PassportData = {
    documentCode: toBigInt('P<'),
    issuingOrganization: toBigInt('UTO'),
    holderName: toBigInt('ERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<'),
    documentNumber: toBigInt('L898902C3'),
    documentNumberCheckDigit: 6n,
    nationality: toBigInt('RUS'),
    dateOfBirth: toBigInt('690806'),
    dateOfBirthCheckDigit: 1n,
    sex: toBigInt('F'),
    expiryDate: toBigInt('940623'),
    expiryDateCheckDigit: 6n,
    optionalData: toBigInt('ZE184226B<<<<<'),
    optionalDataCheckDigit: 1n,
    compositeCheckDigit: 0n,
  };

  try {
    const signedCredential = await credentialSigner.sign(credential);
    const responseBody = JSON.stringify(signedCredential, bigintStringify);

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(responseBody);
  } catch (error) {
    console.error('Server error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  if (req.method === 'POST' && req.url === '/sign') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      await handleSignRequest(res, body);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
