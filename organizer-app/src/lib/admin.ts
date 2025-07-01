// Utility function to check if a user is an organizer
export function isOrganizer(email: string | null | undefined): boolean {
    if (!email) return false;

    const adminUsers = process.env.ADMIN_USERS || '';
    const adminEmails = adminUsers.split(',').map(email => email.trim());

    return adminEmails.includes(email);
}
