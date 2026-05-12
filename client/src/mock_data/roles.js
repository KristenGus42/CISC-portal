export const roles = [
    {
        name: "admin",
        permission: [
            "canAccessAllPages"
        ]
    },
    {
        name: "staff",
        permission: [
            "canAccessCasesPage",
            "canAccessSchedulePage"
        ]
    },
    {
        name: "attorney",
        permission: [
            "canAccessSchedulePage"
        ]
    }
]