'use strict';

import  { Contract } from 'fabric-contract-api';

class ElectoralContract extends Contract {
    // Initialize the ledger
    async initLedger(ctx) {
        console.info('============= START : Initialize Electoral Ledger ===========');
        // Initial setup if needed
        console.info('============= END : Initialize Electoral Ledger ===========');
        return 'Electoral ledger initialized';
    }
    
    // Create a new election
    async createElection(ctx, electionId, title, description, startDate, endDate, options) {
        console.info('============= START : Create Election ===========');
        
        // Parse options array if it's a string
        const optionsArray = typeof options === 'string' ? JSON.parse(options) : options;
        
        // Initialize vote counts for each option
        const optionsWithCounts = optionsArray.map(option => ({
            option: option,
            voteCount: 0
        }));
        
        const election = {
            docType: 'election',
            title: title,
            description: description,
            startDate: startDate,
            endDate: endDate,
            options: optionsWithCounts,
            status: 'scheduled',
            voterRegistry: [], // Will store citizenIds who have voted
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(electionId, Buffer.from(JSON.stringify(election)));
        console.info('============= END : Create Election ===========');
        return JSON.stringify(election);
    }
    
    // Get election by ID
    async getElection(ctx, electionId) {
        const electionAsBytes = await ctx.stub.getState(electionId);
        if (!electionAsBytes || electionAsBytes.length === 0) {
            throw new Error(`Election ${electionId} does not exist`);
        }
        return electionAsBytes.toString();
    }
    
    // Cast a vote
    async castVote(ctx, electionId, citizenId, selectedOption) {
        console.info('============= START : Cast Vote ===========');
        
        // Get the election
        const electionAsBytes = await ctx.stub.getState(electionId);
        if (!electionAsBytes || electionAsBytes.length === 0) {
            throw new Error(`Election ${electionId} does not exist`);
        }
        
        const election = JSON.parse(electionAsBytes.toString());
        
        // Check if election is active
        const now = new Date().toISOString();
        if (now < election.startDate || now > election.endDate) {
            throw new Error('Election is not active');
        }
        
        // Check if citizen has already voted
        if (election.voterRegistry.includes(citizenId)) {
            throw new Error(`Citizen ${citizenId} has already voted in this election`);
        }
        
        // Find the option and increment vote count
        const optionIndex = election.options.findIndex(opt => opt.option === selectedOption);
        if (optionIndex === -1) {
            throw new Error(`Option ${selectedOption} is not valid for this election`);
        }
        
        // Increment vote count and add citizen to voter registry
        election.options[optionIndex].voteCount += 1;
        election.voterRegistry.push(citizenId);
        election.updatedAt = new Date().toISOString();
        
        // Save updated election
        await ctx.stub.putState(electionId, Buffer.from(JSON.stringify(election)));
        console.info('============= END : Cast Vote ===========');
        
        // Return confirmation without revealing current vote counts
        return JSON.stringify({
            message: 'Vote cast successfully',
            electionId: electionId,
            citizenId: citizenId,
            selectedOption: selectedOption
        });
    }
    
    // Get election results (only if election has ended)
    async getElectionResults(ctx, electionId) {
        console.info('============= START : Get Election Results ===========');
        
        // Get the election
        const electionAsBytes = await ctx.stub.getState(electionId);
        if (!electionAsBytes || electionAsBytes.length === 0) {
            throw new Error(`Election ${electionId} does not exist`);
        }
        
        const election = JSON.parse(electionAsBytes.toString());
        
        // Check if election has ended
        const now = new Date().toISOString();
        if (now <= election.endDate) {
            // Election still in progress
            return JSON.stringify({
                message: 'Election is still in progress. Results will be available after the end date.',
                electionId: electionId,
                title: election.title,
                endDate: election.endDate
            });
        }
        
        // Election has ended, return results
        console.info('============= END : Get Election Results ===========');
        return JSON.stringify({
            electionId: electionId,
            title: election.title,
            description: election.description,
            startDate: election.startDate,
            endDate: election.endDate,
            totalVotes: election.voterRegistry.length,
            results: election.options
        });
    }
    
    // Get all active elections
    async getActiveElections(ctx) {
        console.info('============= START : Get Active Elections ===========');
        
        const now = new Date().toISOString();
        
        // Create query for all elections
        const iterator = await ctx.stub.getStateByRange('', '');
        const activeElections = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let election;
            try {
                election = JSON.parse(strValue);
                // Filter for active elections
                if (election.docType === 'election' && 
                    now >= election.startDate && 
                    now <= election.endDate) {
                    
                    // Don't include voter registry in response for privacy
                    const { voterRegistry, ...publicElectionInfo } = election;
                    activeElections.push(publicElectionInfo);
                }
            } catch (err) {
                console.log(err);
            }
            result = await iterator.next();
        }
        
        console.info('============= END : Get Active Elections ===========');
        return JSON.stringify(activeElections);
    }
}

module.exports = ElectoralContract;
