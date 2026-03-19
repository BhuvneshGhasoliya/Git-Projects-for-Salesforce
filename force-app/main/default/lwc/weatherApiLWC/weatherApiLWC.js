import { LightningElement, track } from 'lwc';
import getTemperatureData from '@salesforce/apex/WeatherApiIntegration.getTemperatureData';

const PAGE_SIZE = 15;

export default class WeatherApiLWC extends LightningElement {

    // ── State ──────────────────────────────────────────────────────────────
    @track allRecords   = [];
    @track isLoading    = false;
    @track error        = null;
    @track searchTerm   = '';
    @track activeFilter = 'all';   // 'all' | 'positive' | 'negative'
    @track sortCol      = 'timeVal';
    @track sortAsc      = true;
    @track currentPage  = 1;

    // ── Lifecycle ──────────────────────────────────────────────────────────
    connectedCallback() {
        this.loadData();
    }

    // ── Data Fetch ─────────────────────────────────────────────────────────
    loadData() {
        this.isLoading = true;
        this.error     = null;

        getTemperatureData()
            .then(data => {
                this.allRecords = data;
                this.currentPage = 1;
            })
            .catch(err => {
                this.error = err?.body?.message || err?.message || 'Unknown error';
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // ── Derived: filtered + sorted + paginated ─────────────────────────────
    get processedRecords() {
        let rows = [...this.allRecords];

        // 1. Search
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            rows = rows.filter(r => r.timeVal?.toString().includes(term));
        }

        // 2. Filter
        if (this.activeFilter === 'positive') {
            rows = rows.filter(r => parseFloat(r.land) > 0);
        } else if (this.activeFilter === 'negative') {
            rows = rows.filter(r => parseFloat(r.land) <= 0);
        }

        // 3. Sort
        const col = this.sortCol;
        rows.sort((a, b) => {
            const av = parseFloat(a[col]) || 0;
            const bv = parseFloat(b[col]) || 0;
            return this.sortAsc ? av - bv : bv - av;
        });

        // 4. Enrich UI fields
        const maxAbs = rows.reduce((m, r) => Math.max(m, Math.abs(parseFloat(r.land) || 0)), 0) || 1;

        return rows.map(r => {
            const land    = parseFloat(r.land)    || 0;
            const station = parseFloat(r.station) || 0;
            const warm    = land > 0;
            const pct     = Math.round((Math.abs(land) / maxAbs) * 100);
            return {
                time        : r.timeVal,
                displayYear : parseFloat(r.timeVal).toFixed(2),
                land        : land.toFixed(2),
                station     : station.toFixed(2),
                rowClass    : warm ? 'gw-row gw-row--warm' : 'gw-row gw-row--cool',
                landClass   : warm ? 'gw-td--pos' : 'gw-td--neg',
                stationClass: station > 0 ? 'gw-td--pos' : 'gw-td--neg',
                barStyle    : `width:${pct}%;background:${warm ? '#ef6c47' : '#4bc3e6'}`
            };
        });
    }

    get paginatedRecords() {
        const start = (this.currentPage - 1) * PAGE_SIZE;
        return this.processedRecords.slice(start, start + PAGE_SIZE);
    }

    // ── KPIs ───────────────────────────────────────────────────────────────
    get totalRecords()  { return this.allRecords.length; }
    get hasData()       { return !this.isLoading && this.allRecords.length > 0; }
    get hasFilteredData(){ return this.processedRecords.length > 0; }
    get filteredCount() { return this.processedRecords.length; }

    get latestLand() {
        if (!this.allRecords.length) return '–';
        const last = this.allRecords[this.allRecords.length - 1];
        return parseFloat(last.land).toFixed(2);
    }
    get latestStation() {
        if (!this.allRecords.length) return '–';
        const last = this.allRecords[this.allRecords.length - 1];
        return parseFloat(last.station).toFixed(2);
    }
    get yearRange() {
        if (!this.allRecords.length) return '–';
        const first = Math.floor(parseFloat(this.allRecords[0].timeVal));
        const last  = Math.floor(parseFloat(this.allRecords[this.allRecords.length - 1].timeVal));
        return `${first}–${last}`;
    }

    // ── Pagination ─────────────────────────────────────────────────────────
    get totalPages()  { return Math.max(1, Math.ceil(this.processedRecords.length / PAGE_SIZE)); }
    get isFirstPage() { return this.currentPage <= 1; }
    get isLastPage()  { return this.currentPage >= this.totalPages; }
    prevPage()        { if (!this.isFirstPage) this.currentPage--; }
    nextPage()        { if (!this.isLastPage)  this.currentPage++; }

    // ── Sort ───────────────────────────────────────────────────────────────
    get sortArrow() { return this.sortAsc ? '▲' : '▼'; }

    sortBy(event) {
        const col = event.currentTarget.dataset.col;
        if (this.sortCol === col) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortCol = col;
            this.sortAsc = true;
        }
        this.currentPage = 1;
    }

    // ── Filter / Search ────────────────────────────────────────────────────
    handleSearch(event) {
        this.searchTerm  = event.target.value;
        this.currentPage = 1;
    }

    handleFilter(event) {
        this.activeFilter = event.currentTarget.dataset.filter;
        this.currentPage  = 1;
    }

    // ── Button CSS classes ─────────────────────────────────────────────────
    get btnClassAll()      { return this._btn('all'); }
    get btnClassPositive() { return this._btn('positive'); }
    get btnClassNegative() { return this._btn('negative'); }
    _btn(f) { return `gw-filter-btn${this.activeFilter === f ? ' gw-filter-btn--active' : ''}`; }

    // ── Refresh icon spin ──────────────────────────────────────────────────
    get refreshIconClass() { return this.isLoading ? 'spin' : ''; }
}