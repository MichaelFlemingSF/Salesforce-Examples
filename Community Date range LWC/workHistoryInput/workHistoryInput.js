import { LightningElement, api, track } from 'lwc';
import getHistoryByAccountId from '@salesforce/apex/WorkHistoryInputController.getHistoryByAccountId';
import saveEmploymentHistoryData from '@salesforce/apex/WorkHistoryInputController.saveEmploymentHistoryData';

const columns = [
    { label: 'Type', fieldName: 'type' },
    { label: 'Description', fieldName: 'description' },
    {
        label: 'Start Date',
        fieldName: 'startDate',
        type: 'date',
        cellAttributes: { iconName: 'utility:date_input', class: { fieldName: 'startDateClass' } },
    },
    {
        label: 'End Date',
        fieldName: 'endDate',
        type: 'date',
        cellAttributes: { iconName: 'utility:date_input', class: { fieldName: 'endDateClass' } },
    },
    {
        label: 'Actions',
        type: 'action',
        fixedWidth: 100,
        typeAttributes: {
            rowActions: [
                { label: 'Edit', name: 'edit', iconName: 'utility:edit' },
                { label: 'Delete', name: 'delete', iconName: 'utility:delete' }
            ]
        }
    },
];

export default class DatePairsInput extends LightningElement {
    @track datePairs = [];
    @track columns = columns;
    @track isInputMode = false;
    @track hasFullEmploymentHistory = false;
    @track inputType = 'Employment';
    @track typeOptions = [
        { label: 'Employment', value: 'Employment' },
        { label: 'Non-Employment', value: 'Non-Employment' }
    ];
    @track employer = '';
    @track jobTitle = '';
    @track jobDuties = '';
    @track reasonForLeaving = '';
    @track startDate = '';
    @track endDate = '';
    @track isCurrentRole = false;
    @track streetAddress = '';
    @track city = '';
    @track county = '';
    @track country = '';
    @track zipCode = '';
    @track editedRecordId = null;

    @api checkGapDuration = 14;
    @api checkSinceDate;
    @api accountId;
    @api opportunityId;
    @track historyData;

    connectedCallback() {
        console.log("entering connected callback");
        getHistoryByAccountId({ accountId: this.accountId })
            .then(result => {
                this.historyData = JSON.parse(result);
                this.initializeDatePairs(this.historyData);
            })
            .catch(error => {
                console.error('Error fetching history data:', error);
            });
    }

    initializeDatePairs(historyData) {
        this.datePairs = historyData.map((history) => {
            return {
                Id: history.Id,
                type: history.Type__c,
                editedRecordId: history.Id,
                employer: history.Name_of_Employer__c,
                jobTitle: history.Job_Title__c,
                jobDuties: history.Job_Duties__c,
                reasonForLeaving: history.Reason_For_Leaving__c,
                street: history.Street__c,
                city: history.City__c,
                description: history.Type__c === 'Non-Employment' ? history.Description__c  : `${history.Name_of_Employer__c} (${history.Job_Title__c})`,
                stateProvince: history.State_Province__c,
                country: history.Country__c,
                postalZip: history.Postal_Zip_Code__c,
                startDate: history.Start_Date__c,
                endDate: history.End_Date__c,
                startDateClass: '',
                endDateClass: '',
                isNew: false, 
                toDelete: false
            };
        });

        // Sort the datePairs array by startDate
        this.sortDatePairs();

        this.performChecks();
    }


    get disableAddDatePair() {
        return !this.startDate || (!this.isCurrentRole && !this.endDate);
    }

    get isEmploymentType() {
        return this.inputType === 'Employment';
    }

    get isUnemploymentType() {
        return this.inputType === 'Non-Employment';
    }

    get hasDatePairs() {
        return this.datePairs.length > 0;
    }

    handleTypeChange(event) {
        this.inputType = event.target.value;
    }

    handleDescriptionChange(event) {
        this.description = event.target.value;
    }

    handleEmployerChange(event) {
        this.employer = event.target.value;
    }

