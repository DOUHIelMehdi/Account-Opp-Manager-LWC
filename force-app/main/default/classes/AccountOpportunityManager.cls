public with sharing class AccountOpportunityManager {

    // Méthode pour récupérer les opportunités existantes
    @AuraEnabled(cacheable=true)
    public static List<Opportunity> getOpportunities(String accountId) {
        try {
            return [
                SELECT Id, Name, StageName, CloseDate, Amount
                FROM Opportunity
                WHERE AccountId = :accountId
                WITH SECURITY_ENFORCED
                ORDER BY CreatedDate DESC
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Méthode pour mettre à jour les opportunités (utilisée par la table principale)
    @AuraEnabled
    public static String updateOpportunities(List<Opportunity> opportunitiesToUpdate) {
        try {
            update opportunitiesToUpdate;
            return 'Success: Opportunities updated successfully.';
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Méthode pour supprimer les opportunités sélectionnées
    @AuraEnabled
    public static void deleteOpportunities(List<String> opportunityIds) {
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            return;
        }
        try {
            List<Opportunity> opportunitiesToDelete = [
                SELECT Id FROM Opportunity
                WHERE Id IN :opportunityIds
                WITH SECURITY_ENFORCED
            ];
            if (!opportunitiesToDelete.isEmpty()) {
                delete opportunitiesToDelete;
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Méthode pour créer une nouvelle opportunité (utilisée par la modale)
    @AuraEnabled
    public static Opportunity createOpportunity(Opportunity opp) {
        try {
            insert opp;
            return opp;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}