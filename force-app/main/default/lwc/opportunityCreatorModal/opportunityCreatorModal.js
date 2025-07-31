import { LightningElement, api, wire } from 'lwc';
// ** 1. On importe l'outil pour afficher les messages (toasts) **
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import OPPORTUNITY_OBJECT from '@salesforce/schema/Opportunity';
import STAGE_FIELD from '@salesforce/schema/Opportunity.StageName';
import createOpportunity from '@salesforce/apex/AccountOpportunityManager.createOpportunity';

export default class OpportunityCreatorModal extends LightningElement {
    @api accountId;
    opportunity = { 'sobjectType': 'Opportunity' };
    stageOptions = [];

    // Wire service pour récupérer la picklist des Stages
    @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT }) objectInfo;
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: STAGE_FIELD })
    wiredStagePicklist({ data }) {
        if (data) {
            this.stageOptions = data.values;
        }
    }

    // Gère la saisie dans les champs du formulaire
    handleChange(event) {
        this.opportunity[event.target.name] = event.target.value;
    }

    // Gère le clic sur le bouton "Save"
    handleSave() {
        // --- Validation des champs requis (ne change pas) ---
        const allValid = [...this.template.querySelectorAll('lightning-input, lightning-combobox')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (!allValid) {
            return; // Arrête la sauvegarde si un champ requis est vide
        }

        // =============================================
        // ** 2. ON AJOUTE LA VALIDATION DE LA DATE ICI **
        // =============================================
        // On vérifie d'abord si une date a été saisie
        if (this.opportunity.CloseDate) {
            const today = new Date();
            // On met l'heure à zéro pour comparer uniquement les dates
            today.setHours(0, 0, 0, 0); 
            const todayString = today.toISOString().slice(0, 10); // Format YYYY-MM-DD

            // On compare la date saisie avec la date d'aujourd'hui
            if (this.opportunity.CloseDate < todayString) {
                // Si la date est dans le passé, on affiche une erreur
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Invalid Date',
                        message: 'Close Date cannot be in the past. Please choose today or a future date.',
                        variant: 'error',
                        mode: 'sticky' // Le message reste jusqu'à ce que l'utilisateur le ferme
                    })
                );
                return; // ** 3. On arrête le processus de sauvegarde **
            }
        }
        // --- Fin de la validation de la date ---

        // Si toutes les validations sont passées, on continue...
        this.opportunity.AccountId = this.accountId;

        createOpportunity({ opp: this.opportunity })
            .then(() => {
                // On envoie l'événement de succès au composant parent
                this.dispatchEvent(new CustomEvent('success'));
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error Creating Opportunity', message: error.body.message, variant: 'error' }));
            });
    }

    // Gère la fermeture de la modale
    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}