    handleJobTitleChange(event) {
        this.jobTitle = event.target.value;
    }

    handleJobDutiesChange(event) {
        this.jobDuties = event.target.value;
    }

    handleReasonForLeavingChange(event) {
        this.reasonForLeaving = event.target.value;
    }

    handleStartDateChange(event) {
        this.startDate = event.target.value;
    }

    handleEndDateChange(event) {
        this.endDate = event.target.value;
    }

    handleIsCurrentRoleChange(event) {
        this.isCurrentRole = event.target.checked;
    }

    handleStreetAddressChange(event) {
        this.streetAddress = event.target.value;
    }

    handleCityChange(event) {
        this.city = event.target.value;
    }

    handleCountyChange(event) {
        this.county = event.target.value;
    }

    handleCountryChange(event) {
        this.country = event.target.value;
    }

    handleZipCodeChange(event) {
        this.zipCode = event.target.value;
    }

    handleSave() {
        if (!this.validateInputs()) {
            // Inputs are invalid, do not proceed with save
            this.showToast('Error', 'Please make sure the data entered is valid.', 'error');
            return;
        }
        if (this.startDate && (!this.isCurrentRole || !this.disableAddDatePair)) {
            const newDatePair = {
                Id: this.editedRecordId || this.getNextId(),
                type: this.inputType,
                employer: this.employer,
                jobTitle: this.jobTitle,
                description: this.inputType === 'Non-Employment' ? this.description : `${this.employer} (${this.jobTitle})`,
                jobDuties: this.jobDuties,
                reasonForLeaving: this.reasonForLeaving,
                startDate: this.startDate,
                endDate: this.isCurrentRole ? null : this.endDate,
                streetAddress: this.streetAddress,
                city: this.city,
                county: this.county,
                country: this.country,
                zipCode: this.zipCode, 
                toDelete: false
            };
    
            if (this.editedRecordId) {
                // Update the existing record
                const index = this.datePairs.findIndex(datePair => datePair.Id === this.editedRecordId);
                this.datePairs.splice(index, 1, newDatePair);
            } else {
                // Add a new date pair
                this.datePairs = [...this.datePairs, newDatePair];
            }
            this.sortDatePairs();

            // Call isOverlapping after sorting
            this.performChecks();
    
            // Reset the input fields and edited record ID
            this.resetInputs();
            this.editedRecordId = null;
            this.toggleMode();
        }
    }
    // function for adding new rows to the existing table so that the newly added rows are given an appropriate Id so that duplicates are not registered if the array size fluctuates (previous implementation used size() + 1)
    getNextId() {
        let nextId = 1;
        while (this.datePairs.find(datePair => String(datePair.Id).startsWith('internal-') && datePair.Id === `internal-${nextId}`)) {
            nextId++;
        }
        return `internal-${nextId}`;
    }

    validateInputs() {
        const allInputs = this.template.querySelectorAll('lightning-input, lightning-textarea, lightning-combobox');
        let isValid = true;
    
        allInputs.forEach((input) => {
            if (!input.reportValidity()) {
                isValid = false;
            }
        });
    
        // Additional validation logic can be added here if needed
    
        return isValid;
    }

    sortDatePairs() {
        this.datePairs.sort((a, b) => {
            return new Date(a.startDate) - new Date(b.startDate);
        });
    }

    performChecks() {
        this.checkOverlappingPeriods();
        if(this.checkEmploymentGaps()){ //this.checkEmploymentHistory() && 
            this.hasFullEmploymentHistory = true;
        }
        else {
            this.hasFullEmploymentHistory = false;
        }
    }

    checkOverlappingPeriods() {
        for (let i = 0; i < this.datePairs.length; i++) {
            const current = this.datePairs[i];
            const previous = i > 0 ? this.datePairs[i - 1] : null;
            const next = i < this.datePairs.length - 1 ? this.datePairs[i + 1] : null;
    
            current.startDateClass = previous && new Date(current.startDate) < new Date(previous.endDate) ? 'slds-text-color_destructive' : '';
            current.endDateClass = next && new Date(current.endDate) > new Date(next.startDate) ? 'slds-text-color_destructive' : '';
        }
    }
    

