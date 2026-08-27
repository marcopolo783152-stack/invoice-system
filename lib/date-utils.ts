/**
 * Format a date string or object to MM/DD/YYYY format.
 * Defaults to current date if invalid.
 */
export function formatDateMMDDYYYY(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return '';

    // If it's a standard HTML date string (YYYY-MM-DD), parse it directly to avoid timezone shift
    if (typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateInput.split('-');
        return `${month}/${day}/${year}`;
    }

    const date = new Date(dateInput);

    // Check for invalid date
    if (isNaN(date.getTime())) return String(dateInput);

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
}
