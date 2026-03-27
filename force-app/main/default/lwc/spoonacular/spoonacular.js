import { LightningElement, track } from 'lwc';
import getRecepy from '@salesforce/apex/SpoonacularIntegration.makeCallout';

export default class Spoonacular extends LightningElement {

    @track allRecipes = [];
    @track filteredRecipes = [];
    @track visibleRecipes = [];

    searchKey = '';
    page = 1;
    pageSize = 4;

    connectedCallback() {
        this.loadRecipes();
    }

    loadRecipes() {
        getRecepy()
            .then(result => {
                this.allRecipes = result;
                this.filteredRecipes = result;
                this.updatePagination();
            })
            .catch(error => {
                console.error(error);
            });
    }

    handleSearch(event) {
        this.searchKey = event.target.value.toLowerCase();

        this.filteredRecipes = this.allRecipes.filter(item =>
            item.title.toLowerCase().includes(this.searchKey)
        );

        this.page = 1;
        this.updatePagination();
    }

    @track selectedRecipe;

viewRecipe(event) {
    const id = event.target.dataset.id;

    this.selectedRecipe = this.allRecipes.find(r => r.id == id);
}

    updatePagination() {
        const start = (this.page - 1) * this.pageSize;
        const end = start + this.pageSize;

        this.visibleRecipes = this.filteredRecipes.slice(start, end);
    }

    nextPage() {
        if (this.page * this.pageSize < this.filteredRecipes.length) {
            this.page++;
            this.updatePagination();
        }
    }

    prevPage() {
        if (this.page > 1) {
            this.page--;
            this.updatePagination();
        }
    }
    closeModal() {
        this.selectedRecipe = null;
    }
}
