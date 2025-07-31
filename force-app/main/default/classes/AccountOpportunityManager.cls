public with sharing class AccountOpportunityManager {

    /**
     * @description Queries for Opportunities related to a specific Account.
     * @param accountId The ID of the Account.
     * @return A list of related Opportunity records.
     */
    @AuraEnabled(cacheable=true)
    public static List<Opportunity> getOpportunities(String accountId) {
        // We use a try-catch block for robust error handling.
        // If something goes wrong (e.g., user doesn't have permission),
        // it won't crash the entire component.
        try {
            // SOQL query to get the required fields for the Opportunities
            // related to the passed-in accountId.
            // We include the 'Id' because it will be essential for future
            // modules (editing and deleting).
            return [
                SELECT Id, Name, StageName, CloseDate, Amount
                FROM Opportunity
                WHERE AccountId = :accountId
                WITH SECURITY_ENFORCED
                ORDER BY CloseDate DESC
            ];
        } catch (Exception e) {
            // In case of an error, we throw a custom, user-friendly exception
            // that the Lightning Component can catch and display.
            throw new AuraHandledException(e.getMessage());
        }
    }
}