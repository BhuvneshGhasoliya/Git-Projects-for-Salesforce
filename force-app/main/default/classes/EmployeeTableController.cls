public with sharing class EmployeeTableController {

    public class FieldWrapper {
        @AuraEnabled public String label;
        @AuraEnabled public String apiName;
        @AuraEnabled public String fieldType;
        @AuraEnabled public List<String> picklistValues;

        public FieldWrapper(String label, String apiName, String fieldType, List<String> picklistValues) {
            this.label = label;
            this.apiName = apiName;
            this.fieldType = fieldType;
            this.picklistValues = picklistValues;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<FieldWrapper> getFieldSetFields() {
        List<FieldWrapper> fields = new List<FieldWrapper>();
        Schema.FieldSet fieldSet = Schema.SObjectType.Employee__c.FieldSets.Employee_Table;

        for (Schema.FieldSetMember f : fieldSet.getFields()) {
            String fieldType = String.valueOf(f.getType());
            List<String> picklistValues = new List<String>();

            if (fieldType == 'PICKLIST') {
                Schema.DescribeFieldResult fieldDesc =
                    Employee__c.SObjectType.getDescribe()
                    .fields.getMap()
                    .get(f.getFieldPath())
                    .getDescribe();

                for (Schema.PicklistEntry entry : fieldDesc.getPicklistValues()) {
                    if (entry.isActive()) {
                        picklistValues.add(entry.getValue());
                    }
                }
            }

            fields.add(new FieldWrapper(f.getLabel(), f.getFieldPath(), fieldType, picklistValues));
        }

        return fields;
    }

   @AuraEnabled(cacheable=true)
public static Map<String, Object> getEmployees(Integer pageSize, Integer pageNumber) {
    List<String> fieldList = new List<String>();
    Schema.FieldSet fieldSet = Schema.SObjectType.Employee__c.FieldSets.Employee_Table;

    for (Schema.FieldSetMember f : fieldSet.getFields()) {
        fieldList.add(f.getFieldPath());
    }

    Integer offset = (pageNumber - 1) * pageSize;

    String query = 'SELECT Id,' + String.join(fieldList, ',')
                 + ' FROM Employee__c'
                 + ' LIMIT :pageSize OFFSET :offset';

    // Total count for page calculation
    Integer totalCount = Database.countQuery('SELECT COUNT() FROM Employee__c');

    Map<String, Object> result = new Map<String, Object>();
    result.put('records', Database.query(query));
    result.put('totalCount', totalCount);

    return result;
}

   @AuraEnabled
public static void updateEmployee(String recordId, Map<String, Object> fieldValues) {
    try {
        Employee__c emp = new Employee__c(Id = recordId);

        for (String fieldName : fieldValues.keySet()) {
            Object val = fieldValues.get(fieldName);

            // Get the field type dynamically
            Schema.DisplayType fieldType = Employee__c.SObjectType
                .getDescribe()
                .fields.getMap()
                .get(fieldName)
                .getDescribe()
                .getType();

            if (val == null || String.valueOf(val).trim() == '') {
                emp.put(fieldName, null);
            } else if (fieldType == Schema.DisplayType.BOOLEAN) {
                emp.put(fieldName, Boolean.valueOf(val));
            } else if (fieldType == Schema.DisplayType.INTEGER) {
                emp.put(fieldName, Integer.valueOf(String.valueOf(val)));
            } else if (fieldType == Schema.DisplayType.DOUBLE ||
                       fieldType == Schema.DisplayType.CURRENCY ||
                       fieldType == Schema.DisplayType.PERCENT) {
                emp.put(fieldName, Decimal.valueOf(String.valueOf(val)));
            } else {
                // STRING, PICKLIST, EMAIL, PHONE, TEXTAREA etc.
                emp.put(fieldName, String.valueOf(val));
            }
        }

        update emp;

    } catch (DmlException e) {
        throw new AuraHandledException('DML Error: ' + e.getDmlMessage(0));
    } catch (Exception e) {
        throw new AuraHandledException('Error: ' + e.getMessage());
    }
}
}