import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import fieldSetFields from "@salesforce/apex/EmployeeTableController.getFieldSetFields";
import getEmployees from "@salesforce/apex/EmployeeTableController.getEmployees";
import updateEmployee from "@salesforce/apex/EmployeeTableController.updateEmployee";
import fa from '@salesforce/resourceUrl/fa';
import { loadStyle } from 'lightning/platformResourceLoader';

export default class EmployeeTable extends LightningElement {

    @track fields = [];
    @track empRecords = [];
    @track processedRecords = [];

    // ── Pagination state ──
    @track currentPage = 1;
    @track pageSize = 20;
    @track totalCount = 0;
    @track isLoading = false;

    sortField = null;
    sortDirection = null;
    faLoaded = false;

    // ── Computed pagination values ──
    get totalPages() {
        return Math.ceil(this.totalCount / this.pageSize);
    }

    get startRecord() {
        return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    }

    get endRecord() {
        return Math.min(this.currentPage * this.pageSize, this.totalCount);
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage >= this.totalPages;
    }

    // ── Generate page number buttons (show 5 around current) ──
    get pageNumbers() {
        const pages = [];
        const total = this.totalPages;
        let start = Math.max(1, this.currentPage - 2);
        let end = Math.min(total, start + 4);
        start = Math.max(1, end - 4);

        for (let i = start; i <= end; i++) {
            pages.push({
                number: i,
                cssClass: i === this.currentPage ? 'page-btn page-btn-active' : 'page-btn'
            });
        }
        return pages;
    }

    // ── Wire: load fields ──
    @wire(fieldSetFields)
    wiredFields({ data, error }) {
        if (data) {
            this.fields = data.map(field => ({
                ...field,
                sortIcon: 'fa fa-sort'
            }));
            this.loadRecords();
        }
        if (error) {
            console.error('Error loading fields:', error);
        }
    }

    // ── Imperative Apex call for records ──
    loadRecords() {
        if (!this.fields.length) return;

        this.isLoading = true;

        getEmployees({
            pageSize: this.pageSize,
            pageNumber: this.currentPage
        })
        .then(result => {
            this.empRecords = result.records;
            this.totalCount = result.totalCount;
            this.prepareRecords();
            this.isLoading = false;
        })
        .catch(error => {
            console.error('Error loading records:', JSON.stringify(error));
            this.isLoading = false;
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error loading records',
                message: error?.body?.message || 'Unknown error',
                variant: 'error'
            }));
        });
    }

    prepareRecords() {
        if (!this.fields.length || !this.empRecords.length) return;

        this.processedRecords = this.empRecords.map(record => {
            let values = this.fields.map(field => {
                const value = record[field.apiName] || '';
                const isStatus = field.apiName === 'Status__c';
                return {
                    key: field.apiName,
                    value: value,
                    isPicklist: field.fieldType === 'PICKLIST',
                    picklistValues: field.picklistValues || [],
                    isStatus: isStatus,
                    statusClass: isStatus
                        ? 'status-badge ' + (value === 'Active' ? 'status-active' : 'status-inactive')
                        : ''
                };
            });
            return {
                Id: record.Id,
                values: values,
                originalValues: JSON.parse(JSON.stringify(values)),
                isEditing: false
            };
        });
    }

    // ── Pagination handlers ──
    goToFirst() { this.currentPage = 1; this.loadRecords(); }
    goToLast()  { this.currentPage = this.totalPages; this.loadRecords(); }
    goToNext()  { if (!this.isLastPage)  { this.currentPage++; this.loadRecords(); } }
    goToPrev()  { if (!this.isFirstPage) { this.currentPage--; this.loadRecords(); } }

    goToPage(event) {
        const page = parseInt(event.currentTarget.dataset.page);
        if (page !== this.currentPage) {
            this.currentPage = page;
            this.loadRecords();
        }
    }

    handlePageSizeChange(event) {
        this.pageSize = parseInt(event.target.value);
        this.currentPage = 1; // reset to page 1
        this.loadRecords();
    }

    // ── Sort (client-side within current page) ──
    handleSort(event) {
        const fieldName = event.currentTarget.dataset.field;
        if (this.sortField === fieldName) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = fieldName;
            this.sortDirection = 'asc';
        }

        this.fields = this.fields.map(field => ({
            ...field,
            sortIcon: field.apiName === fieldName
                ? (this.sortDirection === 'asc' ? 'fa fa-sort-up' : 'fa fa-sort-down')
                : 'fa fa-sort'
        }));

        const dir = this.sortDirection === 'asc' ? 1 : -1;
        this.processedRecords = [...this.processedRecords].sort((a, b) => {
            const valA = a.values.find(v => v.key === fieldName)?.value || '';
            const valB = b.values.find(v => v.key === fieldName)?.value || '';
            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });
    }

    // ── Edit / Save / Cancel ──
    handleEdit(event) {
        const recordId = event.currentTarget.dataset.id;
        this.processedRecords = this.processedRecords.map(emp => ({
            ...emp,
            isEditing: emp.Id === recordId ? true : emp.isEditing
        }));
    }

    handleFieldChange(event) {
        const recordId = event.currentTarget.dataset.id;
        const fieldName = event.currentTarget.dataset.field;
        const newValue = event.currentTarget.value;

        this.processedRecords = this.processedRecords.map(emp => {
            if (emp.Id !== recordId) return emp;
            return {
                ...emp,
                values: emp.values.map(val =>
                    val.key === fieldName ? { ...val, value: newValue } : val
                )
            };
        });
    }

    handleSave(event) {
        const recordId = event.currentTarget.dataset.id;
        const emp = this.processedRecords.find(e => e.Id === recordId);

        const fieldValues = {};
        emp.values.forEach((val, i) => {
            if (val.value !== emp.originalValues[i].value) {
                fieldValues[val.key] = val.value;
            }
        });

        if (Object.keys(fieldValues).length === 0) {
            this.setEditMode(recordId, false);
            return;
        }

        updateEmployee({ recordId, fieldValues })
            .then(() => {
                this.setEditMode(recordId, false);
                this.updateOriginalValues(recordId);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: 'Record saved!',
                    variant: 'success'
                }));
            })
            .catch(error => {
                const errMsg = error?.body?.message || error?.message || 'Unknown error';
                console.error('Save error:', JSON.stringify(error));
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Save Failed',
                    message: errMsg,
                    variant: 'error',
                    mode: 'sticky'
                }));
            });
    }

    handleCancel(event) {
        const recordId = event.currentTarget.dataset.id;
        this.processedRecords = this.processedRecords.map(emp => {
            if (emp.Id !== recordId) return emp;
            return {
                ...emp,
                values: JSON.parse(JSON.stringify(emp.originalValues)),
                isEditing: false
            };
        });
    }

    setEditMode(recordId, mode) {
        this.processedRecords = this.processedRecords.map(emp => ({
            ...emp,
            isEditing: emp.Id === recordId ? mode : emp.isEditing
        }));
    }

    updateOriginalValues(recordId) {
        this.processedRecords = this.processedRecords.map(emp => {
            if (emp.Id !== recordId) return emp;
            return { ...emp, originalValues: JSON.parse(JSON.stringify(emp.values)) };
        });
    }

    renderedCallback() {
        if (this.faLoaded) return;
        this.faLoaded = true;
        loadStyle(this, fa + '/css/font-awesome.css')
            .catch(error => console.error(error));
    }
}