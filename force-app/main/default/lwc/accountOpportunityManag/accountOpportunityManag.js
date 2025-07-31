import { LightningElement, api, wire } from 'lwc';

// Import the Apex method we created
import getOpportunities from '@salesforce/apex/AccountOpportunityManager.getOpportunities';

// Define the columns for our data table.
const COLUMNS = [
    { label: 'Opportunity Name', fieldName: 'Name', type: 'text' },
    { label: 'Stage', fieldName: 'StageName', type: 'text' },
    { label: 'Close Date', fieldName: 'CloseDate', type: 'text' }, // 'date-local' is a good type for dates without timezones
    { label: 'Amount', fieldName: 'Amount', type: 'currency', typeAttributes: { currencyCode: 'USD' },cellAttributes: { alignment: 'left' }
}
];

export default class AccountOpportunityManager extends LightningElement {
@api recordId;
    columns = COLUMNS;
    opportunities; // This will hold our formatted data
    error;

    // Use the @wire adapter to call a function when data is returned
    @wire(getOpportunities, { accountId: '$recordId' })
    wiredOpportunities({ error, data }) {
        if (data) {
            // This is the key part: we process the data before displaying it.
            // We use .map() to create a new array based on the original data.
            this.opportunities = data.map(opp => {
                // Create a copy of the opportunity object to avoid modifying the read-only cache
                let oppCopy = { ...opp };

                // Format the date:
                // Check if CloseDate exists to prevent errors
                if (oppCopy.CloseDate) {
                    const d = new Date(oppCopy.CloseDate);
                    // Get year, month, and day. Pad month/day with a '0' if it's a single digit.
                    const year = d.getFullYear();
                    const month = (d.getMonth() + 1).toString().padStart(2, '0');
                    const day = d.getDate().toString().padStart(2, '0');
                    // Create our desired format
                    oppCopy.CloseDate = `${day}-${month}-${year}`; // e.g., "04-08-2025"
                }
                return oppCopy;
            });

            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.opportunities = undefined;
        }
    }

    get noOpportunitiesFound() {
        // We now check our processed 'opportunities' property
        return this.opportunities && this.opportunities.length === 0;
    }
}