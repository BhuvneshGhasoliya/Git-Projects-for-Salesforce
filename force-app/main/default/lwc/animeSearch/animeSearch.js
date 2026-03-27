import { LightningElement, track } from 'lwc';
import searchAnime from '@salesforce/apex/AnimeAppApiCall.searchAnime';

export default class AnimeSearch extends LightningElement {
     @track animeList = [];
    searchKey = '';

    handleChange(event) {
        this.searchKey = event.target.value;
    }

   handleSearch() {
    if(this.searchKey){
        searchAnime({ keyword: this.searchKey })
            .then(result => {

                this.animeList = result.map(item => {
                    return {
                        id: item.mal_id,
                        title: item.title,
                        image: item.images?.jpg?.image_url,
                        episodes: item.episodes,
                        score: item.score,
                        status: item.status,
                        synopsis: item.synopsis
                    };
                });

            })
            .catch(error => {
                console.error(error);
            });
    }
}
}