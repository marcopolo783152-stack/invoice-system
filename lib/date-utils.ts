/**
 * Format a date string or object to MM/DD/YYYY format.
 * Defaults to current date if invalid.
 */
export function formatDateMMDDYYYY(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return '';

    const date = new Date(dateInput);

    // Check for invalid date
    if (isNaN(date.getTime())) return String(dateInput);

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
}
