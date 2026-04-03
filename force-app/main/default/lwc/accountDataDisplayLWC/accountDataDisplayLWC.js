import { LightningElement, wire } from 'lwc';
import getAccounts from '@salesforce/apex/AccountDataDisplay.getAccounts';

const columns = [
    { label: 'Account Id', fieldName: 'Id' },
    { label: 'Name', fieldName: 'Name' },
    { label: 'Phone', fieldName: 'Phone', type: 'phone' },
];

export default class AccountDataDisplayLWC extends LightningElement {
    accounts;
    error;
    columns = columns;

    @wire(getAccounts)
    wiredAccount({ data, error }) {
        if (data) {
            this.accounts = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.accounts = undefined;
        }
    }

    get hasData() {
        return this.accounts && this.accounts.length > 0;
    }
}