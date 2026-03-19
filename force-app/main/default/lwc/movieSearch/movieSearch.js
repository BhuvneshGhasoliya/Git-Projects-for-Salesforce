import { LightningElement, track } from 'lwc';
import searchMovies   from '@salesforce/apex/MovieService.searchMovies';
import getMovieById   from '@salesforce/apex/MovieService.getMovieById';
import saveMovie      from '@salesforce/apex/MovieService.saveMovie';
import getSavedMovies from '@salesforce/apex/MovieService.getSavedMovies';

export default class MovieSearch extends LightningElement {

    // ── EXISTING (unchanged) ──────────────────────────
    @track keyword = '';
    @track movieList = [];
    @track searchResults = [];
    @track movieData;
    @track mode = 'default'; // 'default' | 'results' | 'detail' | 'add' | 'saved'

    connectedCallback() {
        searchMovies({ keyword: 'batman' })
            .then(result => {
                this.movieList = result.Search || [];
            });
    }

    handleChange(event) {
        this.keyword = event.target.value;
    }

    handleSearch() {
        if (this.keyword) {
            searchMovies({ keyword: this.keyword })
                .then(result => {
                    this.searchResults = result.Search || [];
                    this.mode = 'results';
                })
                .catch(error => console.error(error));
        }
    }

    handleCardClick(event) {
        const imdbId = event.currentTarget.dataset.id;
        getMovieById({ imdbId })
            .then(movie => {
                this.movieData = movie;
                this.mode = 'detail';
            })
            .catch(error => console.error(error));
    }

    handleBack() {
        this.mode = this.mode === 'detail' ? 'results' : 'default';
    }

    get isDefault()  { return this.mode === 'default'; }
    get isResults()  { return this.mode === 'results'; }
    get isDetail()   { return this.mode === 'detail'; }
    get activeList() { return this.isDefault ? this.movieList : this.searchResults; }

    // ── NEW (added) ───────────────────────────────────
    @track savedMovies = [];
    @track saveSuccess = false;
    @track form = {
        title: '', year: '', genre: '',
        actors: '', plot: '', poster: '', imdbRating: ''
    };

    get isAddForm() { return this.mode === 'add'; }
    get isSaved()   { return this.mode === 'saved'; }
    get hasSaved()  { return this.savedMovies && this.savedMovies.length > 0; }

    // Save movie currently open in detail view → Salesforce
    handleSaveCurrentMovie() {
        saveMovie({
            title:      this.movieData.Title,
            year:       this.movieData.Year,
            genre:      this.movieData.Genre,
            actors:     this.movieData.Actors,
            plot:       this.movieData.Plot,
            poster:     this.movieData.Poster,
            imdbRating: this.movieData.imdbRating
        })
        .then(() => {
            this.saveSuccess = true;
            setTimeout(() => { this.saveSuccess = false; }, 3000);
        })
        .catch(error => console.error(error));
    }

    // Open manual add form
    handleOpenAddForm() {
        this.form = { title: '', year: '', genre: '', actors: '', plot: '', poster: '', imdbRating: '' };
        this.mode = 'add';
    }

    // Handle form field changes
    handleFormChange(event) {
        const field = event.target.dataset.field;
        this.form = { ...this.form, [field]: event.target.value };
    }

    // Submit manual add form
    handleFormSubmit() {
        saveMovie({
            title:      this.form.title,
            year:       this.form.year,
            genre:      this.form.genre,
            actors:     this.form.actors,
            plot:       this.form.plot,
            poster:     this.form.poster,
            imdbRating: this.form.imdbRating
        })
        .then(() => {
            this.saveSuccess = true;
            this.loadSavedMovies();
            this.mode = 'saved';
            setTimeout(() => { this.saveSuccess = false; }, 3000);
        })
        .catch(error => console.error(error));
    }

    // View saved movies
    handleViewSaved() {
        this.loadSavedMovies();
        this.mode = 'saved';
    }

    loadSavedMovies() {
        getSavedMovies()
            .then(result => { this.savedMovies = result; })
            .catch(error => console.error(error));
    }
}