    checkEmploymentHistory() {
        const currentDate = new Date();
        const startDateLimit = this.checkSinceDate;
        let dateRangeCheck = new Date(startDateLimit);
        while (dateRangeCheck <= currentDate) {
            const monthCovered = this.datePairs.some(datePair => {
                const pairStartDate = new Date(datePair.startDate);
                const pairEndDate = datePair.endDate ? new Date(datePair.endDate) : currentDate;
                let formattedDate = dateRangeCheck.getDate() + "/" + (dateRangeCheck.getMonth()+1) + "/" + dateRangeCheck.getFullYear();
    
                if(pairStartDate <= dateRangeCheck && pairEndDate >= dateRangeCheck){
                    console.log(`Date ${formattedDate} is covered by range ${pairStartDate} to ${pairEndDate}`);
                    return true;
                } else {
                    console.log(`Date ${formattedDate} is NOT covered by range ${pairStartDate} to ${pairEndDate}`);
                }
            });
    
            if (!monthCovered) {
                console.log(`Month starting ${dateRangeCheck} is not covered by any date pair.`);
                return false;
            }
            dateRangeCheck.setMonth(dateRangeCheck.getMonth() + 1);
        }
        return true;
    }

    checkEmploymentGaps() {
        if (!this.datePairs || this.datePairs.length === 0) {
            // No datePairs to check, return true
            return true;
        }
        const currentDate = new Date();
        const startDateLimit = new Date(this.checkSinceDate);
        let latestEndDate = startDateLimit;
    
        // Check earliest start date is within `checkGapDuration` of `startDateLimit`
        const earliestStartDate = new Date(this.datePairs[0].startDate);
        startDateLimit.setDate(startDateLimit.getDate() + this.checkGapDuration);
        if (earliestStartDate > startDateLimit) {
            console.log("The earliest employment start date is not within the allowed gap duration from the check start date.");
            return false;
        }
        
        // Iterate over datePairs
        for (let i = 0; i < this.datePairs.length - 1; i++) {
            const pairEndDate = this.datePairs[i].endDate ? new Date(this.datePairs[i].endDate) : currentDate;
            
            const dateWithin = new Date(pairEndDate);
            dateWithin.setDate(dateWithin.getDate() + this.checkGapDuration);
            
            if(pairEndDate > latestEndDate){
                latestEndDate = pairEndDate;
            }
    
            // Check if a pair overlaps or starts within `checkGapDuration` of the end date of the current pair
            const isCovered = this.datePairs.some((datePair, index) => {
                if (index === i) return false;  // skip the current pair
                const nextPairStartDate = new Date(datePair.startDate);
                const nextPairEndDate = datePair.endDate ? new Date(datePair.endDate) : currentDate;
                // check if the next pair has not ended before the `dateWithin` and either starts within the `dateWithin` or overlaps with current pair
                return nextPairEndDate >= pairEndDate && (nextPairStartDate <= dateWithin || (nextPairStartDate <= pairEndDate && nextPairEndDate >= pairEndDate));
            });
    
            if (!isCovered) {
                console.log("Gap is found in employment history.");
                return false;
            }
        }
    
        // Check latest end date is within `checkGapDuration` of currentDate
        const lastPair = this.datePairs[this.datePairs.length - 1];
        const lastEndDate = lastPair.endDate ? new Date(lastPair.endDate) : currentDate;
        if(lastEndDate > latestEndDate){
            latestEndDate = lastEndDate;
        }
        currentDate.setDate(currentDate.getDate() - this.checkGapDuration);
        if (latestEndDate < currentDate) {
            console.log("The latest employment end date is not within the allowed gap duration from today's date.");
            return false;
        }
    
        return true;
    }
    
    


    

    handleCancel() {
        // Reset all input fields and edited record ID
        this.resetInputs();
        this.editedRecordId = null;
        this.toggleMode();
    }

