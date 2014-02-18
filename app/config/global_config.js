var SMC_CONFIG = {
    domain: 'jinyangz6',
    bosh: 'http://localhost:7070/http-bind/',
    groupDefinition: {
        assignment: {
            idField: 'name',
            contactsField: 'operators',
            contactDefinition: 'operator'
        }
    },
    contactDefinition: {
        contacts: {
            idField: 'contact.name',
            accountField: 'operator.id',
            emailField: 'email'
        },
        operator: {
            idField: 'name',
            accountField: 'name',
            emailField: 'email'
        }
    },
    objectDefinition: {
        cm3r: {
            displayIdField: 'number',
            descriptionField: 'brief.description',
            objectIdField: 'number',
            smObjectType: 'change',
            canAddConversation: true,
            relatedObjectInfo: [
                {
                    definition: 'device',
                    fieldName: 'assets',
                    reason: 'Affected CI',
                    showRelatedUsers: true,
                    maxItem: 5
                },
                {
                    definition: 'device',
                    fieldName: 'affected.item',
                    reason: 'Affected Service',
                    showRelatedUsers: true,
                    maxItem: 5
                }
            ],
            relatedContactInfo: [
                {
                    definition: 'contacts',
                    fieldName: 'requested.by',
                    reason: 'Initiator'
                },
                {
                    definition: 'operator',
                    fieldName: 'coordinator',
                    reason: 'Change Coordinator'
                }
            ],
            relatedGroupInfo: [
                {
                    definition: 'assignment',
                    fieldName: 'assign.dept',
                    reason: 'Assignment Group'
                }
            ]
        },
        cm3t: {
            displayIdField: 'number',
            descriptionField: 'brief.desc',
            objectIdField: 'number',
            smObjectType: 'changetask',
            canAddConversation: true,
            relatedObjectInfo: {
                definition: 'device',
                fieldName: 'asset',
                reason: 'Affected CI',
                showRelatedUsers: true,
                maxItem: 5
            },
            relatedGroupInfo: {
                definition: 'assignment',
                fieldName: 'assign.dept',
                reason: 'Assignment group'
            }
        },
        probsummary: {
            displayIdField: 'number',
            descriptionField: 'brief.description',
            objectIdField: 'number',
            smObjectType: 'incident',
            globalIdField: 'external.process.reference',
            btoObjectType: 'Event',
            canAddConversation: true,
            relatedObjectInfo: [
                {
                    definition: 'device',
                    fieldName: 'logical.name',
                    reason: 'Affected CI',
                    showRelatedUsers: true,
                    maxItem: 5
                },
                {
                    definition: 'device',
                    fieldName: 'affected.item',
                    reason: 'Affected Service',
                    showRelatedUsers: true,
                    maxItem: 5
                }
            ],
            relatedContactInfo: [
                {
                    definition: 'contacts',
                    fieldName: 'contact.name',
                    reason: 'Contact'
                },
                {
                    definition: 'operator',
                    fieldName: 'assignee.name',
                    reason: 'Assignee'
                }
            ],
            relatedGroupInfo: [
                {
                    definition: 'assignment',
                    fieldName: 'assignment',
                    reason: 'Assignment Group'
                }
            ]
        },
        incidents: {
            displayIdField: 'incident.id',
            descriptionField: 'title',
            objectIdField: 'incident.id',
            smObjectType: 'interaction',
            canAddConversation: true,
            relatedObjectInfo: {
                definition: 'device',
                fieldName: 'logical.name',
                reason: 'CI owner',
                showRelatedUsers: true,
                maxItem: 5
            },
            relatedObjectInfo: {
                definition: 'device',
                fieldName: 'affected.item',
                reason: 'Service Owner',
                showRelatedUsers: true,
                maxItem: 5
            },
            relatedContactInfo: {
                definition: 'contacts',
                fieldName: 'callback.contact',
                reason: 'Contact'
            }
        },
        device: {
            displayIdField: 'logical.name',
            descriptionField: 'logical.name',
            objectIdField: 'logical.name',
            smObjectType: 'ConfigurationItem',
            globalIdField: 'ucmdb.id',
            btoObjectType: 'ConfigurationItem',
            canAddConversation: false,
            relatedContactInfo: [
                {
                    definition: 'contacts',
                    fieldName: 'contact.name',
                    reason: 'Primary Contact'
                }
            ],
            relatedGroupInfo: [
                {
                    definition: 'assignment',
                    fieldName: 'assignment',
                    reason: 'Config admin group'
                }
            ]
        }
    }
};