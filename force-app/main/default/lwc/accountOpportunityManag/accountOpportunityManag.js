import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

// Assurez-vous que le nom du contrôleur est correct
import getOpportunities from '@salesforce/apex/AccountOpportunityManager.getOpportunities';
import updateOpportunities from '@salesforce/apex/AccountOpportunityManager.updateOpportunities';
import deleteOpportunities from '@salesforce/apex/AccountOpportunityManager.deleteOpportunities';

// La liste de stages sert de référence et pour la validation dans handleSave
const VALID_STAGES = [
    'Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition',
    'Id. Decision Makers', 'Perception Analysis', 'Proposal/Price Quote',
    'Negotiation/Review', 'Closed Won', 'Closed Lost'
];

// Seuls Stage et CloseDate sont éditables pour les enregistrements existants
const COLUMNS = [
    { label: 'Opportunity Name', fieldName: 'Name', type: 'text' },
    { label: 'Stage', fieldName: 'StageName', type: 'text', editable: true },
    { label: 'Close Date', fieldName: 'CloseDate', type: 'date-local', editable: true },
    { label: 'Amount', fieldName: 'Amount', type: 'currency', typeAttributes: { currencyCode: 'USD' }, cellAttributes: { alignment: 'left' } }
];

export default class AccountOpportunityManager extends LightningElement {
    // Propriétés publiques et privées
    @api recordId;
    columns = COLUMNS;
    validStages = VALID_STAGES;
    opportunities;
    error;
    draftValues = [];
    isLoading = false;
    wiredOppResult;
    selectedRows = [];
    isDeleteButtonDisabled = true;
    isModalOpen = false;

    // Wire service pour récupérer les données initiales
    @wire(getOpportunities, { accountId: '$recordId' })
    wiredOpportunities(result) {
        this.wiredOppResult = result;
        if (result.data) {
            this.opportunities = JSON.parse(JSON.stringify(result.data)); // Crée une copie modifiable
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.opportunities = undefined;
        }
    }

    // --- GESTION DE LA MODALE ---
    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    // Gère l'événement de succès de la modale
    handleSuccess() {
        this.isModalOpen = false; // Ferme la modale
        this.isLoading = true;
        this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'New Opportunity Created!', variant: 'success' }));
        
        // Rafraîchit les données pour afficher le nouvel enregistrement
        refreshApex(this.wiredOppResult).finally(() => {
            this.isLoading = false;
        });
    }

    // --- GESTION DE LA DATATABLE ---
    // Gère la sélection des lignes pour la suppression
    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
        this.isDeleteButtonDisabled = this.selectedRows.length === 0;
    }

    // Gère la sauvegarde des modifications en ligne (uniquement les mises à jour)
    handleSave(event) {
        const recordsToUpdate = event.detail.draftValues;

        // Validation du Stage
        const validStagesLower = VALID_STAGES.map(stage => stage.toLowerCase());
        for (const record of recordsToUpdate) {
            if (record.StageName) {
                const userStageInput = record.StageName.toLowerCase().trim();
                const matchIndex = validStagesLower.indexOf(userStageInput);
                if (matchIndex === -1) {
                    this.dispatchEvent(new ShowToastEvent({ title: 'Invalid Stage', message: `The stage "${record.StageName}" is not a valid value.`, variant: 'error' }));
                    return; // Arrête la sauvegarde
                }
                // Corrige la casse pour une meilleure qualité de données
                record.StageName = VALID_STAGES[matchIndex];
            }
        }
        
        // Validation de la Date
        const todayString = new Date().toISOString().slice(0, 10);
        for (const record of recordsToUpdate) {
            if (record.CloseDate && record.CloseDate < todayString) {
                this.dispatchEvent(new ShowToastEvent({ title: 'Invalid Date', message: 'Close Date cannot be in the past.', variant: 'error' }));
                return; // Arrête la sauvegarde
            }
        }
        
        this.isLoading = true;
        updateOpportunities({ opportunitiesToUpdate: recordsToUpdate })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Opportunities updated!', variant: 'success' }));
                this.draftValues = []; // Vide les brouillons
                return refreshApex(this.wiredOppResult);
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error updating records', message: error.body.message, variant: 'error' }));
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // Gère la suppression des lignes sélectionnées
    handleDelete() {
        if (!confirm(`Are you sure you want to delete ${this.selectedRows.length} opportunity(s)?`)) {
            return;
        }

        this.isLoading = true;
        const opportunityIdsToDelete = this.selectedRows.map(row => row.Id);
        
        deleteOpportunities({ opportunityIds: opportunityIdsToDelete })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: `${opportunityIdsToDelete.length} opportunities deleted successfully.`, variant: 'success' }));
                // Réinitialise la sélection
                this.selectedRows = [];
                this.isDeleteButtonDisabled = true;
                return refreshApex(this.wiredOppResult);
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error deleting records', message: error.body.message, variant: 'error' }));
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // --- GETTERS ---
    // Getter corrigé et sécurisé pour éviter les erreurs de rendu
    get noOpportunitiesFound() {
        return Array.isArray(this.opportunities) && this.opportunities.length === 0;
    }
}