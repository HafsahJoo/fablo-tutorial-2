'use strict';

const { Contract } = require('fabric-contract-api');

class IdentityContract extends Contract {
    // Initialize the ledger
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        // Initial setup if needed
        console.info('============= END : Initialize Ledger ===========');
        return 'Ledger initialized';
    }
    
    // Register a new citizen identity
    async registerCitizen(ctx, citizenId, name, dob, password) {
        console.info('============= START : Register Citizen ===========');
        
        // Create citizen object
        const citizen = {
            docType: 'citizen',
            name: name,
            dob: dob,
            password: password, // Note: In production, never store plain passwords
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Store in world state
        await ctx.stub.putState(citizenId, Buffer.from(JSON.stringify(citizen)));
        console.info('============= END : Register Citizen ===========');
        return JSON.stringify(citizen);
    }
    
    // Get citizen by ID
    async getCitizen(ctx, citizenId) {
        const citizenAsBytes = await ctx.stub.getState(citizenId);
        if (!citizenAsBytes || citizenAsBytes.length === 0) {
            throw new Error(`Citizen with ID ${citizenId} does not exist`);
        }
        return citizenAsBytes.toString();
    }
    
    // Authenticate citizen (for login)
    async authenticateCitizen(ctx, citizenId, password) {
        const citizenAsBytes = await ctx.stub.getState(citizenId);
        if (!citizenAsBytes || citizenAsBytes.length === 0) {
            throw new Error(`Citizen with ID ${citizenId} does not exist`);
        }
        
        const citizen = JSON.parse(citizenAsBytes.toString());
        
        // Simple password check (again, improve this in production)
        if (citizen.password === password) {
            return JSON.stringify({
                authenticated: true,
                citizenId: citizenId,
                name: citizen.name
            });
        } else {
            return JSON.stringify({
                authenticated: false
            });
        }
    }
}

module.exports = IdentityContract;
