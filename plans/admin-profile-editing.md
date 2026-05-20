# Admin Profile Editing Implementation Plan

## Objective
Add full profile editing capabilities for admins directly on the user profile page. Admins will be able to edit every field that exists on user profiles, including all questions from registration and edit profile screens.

## Background
Currently [`app/admin/user/[id].tsx`](app/admin/user/[id].tsx) only displays user information in read-only mode. Admins cannot modify user profile data directly from the admin dashboard.

## Implementation Plan

### 1. UI Layout Design
Add an **Edit Profile** button at the top of the admin user details page. When activated:
- Switch from read-only view to editable form mode
- Maintain existing sections and field groupings
- Add save/cancel buttons at the bottom of the screen
- Keep the same visual styling and layout structure

### 2. Fields to make editable
All 47 profile fields will be editable:

| Category | Fields |
|---|---|
| Basic Information | First name, Last name, Email, Age, Gender, County, City, Nationality, Country, Religion, Marital status, Profession, Number of children, Believe in marriage, Physical disability, Disability details, Critical illness, Illness details, Date of birth |
| Physical Attributes | Height ft, Height in, Weight kg, Body type, Complexion, Teeth state, HIV status, Blood group |
| Lifestyle | Smoking, Alcohol consumption, Has pets, Can relocate |
| Relationship Preferences | Sexual orientation, Relationship goal, Want kids, Open to dating with children, Can date with disability, Relationship perspective |
| Profile Questions | Introduce yourself, Describe appearance, Looking for appearance, Do not contact me if, What I hope to find, What to expect from me, My imperfections, Things I don't do |
| Account Status | Is active, Has paid, Payment status |

### 3. Component Structure
```
AdminUserDetailsScreen
├── View Mode (current implementation)
└── Edit Mode
    ├── Reusable form fields matching edit-profile.tsx
    ├── Form state management
    ├── Save button with loading state
    ├── Cancel button to revert changes
    └── Validation logic
```

### 4. Implementation Steps

✅ **Step 1:** Add edit mode state toggle
- Add `isEditing` boolean state
- Add Edit Profile button to header
- Add Cancel button when in edit mode

✅ **Step 2:** Create reusable input components
- Extract common input patterns from [`app/edit-profile.tsx`](app/edit-profile.tsx)
- Create text inputs, numeric inputs, and textarea components
- Maintain consistent styling with existing admin UI

✅ **Step 3:** Convert static rows to editable fields
- Replace each static `Text` value with `TextInput` when in edit mode
- Maintain field grouping and section structure
- Preserve all existing labels and layout

✅ **Step 4:** Add form state management
- Create `formData` state initialized with user data
- Add `handleFieldChange` function
- Track dirty fields to only send modified values

✅ **Step 5:** Implement save functionality
- Add save button with loading indicator
- Implement Supabase update query with admin permissions
- Add success/error feedback with Alert dialogs
- Refresh user data after successful save

✅ **Step 6:** Add validation and safeguards
- Required field validation
- Numeric field validation
- Confirmation dialog before saving changes
- Cancel functionality to discard unsaved changes

### 5. Database Permissions
Ensure admin RLS policies allow updating all user profile fields. Admins must have unrestricted write access to the `users` table.

### 6. UX Considerations
- Maintain the exact same layout when switching between view/edit modes
- Highlight editable fields with subtle border styling
- Disable save button when no changes have been made
- Show confirmation message after successful save
- Allow canceling edits at any time without losing original data

### 7. Files to Modify
1. [`app/admin/user/[id].tsx`](app/admin/user/[id].tsx) - main implementation
2. (Optional) Create shared form field components if patterns repeat across screens