'use strict';

const { Contract } = require('fabric-contract-api');

class HealthContract extends Contract {
    // Initialize the ledger
    async initLedger(ctx) {
        console.info('============= START : Initialize Health Ledger ===========');
        // Initial setup if needed
        console.info('============= END : Initialize Health Ledger ===========');
        return 'Health ledger initialized';
    }
    
    // Create a medical record for citizen
    async createMedicalRecord(ctx, recordId, citizenId, doctorId, diagnosis, treatment, date) {
        console.info('============= START : Create Medical Record ===========');
        
        // Create record object
        const record = {
            docType: 'medicalRecord',
            citizenId: citizenId,
            doctorId: doctorId,
            diagnosis: diagnosis,
            treatment: treatment,
            date: date,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Store in world state
        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));
        console.info('============= END : Create Medical Record ===========');
        return JSON.stringify(record);
    }
    
    // Get medical record by ID
    async getMedicalRecord(ctx, recordId) {
        const recordAsBytes = await ctx.stub.getState(recordId);
        if (!recordAsBytes || recordAsBytes.length === 0) {
            throw new Error(`Medical record ${recordId} does not exist`);
        }
        return recordAsBytes.toString();
    }
    
    // Create prescription
    async createPrescription(ctx, prescriptionId, citizenId, doctorId, medications, instructions, expiryDate) {
        console.info('============= START : Create Prescription ===========');
        
        const prescription = {
            docType: 'prescription',
            citizenId: citizenId,
            doctorId: doctorId,
            medications: medications,
            instructions: instructions,
            expiryDate: expiryDate,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(prescriptionId, Buffer.from(JSON.stringify(prescription)));
        console.info('============= END : Create Prescription ===========');
        return JSON.stringify(prescription);
    }
    
    // Book appointment
    async bookAppointment(ctx, appointmentId, citizenId, doctorId, date, time, purpose) {
        console.info('============= START : Book Appointment ===========');
        
        const appointment = {
            docType: 'appointment',
            citizenId: citizenId,
            doctorId: doctorId,
            date: date,
            time: time,
            purpose: purpose,
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(appointmentId, Buffer.from(JSON.stringify(appointment)));
        console.info('============= END : Book Appointment ===========');
        return JSON.stringify(appointment);
    }
    
    // Get citizen's medical history
    async getCitizenMedicalHistory(ctx, citizenId) {
        console.info('============= START : Get Citizen Medical History ===========');
        
        // Create query for all records of this citizen
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
        
        console.info('============= END : Get Citizen Medical History ===========');
        return JSON.stringify(allRecords);
    }
}

module.exports = HealthContract;
