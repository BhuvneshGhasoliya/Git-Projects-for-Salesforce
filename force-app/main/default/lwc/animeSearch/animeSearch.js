import { LightningElement, track } from 'lwc';
import searchAnime from '@salesforce/apex/AnimeAppApiCall.searchAnime';
import getTopAnime from '@salesforce/apex/AnimeAppApiCall.getTopAnime';

const STATUS_MAP = {
    'Currently Airing': { label: 'Airing',    cls: 'badge badge-airing'   },
    'Finished Airing':  { label: 'Finished',  cls: 'badge badge-finished' },
    'Not yet aired':    { label: 'Upcoming',  cls: 'badge badge-upcoming' },
};

export default class AnimeSearch extends LightningElement {

    // ─── State ───────────────────────────────────────────────────────────────
    @track animeList     = [];
    @track displayedAnime = [];
    @track selectedAnime  = null;

    searchKey    = '';
    currentPage  = 1;
    totalPages   = 1;
    currentSort  = 'score';
    activeTab    = 'top';   // 'search' | 'top'

    isLoading  = false;
    hasError   = false;
    errorMessage = '';
    showModal  = false;

    // ─── Lifecycle ───────────────────────────────────────────────────────────
    connectedCallback() {
        this.loadTopAnime();
    }

    // ─── Computed getters ────────────────────────────────────────────────────
    get isSearchTab()   { return this.activeTab === 'search'; }
    get searchTabClass(){ return this.activeTab === 'search' ? 'tab tab-active' : 'tab'; }
    get topTabClass()   { return this.activeTab === 'top'    ? 'tab tab-active' : 'tab'; }

    get showResults()   { return !this.isLoading && this.displayedAnime.length > 0; }
    get showEmpty()     { return !this.isLoading && !this.hasError && this.animeList.length === 0 && (this.activeTab === 'search'); }
    get showPagination(){ return this.totalPages > 1 && !this.isLoading; }

    get isFirstPage()   { return this.currentPage <= 1; }
    get isLastPage()    { return this.currentPage >= this.totalPages; }

    get resultSummary() {
        return this.activeTab === 'top'
            ? `Top Anime — Page ${this.currentPage} of ${this.totalPages}`
            : `${this.animeList.length} result${this.animeList.length !== 1 ? 's' : ''}`;
    }

    // ─── Tab handlers ────────────────────────────────────────────────────────
    handleTabSearch() {
        this.activeTab   = 'search';
        this.animeList   = [];
        this.displayedAnime = [];
        this.currentPage = 1;
        this.totalPages  = 1;
        this.hasError    = false;
    }

    handleTabTop() {
        this.activeTab   = 'top';
        this.currentPage = 1;
        this.loadTopAnime();
    }

    // ─── Search ──────────────────────────────────────────────────────────────
    handleChange(event) {
        this.searchKey = event.target.value;
    }

    handleKeyUp(event) {
        if (event.key === 'Enter') this.handleSearch();
    }

    handleSearch() {
        if (!this.searchKey || !this.searchKey.trim()) return;
        this.currentPage = 1;
        this.totalPages  = 1;
        this.animeList   = [];
        this.fetchSearch(1);
    }

