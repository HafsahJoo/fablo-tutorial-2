// chaincode to Store CID and citizenID for birth certificate
// chaincode to Store CID and citizenID for marriage certificate

'use strict';

import { Contract } from 'fabric-contract-api';

class CivilContract extends Contract {
    
    // Initialize the civil ledger
    async initLedger(ctx) {
        console.info('============= START : Initialize Civil Ledger ===========');
        // No initial data needed, just initialize the ledger
        console.info('============= END : Initialize Civil Ledger ===========');
    }
    
    // Store marriage certificate on blockchain using IPFS CID as key
    async storeMarriageCertificate(ctx, ipfsCid, citizenId1, citizenId2) {
        console.info('============= START : Store Marriage Certificate ===========');
        
        // Check if certificate already exists
        const certificateAsBytes = await ctx.stub.getState(ipfsCid);
        if (certificateAsBytes && certificateAsBytes.length > 0) {
            throw new Error(`Certificate with CID ${ipfsCid} already exists`);
        }
        
        // Create simple marriage certificate object
        const marriageCertificate = {
            type: 'marriage_certificate',
            citizenId1: citizenId1, // First spouse ID
            citizenId2: citizenId2, // Second spouse ID
            issuedAt: new Date().toISOString(),
            status: 'active'
        };
        
        // Store certificate on the ledger using IPFS CID as the key
        await ctx.stub.putState(ipfsCid, Buffer.from(JSON.stringify(marriageCertificate)));
        console.info(`Marriage certificate with CID ${ipfsCid} has been stored for citizens ${citizenId1} and ${citizenId2}`);
        
        console.info('============= END : Store Marriage Certificate ===========');
        return JSON.stringify(marriageCertificate);
    }
    
    // Store birth certificate on blockchain using IPFS CID as key
    async storeBirthCertificate(ctx, ipfsCid, citizenId) {
        console.info('============= START : Store Birth Certificate ===========');
        
        // Check if certificate already exists
        const certificateAsBytes = await ctx.stub.getState(ipfsCid);
        if (certificateAsBytes && certificateAsBytes.length > 0) {
            throw new Error(`Certificate with CID ${ipfsCid} already exists`);
        }
        
        // Create simple birth certificate object
        const birthCertificate = {
            type: 'birth_certificate',
            citizenId: citizenId,     // ID of the newborn/child
            issuedAt: new Date().toISOString(),
            status: 'active'
        };
        
        // Store certificate on the ledger using IPFS CID as the key
        await ctx.stub.putState(ipfsCid, Buffer.from(JSON.stringify(birthCertificate)));
        console.info(`Birth certificate with CID ${ipfsCid} has been stored for citizen ${citizenId}`);
        
        console.info('============= END : Store Birth Certificate ===========');
        return JSON.stringify(birthCertificate);
    }
    
    // Retrieve marriage certificate using IPFS CID
    async getMarriageCertificate(ctx, ipfsCid, requesterId) {
        console.info('============= START : Get Marriage Certificate ===========');
        
        // Get certificate from ledger
        const certificateAsBytes = await ctx.stub.getState(ipfsCid);
        if (!certificateAsBytes || certificateAsBytes.length === 0) {
            throw new Error(`Marriage certificate with CID ${ipfsCid} does not exist`);
        }
        
        // Parse certificate data
        const marriageCertificate = JSON.parse(certificateAsBytes.toString());
        
        // Verify this is a marriage certificate
        if (marriageCertificate.type !== 'marriage_certificate') {
            throw new Error(`Document with CID ${ipfsCid} is not a marriage certificate`);
        }
        
        // Access control - only the spouses or authorized admin can view the certificate
        if (requesterId !== marriageCertificate.citizenId1 && 
            requesterId !== marriageCertificate.citizenId2 && 
            !requesterId.startsWith('civil_')) {
            throw new Error('Access denied: You are not authorized to view this marriage certificate');
        }
        
        // Add the CID to the response object for convenience
        const response = {
            ...marriageCertificate,
            ipfsCid: ipfsCid
        };
        
        console.info('============= END : Get Marriage Certificate ===========');
        return JSON.stringify(response);
    }
    
    // Retrieve birth certificate using IPFS CID
    async getBirthCertificate(ctx, ipfsCid, requesterId) {
        console.info('============= START : Get Birth Certificate ===========');
        
        // Get certificate from ledger
        const certificateAsBytes = await ctx.stub.getState(ipfsCid);
        if (!certificateAsBytes || certificateAsBytes.length === 0) {
            throw new Error(`Birth certificate with CID ${ipfsCid} does not exist`);
        }
        
        // Parse certificate data
        const birthCertificate = JSON.parse(certificateAsBytes.toString());
        
        // Verify this is a birth certificate
        if (birthCertificate.type !== 'birth_certificate') {
            throw new Error(`Document with CID ${ipfsCid} is not a birth certificate`);
        }
        
        // Access control - only the citizen or authorized admin can view the certificate
        if (requesterId !== birthCertificate.citizenId && 
            !requesterId.startsWith('civil_')) {
            throw new Error('Access denied: You are not authorized to view this birth certificate');
        }
        
        // Add the CID to the response object for convenience
        const response = {
            ...birthCertificate,
            ipfsCid: ipfsCid
        };
        
        console.info('============= END : Get Birth Certificate ===========');
        return JSON.stringify(response);
    }
    
    
}

module.exports.CivilContract = CivilContract;
module.exports.contracts = [CivilContract];