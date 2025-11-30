/**
 * PLC Directory Service
 * Fetches user profile data from AT Protocol's DID PLC Directory
 */

const PLC_DIRECTORY_URL = 'https://plc.directory';

export interface DIDDocument {
  id: string;
  alsoKnownAs?: string[];
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

export interface UserProfile {
  did: string;
  handle?: string;
  pds?: string;
}

/**
 * Resolve DID Document from PLC Directory
 */
export async function resolveDID(did: string): Promise<DIDDocument | null> {
  try {
    const response = await fetch(`${PLC_DIRECTORY_URL}/${did}`);
    
    if (response.status === 404) {
      console.warn(`DID not found: ${did}`);
      return null;
    }
    
    if (response.status === 410) {
      console.warn(`DID tombstoned (deleted): ${did}`);
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`PLC Directory returned ${response.status}`);
    }
    
    const didDoc = await response.json();
    return didDoc;
  } catch (error) {
    console.error('Error resolving DID:', error);
    return null;
  }
}

/**
 * Extract user profile information from DID document
 */
export function extractProfileFromDID(didDoc: DIDDocument): UserProfile {
  const profile: UserProfile = {
    did: didDoc.id,
  };
  
  // Extract handle from alsoKnownAs (at://handle format)
  if (didDoc.alsoKnownAs && didDoc.alsoKnownAs.length > 0) {
    const atUri = didDoc.alsoKnownAs.find(uri => uri.startsWith('at://'));
    if (atUri) {
      profile.handle = atUri.replace('at://', '');
    }
  }
  
  // Extract PDS endpoint from services
  if (didDoc.service && didDoc.service.length > 0) {
    const pdsService = didDoc.service.find(s => s.type === 'AtprotoPersonalDataServer');
    if (pdsService) {
      profile.pds = pdsService.serviceEndpoint;
    }
  }
  
  return profile;
}

/**
 * Fetch user profile by DID
 * This is the main function to use when adding drivers
 */
export async function getUserProfileByDID(did: string): Promise<UserProfile | null> {
  const didDoc = await resolveDID(did);
  if (!didDoc) {
    return null;
  }
  
  return extractProfileFromDID(didDoc);
}

/**
 * Validate DID format
 */
export function isValidDID(did: string): boolean {
  return /^did:plc:[a-z2-7]{24}$/.test(did);
}