    fetchSearch(page) {
        this.isLoading = true;
        this.hasError  = false;

        searchAnime({ keyword: this.searchKey, pageNum: page })
            .then(result => {
                const items = Array.isArray(result.data) ? result.data : [];
                this.animeList   = this.enrichAnime(items);
                this.totalPages  = result.lastPage  || 1;
                this.currentPage = result.currentPage || page;
                this.applySort();
            })
            .catch(err => {
                this.hasError    = true;
                this.errorMessage = this.extractError(err);
                this.animeList   = [];
                this.displayedAnime = [];
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // ─── Top Anime ───────────────────────────────────────────────────────────
    loadTopAnime() {
        this.isLoading = true;
        this.hasError  = false;

        getTopAnime({ pageNum: this.currentPage })
            .then(result => {
                const raw  = Array.isArray(result.data) ? result.data : [];
                const pag  = result.pagination || {};
                this.totalPages = pag.last_visible_page || 1;
                this.animeList  = this.enrichAnime(raw);
                this.applySort();
            })
            .catch(err => {
                this.hasError    = true;
                this.errorMessage = this.extractError(err);
                this.animeList   = [];
                this.displayedAnime = [];
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // ─── Enrichment ──────────────────────────────────────────────────────────
    enrichAnime(items) {
        return items.map(item => {
            // Support both flat (from searchAnime) and raw (from getTopAnime)
            const images = item.images?.jpg || item.images?.jpg;
            const imgUrl  = item.image      || images?.image_url       || null;
            const imgLg   = item.imageLarge || images?.large_image_url || imgUrl;

            const statusInfo = STATUS_MAP[item.status] || { label: item.status || '', cls: 'badge badge-finished' };

            const genreList = Array.isArray(item.genres)
                ? item.genres.map(g => (typeof g === 'object' ? g.name : g)).join(', ')
                : (item.genres || '');

            return {
                mal_id:      item.mal_id,
                title:       item.title       || 'Unknown Title',
                title_en:    item.title_english || item.title_en || null,
                image:       imgUrl,
                imageLarge:  imgLg,
                score:       item.score       ? parseFloat(item.score).toFixed(1) : null,
                episodes:    item.episodes    || null,
                status:      item.status      || '',
                statusLabel: statusInfo.label,
                statusClass: statusInfo.cls,
                type:        item.type        || null,
                synopsis:    item.synopsis    || 'No synopsis available.',
                rank:        item.rank        || null,
                popularity:  item.popularity  || null,
                members:     item.members     || null,
                year:        item.year        || null,
                season:      item.season      || null,
                duration:    item.duration    || null,
                genres:      genreList,

                // Display helpers
                episodesDisplay:  item.episodes    ? String(item.episodes)                                : 'N/A',
                rankDisplay:      item.rank         ? '#' + item.rank                                      : 'N/A',
                popularityDisplay:item.popularity   ? '#' + item.popularity                                : 'N/A',
                membersDisplay:   item.members      ? Number(item.members).toLocaleString()                : 'N/A',
                durationDisplay:  item.duration     || 'N/A',
                seasonDisplay:    item.season
                    ? item.season.charAt(0).toUpperCase() + item.season.slice(1) + (item.year ? ' ' + item.year : '')
                    : 'N/A',
            };
        });
    }

    // ─── Sort ────────────────────────────────────────────────────────────────
    handleSortChange(event) {
        this.currentSort = event.target.value;
        this.applySort();
    }

    applySort() {
        const sorted = [...this.animeList].sort((a, b) => {
            if (this.currentSort === 'score')    return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
            if (this.currentSort === 'rank')     return (a.rank || 9999) - (b.rank || 9999);
            if (this.currentSort === 'title')    return (a.title || '').localeCompare(b.title || '');
            if (this.currentSort === 'episodes') return (b.episodes || 0) - (a.episodes || 0);
            return 0;
        });
        this.displayedAnime = sorted;
    }

    // ─── Pagination ──────────────────────────────────────────────────────────
    handlePrevPage() {
        if (this.isFirstPage) return;
        this.currentPage--;
        this.changePage();
    }

    handleNextPage() {
        if (this.isLastPage) return;
        this.currentPage++;
        this.changePage();
    }

    changePage() {
        if (this.activeTab === 'top') {
            this.loadTopAnime();
        } else {
            this.fetchSearch(this.currentPage);
        }
    }

    // ─── Modal ───────────────────────────────────────────────────────────────
    handleCardClick(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const anime = this.animeList.find(a => a.mal_id === id);
        if (anime) {
            this.selectedAnime = anime;
            this.showModal = true;
        }
    }

    handleOverlayClick(event) {
        if (event.target.classList.contains('modal-overlay')) {
            this.closeModal();
        }
    }

    closeModal() {
        this.showModal     = false;
        this.selectedAnime = null;
    }

    // ─── Utilities ───────────────────────────────────────────────────────────
    extractError(err) {
        return err?.body?.message
            || err?.message
            || 'An unexpected error occurred. Please try again.';
    }
}