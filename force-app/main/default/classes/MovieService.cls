public with sharing class MovieService {

    public class MovieListWrapper{
        @AuraEnabled public List<MovieItem> Search;
    }

    public class MovieItem{
        @AuraEnabled public String Title;
        @AuraEnabled public String Year;
        @AuraEnabled public String imdbID;
        @AuraEnabled public String Poster;
    }

    public class MovieWrapper{
        @AuraEnabled public String Title;
        @AuraEnabled public String Year;
        @AuraEnabled public String imdbRating;
        @AuraEnabled public String Poster;
        @AuraEnabled public String Genre;
        @AuraEnabled public String Actors;
        @AuraEnabled public String Plot;
    }

    @AuraEnabled(cacheable=true)
    public static MovieListWrapper searchMovies(String keyword){

        String apiKey = '76680b2e';

        String endpoint = 'https://www.omdbapi.com/?s=' + 
            EncodingUtil.urlEncode(keyword, 'UTF-8') + 
            '&apikey=' + apiKey;

        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');

        HttpResponse res = http.send(req);

        return (MovieListWrapper) JSON.deserialize(res.getBody(), MovieListWrapper.class);
    }

    @AuraEnabled(cacheable=true)
    public static MovieWrapper getMovieById(String imdbId){

        String apiKey = '76680b2e';

        String endpoint = 'https://www.omdbapi.com/?i=' + imdbId + '&apikey=' + apiKey;

        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');

        HttpResponse res = http.send(req);

        return (MovieWrapper) JSON.deserialize(res.getBody(), MovieWrapper.class);
    }

    // Save a new movie to Salesforce
    @AuraEnabled
    public static String saveMovie(String title, String year, String genre,
                                    String actors, String plot, 
                                    String poster, String imdbRating) {
        Movie__c movie = new Movie__c();
        movie.Title__c      = title;
        movie.Year__c       = year;
        movie.Genre__c      = genre;
        movie.Actors__c     = actors;
        movie.Plot__c       = plot;
        movie.Poster__c     = poster;
        movie.IMDB_Rating__c = imdbRating;

        insert movie;
        return movie.Id;
    }

    // Fetch all saved movies from Salesforce
    @AuraEnabled(cacheable=true)
    public static List<Movie__c> getSavedMovies() {
        return [
            SELECT Id, Title__c, Year__c, Genre__c, 
                Actors__c, Plot__c, Poster__c, IMDB_Rating__c
            FROM Movie__c
            ORDER BY CreatedDate DESC
        ];
    }
}