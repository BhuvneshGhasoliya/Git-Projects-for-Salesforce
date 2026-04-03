public with sharing class AccountDataDisplay {
    @AuraEnabled(cacheable = true)
    public static List<Account> getAccounts(){
        return [SELECT Id, Name, Phone FROM Account];
    }
}