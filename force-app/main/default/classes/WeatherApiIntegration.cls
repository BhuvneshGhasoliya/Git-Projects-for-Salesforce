public with sharing class WeatherApiIntegration {

    // Wrapper to hold each temperature record
    // 'time' is reserved in Apex — we parse manually and expose as timeVal
    public class TemperatureRecord {
        @AuraEnabled public String  timeVal;  // sourced from JSON key "time"
        @AuraEnabled public Decimal station;
        @AuraEnabled public Decimal land;
    }

    @AuraEnabled(cacheable=true)
    public static List<TemperatureRecord> getTemperatureData() {
        Http http = new Http();
        HttpRequest req = new HttpRequest();
       req.setEndpoint('https://global-warming.org/api/temperature-api');
        req.setMethod('GET');
        req.setTimeout(20000);

        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            // Use deserializeUntyped so we control field mapping
            Map<String, Object> root    = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            List<Object>        rawList = (List<Object>) root.get('result');

            List<TemperatureRecord> records = new List<TemperatureRecord>();
            for (Object item : rawList) {
                Map<String, Object> row = (Map<String, Object>) item;
                TemperatureRecord rec   = new TemperatureRecord();
                rec.timeVal = String.valueOf(row.get('time'));
                rec.station = row.get('station') != null
                    ? Decimal.valueOf(String.valueOf(row.get('station'))) : null;
                rec.land    = row.get('land') != null
                    ? Decimal.valueOf(String.valueOf(row.get('land'))) : null;
                records.add(rec);
            }
            return records;

        } else {
            throw new AuraHandledException(
                'API Error ' + res.getStatusCode() + ': ' + res.getStatus()
            );
        }
    }
}