@isTest
private class AccountOpportunityManagerTest {

    // @testSetup est une méthode spéciale qui s'exécute une seule fois.
    // Elle prépare les données communes à tous nos tests pour plus d'efficacité.
    @testSetup
    static void makeData(){
        // 1. On crée un Compte de test qui servira de parent.
        Account testAccount = new Account(Name='Test Corp Inc.');
        insert testAccount;

        // 2. On crée une liste d'Opportunités de test associées à ce Compte.
        List<Opportunity> oppsToInsert = new List<Opportunity>();
        oppsToInsert.add(new Opportunity(
            Name = 'Opp To Test Get',
            AccountId = testAccount.Id,
            StageName = 'Prospecting',
            CloseDate = System.today().addMonths(1),
            Amount = 50000
        ));
        oppsToInsert.add(new Opportunity(
            Name = 'Opp To Test Update',
            AccountId = testAccount.Id,
            StageName = 'Qualification',
            CloseDate = System.today().addMonths(2),
            Amount = 100000
        ));
        insert oppsToInsert;
    }

    // Test pour la méthode getOpportunities
    @isTest
static void testGetOpportunities_HappyPath() {
    // ARRANGE: Récupérer l'ID du compte créé dans le setup.
    Account acc = [SELECT Id FROM Account WHERE Name = 'Test Corp Inc.' LIMIT 1];

    // ACT: Exécuter la méthode que l'on veut tester.
    Test.startTest();
        List<Opportunity> result = AccountOpportunityManager.getOpportunities(acc.Id);
    Test.stopTest();

    // ASSERT: Vérifier que le résultat est correct.
    // 1. Vérifier la taille de la liste, c'est toujours important.
    System.assertEquals(2, result.size(), 'Doit retourner les 2 opportunités créées.');

    // 2. Transformer la liste de noms en un ensemble (Set) pour des vérifications faciles.
    // Un ensemble ne se soucie pas de l'ordre.
    Set<String> opportunityNames = new Set<String>();
    for (Opportunity opp : result) {
        opportunityNames.add(opp.Name);
    }

    // 3. Vérifier que nos deux opportunités sont bien présentes dans l'ensemble, peu importe leur ordre.
    System.assert(opportunityNames.contains('Opp To Test Get'), 'La liste doit contenir "Opp To Test Get".');
    System.assert(opportunityNames.contains('Opp To Test Update'), 'La liste doit contenir "Opp To Test Update".');
}

    // Test pour la méthode createNewOpportunity
    @isTest
    static void testCreateOpportunity_HappyPath() {
        // ARRANGE: Récupérer l'ID du compte et préparer une nouvelle opportunité.
        Account acc = [SELECT Id FROM Account WHERE Name = 'Test Corp Inc.' LIMIT 1];
        Opportunity newOpp = new Opportunity(
            Name = 'Newly Created Opp',
            AccountId = acc.Id,
            StageName = 'Prospecting',
            CloseDate = System.today().addDays(30)
        );

        // ACT: Exécuter la méthode de création.
        Test.startTest();
            Opportunity createdOpp = AccountOpportunityManager.createOpportunity(newOpp);
        Test.stopTest();

        // ASSERT: Vérifier que l'opportunité a bien été créée dans la base de données.
        System.assertNotEquals(null, createdOpp.Id, 'L\'ID de l\'opportunité ne doit pas être nul après l\'insertion.');
        
        // Vérification ultime : la retrouver dans la base de données.
        List<Opportunity> verificationList = [SELECT Id FROM Opportunity WHERE Id = :createdOpp.Id];
        System.assertEquals(1, verificationList.size(), 'L\'opportunité doit exister dans la base de données.');
    }

    // Test pour la méthode updateOpportunities
    @isTest
    static void testUpdateOpportunities_HappyPath() {
        // ARRANGE: Récupérer l'opportunité que l'on veut modifier.
        Opportunity oppToUpdate = [SELECT Id, StageName FROM Opportunity WHERE Name = 'Opp To Test Update' LIMIT 1];
        System.assertEquals('Qualification', oppToUpdate.StageName, 'Vérification de l etat initial.');
        
        // Modifier le stage en mémoire
        oppToUpdate.StageName = 'Closed Won';
        List<Opportunity> updateList = new List<Opportunity>{ oppToUpdate };

        // ACT: Exécuter la méthode de mise à jour.
        Test.startTest();
            AccountOpportunityManager.updateOpportunities(updateList);
        Test.stopTest();

        // ASSERT: Vérifier que le changement a bien été sauvegardé.
        Opportunity updatedOpp = [SELECT StageName FROM Opportunity WHERE Id = :oppToUpdate.Id];
        System.assertEquals('Closed Won', updatedOpp.StageName, 'Le stage doit avoir été mis à jour à "Closed Won".');
    }

    // Test pour la méthode deleteOpportunities
    @isTest
    static void testDeleteOpportunities_HappyPath() {
        // ARRANGE: Récupérer les IDs des opportunités à supprimer.
        List<Opportunity> oppsToDelete = [SELECT Id FROM Opportunity WHERE AccountId != null];
        System.assertEquals(2, oppsToDelete.size(), 'Vérification qu\'on a bien 2 opportunités au départ.');
        
        List<String> oppIds = new List<String>();
        for (Opportunity opp : oppsToDelete) {
            oppIds.add(opp.Id);
        }

        // ACT: Exécuter la méthode de suppression.
        Test.startTest();
            AccountOpportunityManager.deleteOpportunities(oppIds);
        Test.stopTest();

        // ASSERT: Vérifier que les opportunités n'existent plus.
        List<Opportunity> verificationList = [SELECT Id FROM Opportunity WHERE Id IN :oppIds];
        System.assertEquals(0, verificationList.size(), 'Toutes les opportunités auraient dû être supprimées.');
    }
    
    // Test d'un cas d'erreur (par exemple, essayer de créer une Opp sans champ requis)
    @isTest
static void testCreateOpportunity_ErrorCase() {
    // ARRANGE: Créer une opportunité invalide (sans les champs requis comme Name et AccountId).
    Opportunity invalidOpp = new Opportunity(); // Totalement vide pour garantir l'erreur
    Boolean exceptionThrown = false;
    
    // ACT & ASSERT: On s'attend à ce qu'une exception soit levée.
    Test.startTest();
    try {
        // On exécute la méthode qui doit échouer.
        AccountOpportunityManager.createOpportunity(invalidOpp);
    } catch (AuraHandledException e) {
        // --- LA CORRECTION EST ICI ---
        // On attrape spécifiquement le type d'exception que notre code principal lance.
        // Si on entre dans ce bloc catch, cela signifie que notre code de gestion d'erreur a fonctionné.
        exceptionThrown = true;
        
        // On peut vérifier que le message n'est pas vide, ce qui est moins fragile
        // que de vérifier un texte précis.
        System.assertNotEquals(null, e.getMessage(), 'Le message d\'erreur ne devrait pas être vide.');
    } catch (Exception e) {
        // On garde un catch générique au cas où un autre type d'erreur se produirait.
        // Dans ce cas, on ferait échouer le test car ce n'est pas l'erreur attendue.
        System.assert(false, 'Une exception inattendue a été levée : ' + e.getMessage());
    }
    Test.stopTest();
    
    // On vérifie que notre bloc catch a bien été exécuté.
    System.assertEquals(true, exceptionThrown, 'Une AuraHandledException aurait dû être levée.');
}
}