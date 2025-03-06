'use strict';

const { Contract } = require('fabric-contract-api');

class PoliceContract extends Contract {
    // Initialize the ledger
    async initLedger(ctx) {
        console.info('============= START : Initialize Police Ledger ===========');
        // Initial setup if needed
        console.info('============= END : Initialize Police Ledger ===========');
        return 'Police ledger initialized';
    }
    
    // Issue certificate of morality
    async issueMoralityCertificate(ctx, certificateId, citizenId, name, issueDate, expiryDate) {
        console.info('============= START : Issue Certificate of Morality ===========');
        
        const certificate = {
            docType: 'moralityCertificate',
            citizenId: citizenId,
            name: name,
            issueDate: issueDate,
            expiryDate: expiryDate,
            status: 'valid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(certificate)));
        console.info('============= END : Issue Certificate of Morality ===========');
        return JSON.stringify(certificate);
    }
    
    // Record a fine
    async recordFine(ctx, fineId, citizenId, officerId, amount, reason, issueDate, dueDate) {
        console.info('============= START : Record Fine ===========');
        
        const fine = {
            docType: 'fine',
            citizenId: citizenId,
            officerId: officerId,
            amount: amount,
            reason: reason,
            issueDate: issueDate,
            dueDate: dueDate,
            status: 'unpaid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(fineId, Buffer.from(JSON.stringify(fine)));
        console.info('============= END : Record Fine ===========');
        return JSON.stringify(fine);
    }
    
    // Pay a fine
    async payFine(ctx, fineId, paymentMethod, paymentReference) {
        console.info('============= START : Pay Fine ===========');
        
        const fineAsBytes = await ctx.stub.getState(fineId);
        if (!fineAsBytes || fineAsBytes.length === 0) {
            throw new Error(`Fine ${fineId} does not exist`);
        }
        
        const fine = JSON.parse(fineAsBytes.toString());
        fine.status = 'paid';
        fine.paymentMethod = paymentMethod;
        fine.paymentReference = paymentReference;
        fine.paymentDate = new Date().toISOString();
        fine.updatedAt = new Date().toISOString();
        
        await ctx.stub.putState(fineId, Buffer.from(JSON.stringify(fine)));
        console.info('============= END : Pay Fine ===========');
        return JSON.stringify(fine);
    }
    
    // Record a criminal record
    async recordCriminalRecord(ctx, recordId, citizenId, officerId, offense, description, date, sentence) {
        console.info('============= START : Record Criminal Record ===========');
        
        const record = {
            docType: 'criminalRecord',
            citizenId: citizenId,
            officerId: officerId,
            offense: offense,
            description: description,
            date: date,
            sentence: sentence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));
        console.info('============= END : Record Criminal Record ===========');
        return JSON.stringify(record);
    }
    
    // Get citizen's police records
    async getCitizenPoliceRecords(ctx, citizenId) {
        console.info('============= START : Get Citizen Police Records ===========');
        
        // Create query for all records
        const iterator = await ctx.stub.getStateByRange('', '');
        const allRecords = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
                // Filter for this citizen's records
                if (record.citizenId === citizenId) {
                    allRecords.push(record);
                }
            } catch (err) {
                console.log(err);
            }
            result = await iterator.next();
        }
        
        console.info('============= END : Get Citizen Police Records ===========');
        return JSON.stringify(allRecords);
    }
}

module.exports = PoliceContract;
