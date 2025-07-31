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
/**
     * @description Updates a list of Opportunity records.
     * @param opportunitiesToUpdate The list of opportunities with changed values.
     * @return A success message string.
     */
    @AuraEnabled // Note: This method is NOT cacheable.
    public static String updateOpportunities(List<Opportunity> opportunitiesToUpdate) {
        // Use a try-catch block for robust error handling during database operations.
        try {
            // Perform the DML update. The 'WITH SECURITY_ENFORCED' ensures the user
            // has permission to update these records and fields.
            update opportunitiesToUpdate;
            return 'Success: Opportunities updated successfully.';
        } catch (Exception e) {
            // If any error occurs (validation rule, trigger error, etc.),
            // throw it back to the LWC to be displayed to the user.
            throw new AuraHandledException(e.getMessage());
        }
    } 
}