    toggleMode() {
        this.isInputMode = !this.isInputMode;
    }

    handleRowAction(event) {
        const action = event.detail.action;
        const row = event.detail.row;

        switch (action.name) {
            case 'edit':
                this.editRecord(row);
                break;
            case 'delete':
                this.deleteRow(row);
                break;
            default:
                break;
        }
    }

    editRecord(row) {
        // Assign the row values to input fields
        this.employer = row.employer;
        this.jobTitle = row.jobTitle;
        this.jobDuties = row.jobDuties;
        this.reasonForLeaving = row.reasonForLeaving;
        this.startDate = row.startDate;
        this.endDate = row.endDate;
        this.isCurrentRole = !row.endDate;

        this.streetAddress = row.streetAddress;
        this.city = row.city;
        this.county = row.county;
        this.country = row.country;
        this.zipCode = row.zipCode;

        // Store the edited record ID
        this.editedRecordId = row.Id;

        // Switch to input mode
        this.isInputMode = true;
    }

    deleteRow(row) {
        const rowIndex = this.datePairs.findIndex((r) => r.Id === row.Id);
        if (rowIndex !== -1) {
            this.datePairs.splice(rowIndex, 1);
            this.datePairs = [...this.datePairs];
        }
        this.performChecks();
    }

    resetInputs() {
        this.employer = '';
        this.jobTitle = '';
        this.jobDuties = '';
        this.reasonForLeaving = '';
        this.startDate = '';
        this.endDate = '';
        this.streetAddress = '';
        this.city = '';
        this.county = '';
        this.country = '';
        this.zipCode = '';
    }

    saveEmploymentHistory() {

        let historyDataForUpdate = this.compareHistoryAndDatePairs();

        saveEmploymentHistoryData({
            accountId: this.accountId,
            workHistoryJson: JSON.stringify(historyDataForUpdate),
            opportunityId: this.opportunityId
        })
        .then(result => {
            let deserializedResult = JSON.parse(result); // Deserialize the result
            if (deserializedResult) {    
                this.showToast('Success', 'Employment history saved successfully.', 'success');
                this.updateRecordIds(deserializedResult);
            } else {
                this.showToast('Error', 'An error occurred while saving employment history.', 'error');
            }
        })
        .catch(error => {
            console.error('Error saving employment history:', error);
            this.showToast('Error', 'An error occurred while saving employment history.', 'error');
        });
    }

    updateRecordIds(updatedRecords) {
        this.datePairs = this.datePairs.filter(datePair => {
            let foundRecord = updatedRecords.find(record => record.Id === datePair.Id);
            if (foundRecord) {
                datePair.Id = foundRecord.editedRecordId;
                datePair.editedRecordId = foundRecord.editedRecordId;
            }
            // If not marked to delete, include it in the resulting datePairs array
            return true;
        });

        this.historyData = this.historyData.filter((historyItem) => {
            return this.datePairs.some(
                (datePair) => datePair.editedRecordId === historyItem.Id
            );
        });
    }
    
    compareHistoryAndDatePairs() {
        let combinedList = [...this.datePairs];
        
        if(!this.historyData || this.historyData.length === 0){
            return combinedList;
        }
        this.historyData.forEach((historyItem) => {
            let isPresentInDatePairs = this.datePairs.some(
                (datePair) => datePair.editedRecordId === historyItem.Id
            );
    
            if (!isPresentInDatePairs) {
                combinedList.push({
                    Id: historyItem.Id,
                    editedRecordId: historyItem.Id,
                    toDelete: true
                });
            }
        });
    
        return combinedList;
    }
    

    

    showToast(title, message, variant) {
        try {
            //Utilising custom LWC for toast due to context of running as LWC inside screen flow in customer community, standard toast approach doesn't display
            this.template.querySelector('c-flow-toast').showToast(title,variant,message,'utility:warning',10000);
        } catch (error) {
            console.error(error);
        }
    }
}