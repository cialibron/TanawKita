# Synthetic simulation sheets

These CSVs are **new, separate demo sheets**. The app reads them as additive synthetic simulation records at startup; they do not replace the existing seed records. Existing saved records and user edits are preserved when the new rows are merged into local storage.

## Files

- `businesses.csv` — 5 fictional demo businesses, one each in Mandug, Buhangin, Puan (Talomo), Roxas Ave (Barangay 8-A) and Matina Crossing, with business model, approximate location, sample hiring status, job roles, and pay examples.
- `jobseekers.csv` — 2 fictional jobseeker profiles: Viola Co (19, 2nd-year BS Data Science student, part-time) and Ana Reyes (24, adult jobseeker in food service).

## Important simulation and privacy notes

- Every record is generated fiction. Names and business names do not represent verified people or registered businesses; accidental real-world name matches are possible.
- Do not treat the rows as CBMS, PESO, DTI, or other official records, nor as a sample statistically representative of Davao City.
- Coordinates are randomized offsets from public barangay center coordinates and are explicitly **approximate simulation points**, not real homes or storefront addresses.
- All multi-value fields use `|` as the separator (for example `Carpentry|Masonry`). CSV quoting still follows standard CSV rules.
- `verification_status_demo` is a simulated state, not a real verification result. Pay and hiring information is fictional test content.

## Main columns

### `businesses.csv`

- Identity and type: `business_id`, `business_name`, `sector`, `business_category`, `business_model`, `franchise_brand`
- Approximate location: `barangay_code`, `barangay_name`, `latitude_approx`, `longitude_approx`, `location_precision`
- Demo operations: `years_operating`, `employee_count_range`, `verification_status_demo`, `currently_hiring`, `open_roles_count`, `roles_hiring`, `typical_pay_php`, `pay_unit`, `skills_sought`, `business_hours`, `branches_in_davao`
- Provenance: `data_origin`

### `jobseekers.csv`

- Identity and approximate location: `person_id`, `full_name`, `age`, `barangay_code`, `barangay_name`, `latitude_approx`, `longitude_approx`, `location_precision`
- Work profile: `employment_status`, `years_experience`, `highest_education`, `certifications`, `skills`, `preferred_roles`, `preferred_sectors`, `preferred_job_types`
- Availability and preferences: `hours_wanted_per_week`, `days_available`, `expected_pay_php`, `expected_pay_unit`, `guardian_consent`, `can_start_within_days`
- Context for richer simulations: `languages`, `commute_mode`, `digital_access`, `profile_summary`
- Provenance: `data_origin`

The runtime adapter is `src/data/simulation.ts`. It converts these CSV rows into the app's demo business, job, and skill-card records while keeping the original records intact. The competitor simulator reads the business sheet and labels all locations as synthetic approximate points. `mockEmployers.ts` and `mockSeekers.ts` remain unchanged.
