import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

import getOpportunities from '@salesforce/apex/AccountOpportunityManager.getOpportunities';
import updateOpportunities from '@salesforce/apex/AccountOpportunityManager.updateOpportunities';

// 1. Define our Master List of valid stages. This is our "source of truth".
const VALID_STAGES = [
    'Prospecting',
    'Qualification',
    'Needs Analysis',
    'Value Proposition',
    'Id. Decision Makers',
    'Perception Analysis',
    'Proposal/Price Quote',
    'Negotiation/Review',
    'Closed Won',
    'Closed Lost'
];

// 2. Define the columns. Stage is now back to a simple 'text' type.
const COLUMNS = [
    { label: 'Opportunity Name', fieldName: 'Name', type: 'text' },
    {
        label: 'Stage',
        fieldName: 'StageName',
        type: 'text', // <-- CRITICAL: Stage is a text field again
        editable: true
    },
    {
        label: 'Close Date',
        fieldName: 'CloseDate',
        type: 'date-local',
        editable: true
    },
    {
        label: 'Amount',
        fieldName: 'Amount',
        type: 'currency',
        typeAttributes: { currencyCode: 'USD' },
        cellAttributes: { alignment: 'left' }
    }
];

export default class AccountOpportunityManager extends LightningElement {
    @api recordId;
    columns = COLUMNS;
    validStages = VALID_STAGES;
    opportunities;
    error;
    draftValues = [];
    isLoading = false;
    wiredOppResult;

    @wire(getOpportunities, { accountId: '$recordId' })
    wiredOpportunities(result) {
        this.wiredOppResult = result;
        if (result.data) {
            this.opportunities = result.data;
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.opportunities = undefined;
        }
    }
    
    // 3. The new handleSave function with our custom validation logic.
    handleSave(event) {
        const recordsToUpdate = JSON.parse(JSON.stringify(event.detail.draftValues));

        // Create a lowercase version of our master list for easy comparison
        const validStagesLower = VALID_STAGES.map(stage => stage.toLowerCase());

        // --- STAGE VALIDATION LOGIC ---
        for (const record of recordsToUpdate) {
            // Check if the user edited the StageName for this row
            if (record.StageName) {
                const userStageInput = record.StageName.toLowerCase().trim();
                
                // Find the index of the matching stage in our lowercase master list
                const matchIndex = validStagesLower.indexOf(userStageInput);

                if (matchIndex === -1) {
                    // NO MATCH FOUND: Show an error and stop the save
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Invalid Stage',
                        message: `The stage "${record.StageName}" is not a valid value. Please correct it.`,
                        variant: 'error'
                    }));
                    return; // Stop the entire save process
                } else {
                    // MATCH FOUND: For data quality, update the record to use the correctly-cased value
                    record.StageName = VALID_STAGES[matchIndex];
                }
            }
        }
        // --- END OF STAGE VALIDATION ---

        // --- (The existing date validation remains the same) ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().slice(0, 10);
        for (const record of recordsToUpdate) {
            if (record.CloseDate) {
                if (record.CloseDate < todayString) {
                    this.dispatchEvent(new ShowToastEvent({ title: 'Invalid Date', message: 'Close Date cannot be in the past.', variant: 'error'}));
                    return;
                }
            }
        }
        // --- END OF DATE VALIDATION ---
        
        // If all validations pass, proceed with saving to the database
        this.isLoading = true;
        updateOpportunities({ opportunitiesToUpdate: recordsToUpdate })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Opportunities updated!', variant: 'success' }));
                this.draftValues = [];
                return refreshApex(this.wiredOppResult);
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: error.body.message, variant: 'error' }));
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    get noOpportunitiesFound() {
        return this.opportunities && this.opportunities.length === 0;
    }
}